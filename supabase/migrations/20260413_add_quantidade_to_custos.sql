alter table if exists public.custos
add column if not exists quantidade numeric(10,2) not null default 1 check (quantidade > 0);