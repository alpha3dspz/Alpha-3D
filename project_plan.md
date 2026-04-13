# Alpha Personalizados — Sistema de Gestão

## 1. Descrição do Projeto
Sistema web de gestão empresarial para empresa de impressão 3D "Alpha Personalizados". Interface estilo dashboard SaaS com tema escuro, identidade visual roxo/magenta com azul. Voltado para controle total de pedidos, custos, precificação e catálogo de produtos.

## 2. Estrutura de Páginas
- `/` — Dashboard principal (SPA com abas)
  - Dashboard Geral
  - Pedidos
  - Custos e Compras
  - Precificação Automática
  - Catálogo de Produtos
  - Relatórios Avançados

## 3. Funcionalidades Principais
- [x] Dashboard com KPIs (faturamento, lucro, ROI, pedidos)
- [x] Gráficos de vendas e lucro vs custo
- [x] Tabela de pedidos editável inline
- [x] Filtros, busca e ordenação de pedidos
- [x] Controle de custos e compras
- [x] Calculadora de precificação automática
- [x] Catálogo de produtos com upload de imagem
- [x] Relatórios avançados por período
- [x] Exportar para Excel
- [x] Salvamento automático (localStorage)
- [x] Mobile friendly

## 4. Modelo de Dados (localStorage)

### Pedidos
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | string | ID automático |
| cliente | string | Nome do cliente |
| produto | string | Nome do produto |
| status | enum | Orçamento/Fechado/Em andamento/Concluído/Retirado |
| pago | boolean | Se foi pago |
| valorVenda | number | Valor de venda R$ |
| custo | number | Custo R$ |
| horasImpressao | number | Horas de impressão |
| lucro | number | Calculado automaticamente |
| data | string | Data do pedido |

### Custos
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | string | ID automático |
| tipo | enum | Filamento/Impressora/Manutenção/Ferramenta/Outros |
| descricao | string | Descrição do custo |
| valor | number | Valor R$ |
| data | string | Data |

### Produtos (Catálogo)
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | string | ID automático |
| nome | string | Nome do produto |
| descricao | string | Descrição |
| preco | number | Preço R$ |
| imagem | string | URL/base64 da imagem |

## 5. Integrações
- Supabase: Não necessário na fase inicial (dados em localStorage)
- Shopify: Não necessário
- Stripe: Não necessário

## 6. Plano de Desenvolvimento

### Fase 1: Layout + Dashboard + Pedidos (ATUAL)
- Meta: Interface principal funcional com as abas mais críticas
- Entregável: Sidebar, Dashboard com KPIs/gráficos, Aba Pedidos completa

### Fase 2: Custos + Precificação + Catálogo
- Meta: Módulos financeiros e catálogo
- Entregável: Abas de Custos, Precificação e Catálogo funcionais

### Fase 3: Relatórios + Exportação + Polimento
- Meta: Relatórios avançados e funcionalidades extras
- Entregável: Relatórios, exportação Excel, animações finais
