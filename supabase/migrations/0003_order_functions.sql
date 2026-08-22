-- Recomputes prices/stock from `products` (never trusts client-sent amounts),
-- locks the affected product rows, decrements stock immediately (not on
-- payment confirmation, to avoid overselling during the pending window),
-- and creates the order + order_items atomically.
create function public.create_pending_order(
  p_order_number text,
  p_items jsonb, -- [{ "product_id": "uuid", "qty": 2 }, ...]
  p_customer_name text,
  p_customer_email text,
  p_shipping_address text,
  p_shipping_city text,
  p_shipping_postal_code text,
  p_user_id uuid,
  p_privacy_consent_at timestamptz,
  p_clear_cart boolean
)
returns public.orders
language plpgsql
security definer set search_path = public
as $$
declare
  v_item record;
  v_product record;
  v_amount_cents integer := 0;
  v_order public.orders;
begin
  create temporary table _order_lines (
    product_id uuid, product_name text, unit_price_cents integer, image text, qty integer
  ) on commit drop;

  for v_item in select * from jsonb_to_recordset(p_items) as x(product_id uuid, qty integer)
  loop
    if v_item.qty is null or v_item.qty < 1 then
      raise exception 'INVALID_QTY';
    end if;

    select * into v_product from public.products
      where id = v_item.product_id and active = true
      for update;

    if not found then
      raise exception 'PRODUCT_NOT_FOUND';
    end if;

    if v_product.stock is not null and v_product.stock < v_item.qty then
      raise exception 'OUT_OF_STOCK: %', v_product.name;
    end if;

    if v_product.stock is not null then
      update public.products set stock = stock - v_item.qty, updated_at = now()
        where id = v_product.id;
    end if;

    v_amount_cents := v_amount_cents + (v_product.price_cents * v_item.qty);

    insert into _order_lines (product_id, product_name, unit_price_cents, image, qty)
    values (v_product.id, v_product.name, v_product.price_cents, v_product.images[1], v_item.qty);
  end loop;

  if v_amount_cents < 50 then
    raise exception 'AMOUNT_TOO_LOW';
  end if;

  insert into public.orders (
    order_number, user_id, customer_name, customer_email,
    shipping_address, shipping_city, shipping_postal_code,
    amount_cents, currency, status, privacy_consent_at
  ) values (
    p_order_number, p_user_id, p_customer_name, p_customer_email,
    p_shipping_address, p_shipping_city, p_shipping_postal_code,
    v_amount_cents, 'EUR', 'pending', p_privacy_consent_at
  ) returning * into v_order;

  insert into public.order_items (order_id, product_id, product_name, unit_price_cents, image, qty)
  select v_order.id, product_id, product_name, unit_price_cents, image, qty from _order_lines;

  if p_clear_cart and p_user_id is not null then
    delete from public.cart_items where user_id = p_user_id;
  end if;

  return v_order;
end;
$$;

-- Marks a pending order as paid. Idempotent: a second call is a no-op
-- because the WHERE clause only matches orders still in 'pending'.
create function public.mark_order_paid(p_order_id uuid)
returns void
language sql
security definer set search_path = public
as $$
  update public.orders set status = 'paid', paid_at = now()
    where id = p_order_id and status = 'pending';
$$;

-- Transitions a pending order to a terminal failure state and restores the
-- stock that was reserved at order-creation time. Idempotent: the UPDATE's
-- WHERE clause guarantees the stock restoration below only runs once, even
-- if the Mollie webhook fires more than once for the same payment.
create function public.restore_stock_for_order(p_order_id uuid, p_new_status text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_updated_id uuid;
begin
  if p_new_status not in ('failed', 'canceled', 'expired') then
    raise exception 'INVALID_STATUS';
  end if;

  update public.orders set status = p_new_status
    where id = p_order_id and status = 'pending'
    returning id into v_updated_id;

  if v_updated_id is not null then
    update public.products p
      set stock = p.stock + oi.qty, updated_at = now()
      from public.order_items oi
      where oi.order_id = p_order_id and oi.product_id = p.id and p.stock is not null;
  end if;
end;
$$;

-- GDPR erasure: anonymizes personal fields on an order but keeps the
-- accounting-relevant fields (amount, date, order_number) as required by
-- Spanish tax/commercial retention law.
create function public.anonymize_order(p_order_id uuid)
returns void
language sql
security definer set search_path = public
as $$
  update public.orders set
    customer_name = 'Cliente eliminado',
    customer_email = 'eliminado+' || id || '@rpmfest.invalid',
    shipping_address = '—',
    shipping_city = '—',
    shipping_postal_code = '—',
    anonymized_at = now()
  where id = p_order_id and anonymized_at is null;
$$;

-- GDPR erasure for a full account: anonymizes every order placed by the
-- user and the profile itself. The caller is still responsible for deleting
-- the auth.users row via the Supabase Auth admin API.
create function public.anonymize_customer_data(p_user_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_order_id uuid;
begin
  for v_order_id in select id from public.orders where user_id = p_user_id
  loop
    perform public.anonymize_order(v_order_id);
  end loop;

  update public.profiles set
    full_name = 'Cliente eliminado',
    phone = null,
    default_address = null,
    default_city = null,
    default_postal_code = null
  where id = p_user_id;
end;
$$;

revoke execute on function public.create_pending_order from public, authenticated, anon;
revoke execute on function public.mark_order_paid from public, authenticated, anon;
revoke execute on function public.restore_stock_for_order from public, authenticated, anon;
revoke execute on function public.anonymize_order from public, authenticated, anon;
revoke execute on function public.anonymize_customer_data from public, authenticated, anon;
grant execute on function public.create_pending_order to service_role;
grant execute on function public.mark_order_paid to service_role;
grant execute on function public.restore_stock_for_order to service_role;
grant execute on function public.anonymize_order to service_role;
grant execute on function public.anonymize_customer_data to service_role;
