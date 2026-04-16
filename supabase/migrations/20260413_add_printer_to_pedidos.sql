alter table if exists public.pedidos
add column if not exists impressora text not null default '';

create index if not exists idx_pedidos_impressora on public.pedidos (impressora);