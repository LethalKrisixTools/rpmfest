alter table public.orders add column idempotency_key text;
alter table public.orders add constraint orders_idempotency_key_unique unique (idempotency_key);
