-- Adds idempotency-key support to create_pending_order so retries/double
-- submits from the client (e.g. network retry after a timed-out response)
-- return the already-created order instead of creating a duplicate and
-- double-decrementing stock.
--
-- The parameter list changes (a new trailing p_idempotency_key parameter is
-- added), so `create or replace function` would create a second, ambiguous
-- overload rather than replacing the original 10-arg-less signature. The
-- previous version is dropped first so there is exactly one
-- create_pending_order function afterwards.
drop function if exists public.create_pending_order(
  text, jsonb, text, text, text, text, text, uuid, timestamptz, boolean
);

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
  p_clear_cart boolean,
  p_idempotency_key text default null
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
  if p_idempotency_key is not null then
    perform pg_advisory_xact_lock(hashtext(p_idempotency_key));

    select * into v_order from public.orders where idempotency_key = p_idempotency_key;
    if found then
      return v_order;
    end if;
  end if;

  drop table if exists _order_lines;
  create temporary table _order_lines (
    product_id uuid, product_name text, unit_price_cents integer, image text, qty integer
  ) on commit drop;

  for v_item in select * from jsonb_to_recordset(p_items) as x(product_id uuid, qty integer)
    order by x.product_id
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
    amount_cents, currency, status, privacy_consent_at, idempotency_key
  ) values (
    p_order_number, p_user_id, p_customer_name, p_customer_email,
    p_shipping_address, p_shipping_city, p_shipping_postal_code,
    v_amount_cents, 'EUR', 'pending', p_privacy_consent_at, p_idempotency_key
  ) returning * into v_order;

  insert into public.order_items (order_id, product_id, product_name, unit_price_cents, image, qty)
  select v_order.id, product_id, product_name, unit_price_cents, image, qty from _order_lines;

  if p_clear_cart and p_user_id is not null then
    delete from public.cart_items where user_id = p_user_id;
  end if;

  return v_order;
end;
$$;

revoke execute on function public.create_pending_order from public, authenticated, anon;
grant execute on function public.create_pending_order to service_role;
