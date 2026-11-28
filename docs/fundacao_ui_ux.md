# Fundação UI/UX Enterprise — Plano (Fase 2.5)

Data: 28/11/2026 · Pré-requisito para reconstruir cada célula com qualidade verificável.
**Meta:** nova Gestão Médica Enterprise sobre o CORE, UX premium de ponta a ponta, dados reais.
Não é modernizar o legado; é construir o produto novo reaproveitando só regra de negócio compatível.

## Princípios
- Database-Driven: metadados/navegação/formulários vêm do banco; frontend renderiza componentes homologados.
- Sem mock, sem `localStorage`/`sessionStorage`, sem fallback fictício, sem sucesso falso.
- Acessibilidade e `prefers-reduced-motion` em tudo; ícones Lucide; sem emojis decorativos.
- Cada peça nasce com estados (loading/empty/error/success) e tipagem.

## Sequência da fundação (cada fatia é revisável e build-verde)
- **F0 — Tokens & tema** (concluído na Fase 2): Navy/Azul/Teal/Cinza, dark/light por variáveis CSS.
- **F1 — Primitivos de UI**: Modal, Drawer, Popover, Tooltip, Tabs, Accordion, Toast, Skeleton, Progress, DataTable (ordenar/filtrar/paginar/seleção), Pagination. *(esta leva)*
- **F2 — Formulários**: base RHF+Zod (a instalar) ou equivalente; inputs/select/checkbox/switch com validação acessível; submit com persistência real e feedback.
- **F3 — Gráficos**: wrappers Recharts (linha/barra/área/donut) com dados reais, skeleton e estado vazio; drill-down.
- **F4 — Motion**: transições de entrada/saída, hover, microinterações via framer-motion, respeitando reduced-motion.
- **F5 — Camada de dados**: padrão de query/serviço com cache em memória + invalidação; hooks de realtime controlado (Supabase) onde houver necessidade operacional.
- **F6 — Auth em cookies**: migrar `persistSession` para `@supabase/ssr` (já instalado) — camada de servidor; tarefa separada e sensível.

## Contratos de dados (a respeitar em toda célula)
- Identidade/permissões: `fn_auth_bootstrap_v2` (Auth + CORE People-First).
- Contexto: memberships reais; validade imposta por RLS.
- Catálogo médico, produção/staging, navegação: migrations `090000/090100/090200` (não aplicadas remotamente; dependem de autorização).

## Fora de escopo desta fundação
- Aplicar migrations/seeds remotos (depende do usuário).
- Reconstrução célula a célula (Fase 3, após fundação homologada).
- Dados de produção/CSV, `.github/`, `docs/` de terceiros.

## Decisões abertas
- Formulários: instalar `react-hook-form` + `zod` (padrão citado) vs. equivalente próprio.
- Auth cookies: `@supabase/ssr` requer servidor/BFF — definir topologia (Vercel/Edge/Express) antes de migrar.