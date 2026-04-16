alter table if exists public.custos
drop constraint if exists custos_tipo_check;

alter table if exists public.custos
add constraint custos_tipo_check
check (tipo in ('Filamento', 'Impressora', 'Manutenção', 'Ferramenta', 'Acessórios', 'Peças', 'Outros'));