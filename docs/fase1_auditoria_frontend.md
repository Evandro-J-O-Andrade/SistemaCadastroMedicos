# Fase 1 — Auditoria do Frontend (Gestão Médica Alpha Enterprise)

Data: 28/11/2026 · Tipo: auditoria estática (sem alteração de código, sem banco remoto).
Objetivo: inventariar rotas/componentes/hooks/estilos/formulários/dependências e classificar
**regra de negócio preservável** × **reconstrução Enterprise Premium**.

## 1. Fundação já no padrão Enterprise (preservar)
- Shell: `core/shell/EnterpriseShell.tsx`, `SidebarNav.tsx` (recolhível, dark/light, logout real).
- Contexto: `core/context/ContextProvider.tsx`, `contextResolver.ts` (resolve contextos autorizados; não concede acesso).
- Auth: `auth/context/AuthContextProvider`, `auth/services/{authService,dispatcherService,tenantService,legalDocumentService}`, `hooks/useSignOut`.
- Database-Driven: `core/ui/{ComponentRegistry,DatabaseUIRenderer}`, `core/cells/{types,CellRegistry,builtInCells}`.
- Tokens: `components/ui/designTokens.ts` + `components/ui/base.tsx`.
- Inteligência: `modules/intelligence/analyticsService.ts` (KPIs reais, degrada "—").
- Páginas já Enterprise: `Inicio.tsx`, `DashboardAdminMaster.tsx`, `GestaoTenants.tsx`, `GestaoDocumentosLegais.tsx`.

## 2. Legado puro (rebuild de UI; mover regras para serviços/células)
| Página | Linhas | Regra preservável | Rebuild | Dados | Papel |
|---|---|---|---|---|---|
| Medicos | ~433 | Dedup CRM, normalização NFD, exclusão lógica, create 2-passos | UI/CSS; persistir especialidade/observação | Parcial | RLS (root/admin/suporte) |
| Plantao | ~784 | **12×36 (07-19/19-07), turno→data_ref, validarConflito<12h, auditoria revisão, ciclo batch** | UI/CSS; `tenant_id:''` hardcoded | Sim | RLS |
| Relatorios | ~816 | Filtro turno 19-07, agrupamento, consolidações, export PDF/Excel | UI/CSS/gráficos ad-hoc | Sim | RLS |
| CadastroUsuarios | ~234 | Validação senha, RPCs update/desativar | Persistir role no signUp | Parcial | root/admin |
| CadastroEmLote | ~141 | Parser CSV, create em lote | Persistir especialidade/observação | Parcial | RLS |
| Filtros | ~955 | Filtro data/hora, fuzzy, agrupamento, presets | UI/CSS/gráficos ad-hoc | Sim | RLS |

## 3. Catálogo estático (mock) a migrar para o banco
- `api/especialidades.ts` (~296): 76 especialidades hardcoded + sinônimos. Única fonte mock real.
  Migrar para tabela `specialties` (já prevista nas migrations do Gate 2). Desacoplar de `react-icons/fa`.

## 4. Contratos / RBAC / dados
- Células: `core/cells/*` (7 células: dashboard, admin-master, medicos, plantoes, producao, usuarios, relatorios) — preservar.
- `SidebarNav.canSee` combina roles + permissões (coringas) — preservar lógica; NAV pode migrar p/ CellRegistry.
- `ComponentRegistry`/`DatabaseUIRenderer`: infra pronta; widgets gráficos são placeholder textual (não Chart.js real).

### RPCs Supabase usadas no frontend
`fn_auth_bootstrap_v2`, `fn_encerrar_batch`, `fn_atualizar_pessoa`, `fn_desativar_usuario`,
`fn_accept_legal_document`, `fn_onboarding_status`, `supabase.auth.signUp`.

### Tabelas referenciadas
`medical_professionals, people, medical_professional_specialties, medical_professional_units,
specialties, production_entries, production_revisions, collection_shifts, collection_batches,
unit_memberships, role_assignments, roles, tenants, units, tenant_memberships,
legal_documents, legal_acceptances`.

### Hooks/serviços
`useAuth, useTTS, useActiveContext, useTheme, useIsDark, useSignOut`;
`tenantService, legalDocumentService, dispatcherService, analyticsService, authService`;
evento global `window 'dadosAtualizados'`.

## 5. Placeholders a corrigir no rebuild (não são dados reais)
- `tenant_id:''` hardcoded (Plantao) — preenchido por RLS/JWT.
- `plantoesRealizados:0` fixo (analyticsService).
- Campos não persistidos: especialidade/observação (Medicos, CadastroEmLote); role (CadastroUsuarios signUp).
- `DashboardAdminMaster`: todos os módulos `disponivel:false` (backend pendente).
- Gráficos do DatabaseUIRenderer: placeholder textual.

## 6. Dependências relevantes (package.json)
React 19, react-router-dom 7, @supabase/supabase-js, chart.js + react-chartjs-2 + recharts,
framer-motion, lucide-react, react-icons, tailwind 3, jspdf(+autotable), xlsx, dayjs/moment.
> framer-motion disponível para animações P1 (respeitar `prefers-reduced-motion`).

## 7. Decisões herdadas
- Tokens atuais (`primary #021e3a`, `accent #2563eb`) NÃO batem com a paleta Enterprise
  (Navy #101D32, Azul #245A81, Teal #0E8D85, Cinza #E8EEF3). Design System nasce novo na Fase 2.
- Welcome (recepção) ≠ SelecaoContexto (operação): separar em duas páginas.
- Legado é referência de regra de negócio; não determina a arquitetura visual nova.