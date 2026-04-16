alter table if exists public.pedidos
add column if not exists quantidade integer not null default 1 check (quantidade > 0);

alter table if exists public.pedidos
add column if not exists itens jsonb not null default '[]'::jsonb;

update public.pedidos
set itens = jsonb_build_array(
  jsonb_build_object(
    'produto', produto,
    'quantidade', quantidade,
    'valorVenda', valor_venda,
    'custo', custo,
    'gramasFilamento', gramas_filamento,
    'horasImpressao', horas_impressao
  )
)
where coalesce(jsonb_array_length(itens), 0) = 0
  and coalesce(nullif(trim(produto), ''), '') <> '';