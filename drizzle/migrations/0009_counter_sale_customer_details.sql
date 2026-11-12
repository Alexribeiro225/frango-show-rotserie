CREATE OR REPLACE FUNCTION public.create_counter_sale(p_payment_method text, p_items jsonb, p_customer_name text, p_customer_phone text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_items jsonb; v_subtotal numeric(10,2); v_count integer; v_order_id bigint;
begin
  if not public.has_active_saas_subscription() then raise exception 'Assinatura inativa. Regularize o pagamento para registrar vendas.'; end if;
  if p_payment_method not in ('PIX','Cartão','Dinheiro') then raise exception 'Forma de pagamento inválida.'; end if;
  if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items) not between 1 and 50 then raise exception 'Adicione produtos à venda.'; end if;
  if exists(select 1 from jsonb_array_elements(p_items) e where coalesce((e->>'quantity')::integer,0) not between 1 and 99 or coalesce((e->>'product_id')::bigint,0)<=0) then raise exception 'Quantidade de produto inválida.'; end if;
  select count(*) into v_count from jsonb_array_elements(p_items);
  if (select count(distinct (e->>'product_id')::bigint) from jsonb_array_elements(p_items) e)<>v_count then raise exception 'Há produtos repetidos na venda.'; end if;
  if char_length(coalesce(p_customer_name,'')) > 120 or char_length(coalesce(p_customer_phone,'')) > 30 then raise exception 'Nome ou telefone do cliente muito longo.'; end if;
  perform public.consume_combo_inventory(p_items);
  select jsonb_agg(jsonb_build_object(
    'product_id',p.id,'name',p.name,'category',p.category,'description',p.description,
    'quantity',(i->>'quantity')::integer,'unit_price',p.price,
    'line_total',p.price*(i->>'quantity')::integer,
    'components',case when p.category='Combos' then coalesce(
      (select jsonb_agg(jsonb_build_object('product_id',component.id,'name',component.name,'quantity',cc.quantity_per_combo) order by component.name)
       from public.combo_components cc join public.products component on component.id=cc.component_product_id
       where cc.combo_product_id=p.id),'[]'::jsonb) else '[]'::jsonb end
  ) order by p.sort_order,p.id),sum(p.price*(i->>'quantity')::integer)
  into v_items,v_subtotal from jsonb_array_elements(p_items) i join public.products p on p.id=(i->>'product_id')::bigint and p.is_active;
  if coalesce(jsonb_array_length(v_items),0)<>v_count then raise exception 'Produto indisponível.'; end if;
  insert into public.orders(customer_name,customer_phone,fulfillment,address,payment_method,notes,items,subtotal,delivery_fee,total,status)
  values(coalesce(nullif(btrim(p_customer_name),''),'Venda no balcão'),coalesce(btrim(p_customer_phone),''),'counter','{}'::jsonb,p_payment_method,'Venda presencial no balcão',v_items,v_subtotal,0,v_subtotal,'new')
  returning id into v_order_id;
  return jsonb_build_object('id',v_order_id,'order_number',v_order_id,'items',v_items,'subtotal',v_subtotal,'total',v_subtotal,'payment_method',p_payment_method);
end;
$function$;