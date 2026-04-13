create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.produtos (
  id text primary key,
  nome text not null,
  descricao text not null default '',
  preco numeric(12,2) not null default 0 check (preco >= 0),
  imagem text not null default '',
  categoria text not null default 'Outros',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.custos (
  id text primary key,
  tipo text not null check (tipo in ('Filamento', 'Impressora', 'Manutenção', 'Ferramenta', 'Outros')),
  descricao text not null,
  valor numeric(12,2) not null default 0 check (valor >= 0),
  data date not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pedidos (
  id text primary key,
  cliente text not null,
  produto text not null,
  gramas_filamento numeric(10,2) not null default 0 check (gramas_filamento >= 0),
  status text not null check (status in ('Orçamento', 'Fechado', 'Em andamento', 'Concluído', 'Retirado')),
  pago boolean not null default false,
  valor_venda numeric(12,2) not null default 0 check (valor_venda >= 0),
  custo numeric(12,2) not null default 0 check (custo >= 0),
  horas_impressao numeric(10,2) not null default 0 check (horas_impressao >= 0),
  lucro numeric(12,2) generated always as (valor_venda - custo) stored,
  data date not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_produtos_nome on public.produtos (nome);
create index if not exists idx_produtos_categoria on public.produtos (categoria);
create index if not exists idx_custos_tipo on public.custos (tipo);
create index if not exists idx_custos_data on public.custos (data desc);
create index if not exists idx_pedidos_status on public.pedidos (status);
create index if not exists idx_pedidos_data on public.pedidos (data desc);
create index if not exists idx_pedidos_cliente on public.pedidos (cliente);

drop trigger if exists trg_produtos_updated_at on public.produtos;
create trigger trg_produtos_updated_at
before update on public.produtos
for each row
execute function public.set_updated_at();

drop trigger if exists trg_custos_updated_at on public.custos;
create trigger trg_custos_updated_at
before update on public.custos
for each row
execute function public.set_updated_at();

drop trigger if exists trg_pedidos_updated_at on public.pedidos;
create trigger trg_pedidos_updated_at
before update on public.pedidos
for each row
execute function public.set_updated_at();

alter table public.produtos enable row level security;
alter table public.custos enable row level security;
alter table public.pedidos enable row level security;

drop policy if exists "public full access produtos" on public.produtos;
create policy "public full access produtos"
on public.produtos
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "public full access custos" on public.custos;
create policy "public full access custos"
on public.custos
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "public full access pedidos" on public.pedidos;
create policy "public full access pedidos"
on public.pedidos
for all
to anon, authenticated
using (true)
with check (true);