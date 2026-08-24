-- Atomically increments (or creates) a customer's cart_items row for one
-- product. Used by the client so that concurrent "add to cart" clicks (a
-- double-click, or two open tabs) can never race and silently drop an
-- increment the way a client-side read-then-write would.
create function public.increment_cart_item(
  p_product_id uuid,
  p_qty integer
)
returns public.cart_items
language plpgsql
security definer set search_path = public
as $$
declare
  v_row public.cart_items;
begin
  if p_qty is null or p_qty <= 0 then
    raise exception 'INVALID_QTY';
  end if;

  insert into public.cart_items (user_id, product_id, qty)
  values (auth.uid(), p_product_id, p_qty)
  on conflict (user_id, product_id)
  do update set qty = public.cart_items.qty + excluded.qty
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.increment_cart_item(uuid, integer) from public, anon;
grant execute on function public.increment_cart_item(uuid, integer) to authenticated;
