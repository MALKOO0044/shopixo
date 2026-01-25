-- RPC: decrement_stock
-- Decrements the stock for a given product by a quantity (never below zero)
create or replace function decrement_stock(product_id_in bigint, quantity_in integer)
returns void
language plpgsql
security definer
as $$
begin
  update products
    set stock = greatest(0, stock - quantity_in)
  where id = product_id_in;
end;
$$;
