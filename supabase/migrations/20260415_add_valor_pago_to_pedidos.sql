alter table if exists public.pedidos
add column if not exists valor_pago numeric(12,2) not null default 0 check (valor_pago >= 0);

update public.pedidos
set valor_pago = case
  when pago then valor_venda
  else 0
end
where valor_pago = 0;

alter table if exists public.pedidos
drop constraint if exists pedidos_valor_pago_max_check;

alter table if exists public.pedidos
add constraint pedidos_valor_pago_max_check
check (valor_pago <= valor_venda);