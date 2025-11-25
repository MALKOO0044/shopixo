-- Atomic product import RPC function
-- Performs product, variants, log, and queue updates in a single transaction

create or replace function public.import_cj_product(
  p_title text,
  p_slug text,
  p_description text,
  p_price numeric,
  p_images text[],
  p_category text,
  p_stock integer,
  p_variants jsonb,
  p_cj_product_id text,
  p_shipping_from text,
  p_delivery_time_hours integer,
  p_product_variants jsonb default '[]'::jsonb,
  p_batch_id uuid default null,
  p_queue_item_id integer default null,
  p_import_details jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product_id bigint;
  v_variant record;
  v_variants_created integer := 0;
begin
  -- Check for existing product with same CJ ID
  select id into v_product_id
  from products
  where cj_product_id = p_cj_product_id;
  
  if v_product_id is not null then
    -- Product already exists - log as skipped with distinct status
    if p_batch_id is not null and p_queue_item_id is not null then
      insert into import_logs (batch_id, queue_item_id, cj_product_id, product_id, action, status, details)
      values (p_batch_id, p_queue_item_id, p_cj_product_id, v_product_id, 'import', 'skipped', 
              jsonb_build_object('reason', 'duplicate', 'existingProductId', v_product_id));
      
      -- Use 'skipped' status to differentiate from actually imported products
      update product_queue set status = 'skipped' where id = p_queue_item_id;
    end if;
    
    return jsonb_build_object(
      'success', false,
      'skipped', true,
      'productId', v_product_id,
      'message', 'Product already exists - skipped'
    );
  end if;
  
  -- Insert the product
  insert into products (
    title, slug, description, price, images, category, rating, stock, variants,
    is_active, cj_product_id, shipping_from, free_shipping, processing_time_hours, delivery_time_hours
  )
  values (
    p_title, p_slug, p_description, p_price, p_images, p_category, 4.5, p_stock, p_variants,
    true, p_cj_product_id, p_shipping_from, true, 24, p_delivery_time_hours
  )
  returning id into v_product_id;
  
  -- Insert product variants if provided
  if jsonb_array_length(p_product_variants) > 0 then
    for v_variant in select * from jsonb_to_recordset(p_product_variants) as x(
      option_name text,
      option_value text,
      cj_sku text,
      cj_variant_id text,
      price numeric,
      stock integer
    )
    loop
      insert into product_variants (product_id, option_name, option_value, cj_sku, cj_variant_id, price, stock)
      values (v_product_id, v_variant.option_name, v_variant.option_value, 
              v_variant.cj_sku, v_variant.cj_variant_id, v_variant.price, v_variant.stock);
      v_variants_created := v_variants_created + 1;
    end loop;
  end if;
  
  -- Log the successful import
  if p_batch_id is not null and p_queue_item_id is not null then
    insert into import_logs (batch_id, queue_item_id, cj_product_id, product_id, action, status, details)
    values (p_batch_id, p_queue_item_id, p_cj_product_id, v_product_id, 'import', 'success',
            p_import_details || jsonb_build_object('variantsCreated', v_variants_created));
    
    -- Update queue status
    update product_queue set status = 'imported' where id = p_queue_item_id;
  end if;
  
  return jsonb_build_object(
    'success', true,
    'skipped', false,
    'productId', v_product_id,
    'variantsCreated', v_variants_created
  );
  
end;
$$;

comment on function public.import_cj_product is 'Atomically imports a CJ product with variants, logging, and queue updates';
