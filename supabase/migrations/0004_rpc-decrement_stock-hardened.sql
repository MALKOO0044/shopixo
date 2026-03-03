-- Harden decrement_stock RPC: ensure PUBLIC schema search_path and ignore non-positive quantities
create or replace function public.decrement_stock(product_id_in bigint, quantity_in integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Ignore non-positive quantities
  if quantity_in is null or quantity_in <= 0 then
    return;
  end if;

  update products
    set stock = greatest(0, stock - quantity_in)
  where id = product_id_in;
end;
$$;
