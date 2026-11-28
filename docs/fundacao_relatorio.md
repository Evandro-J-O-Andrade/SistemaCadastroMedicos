# Relatório Técnico — Fundação Enterprise (F0–F5) + Correções P0/P1

Data: 28/11/2026 · Branch: `main` (sem branches novas) · Build + tsc verificados.
Escopo: fundação reutilizável UI/UX + camada de dados. **Não** inclui reconstrução célula a célula (Fase 3).

## 1. Correções da jornada de entrada (P0/P1 da auditoria)
| Prioridade | Arquivo | Correção |
|---|---|---|
| P0 | `core/context/useContextEntry.ts` | `enter()` agora retorna `boolean` e captura falhas em `setError` (sem rejeição não tratada); sucesso só após bootstrap + contexto aplicados |
| P0 | `pages/BemVindo.tsx` | Navega para `/inicio` SOMENTE se `enter()` retornar `true` |
| P0 | `pages/EscolhaConta.tsx` | Idem: navega só após sucesso confirmado |
| P1 | `pages/EscolhaConta.tsx` | Unidade inicial coerente (1ª unidade do 1º contexto) + **nomes reais** via `tenantService.listarUnidades` (RLS) |
| P1 | `core/context/contextResolver.ts` | Removido fallback fictício baseado só em `tenant_id` (retorna `none` honesto) |
| P1 | `core/shell/SidebarNavEnterprise.tsx` | Navegação **Database-Driven** de `ui_navigation_items` (banco/RLS) + estados loading/empty/error |
| P1 | `pages/BemVindo.tsx` | Cards de módulos derivados de `ui_navigation_items` (catálogo/ordem/permissão do banco) |
| P1 | `services/navigationService.ts` + `core/shell/useNavigation.ts` + `navIcons.ts` | Serviço/hook de navegação + ícones por nome do banco; filtro por permissão efetiva |

## 2. Fundação entregue
- **F1 — Primitivos** (`core/design/`): `overlay` (Modal/Drawer/Tooltip/Popover com focus trap/ESC/ARIA), `navigation` (Tabs/Accordion), `feedback` (Toast/Skeleton/Progress), `data` (DataTable/Pagination).
- **F2 — Formulários** (`core/design/form.tsx`): RHF 7.92.0 + Zod 4.6.7 + @hookform/resolvers 7.0.9 (fixados). `useZodForm`, `FormField`, `SelectField`, `DateField`, `AutocompleteField` (combobox acessível, `loadOptions` real), `FormSection`, `FormStepper` (wizard com validação por passo).
- **F3 — Gráficos** (`core/design/charts.tsx`): Recharts; `ChartCard` (loading/empty), `TrendChart` (linha/área), `BarsChart` (barras/empilhadas), `DonutChart`; paleta por tema; drill-down `onSliceClick`.
- **F4 — Motion** (`core/design/motion.tsx`): `PageTransition` (keyed por rota no AppShell), `Reveal`, `HoverLift`; tudo `prefers-reduced-motion`.
- **F5 — Dados** (`core/data/`): `useQuery` (cache em memória + TTL + `invalidateQueries`/`clearCache` + refetch), `useRealtimeInvalidate` (Supabase postgres_changes, refetch controlado). `ContextProvider` limpa o cache na troca de contexto (isolamento tenant/unidade).

## 3. Evidências
- Commits em `main`: `c50a12a` (P0/P1 + F1), `4579454` (F2), `7caebba` (F3), `f961846` (F4), `96607ed` (F5), `4a0831c` (fix generics Zod 4).
- `vite build`: **✓ built** (verde) em todas as fatias.
- `tsc --noEmit`: **sem erros** nos arquivos da fundação/alterados. Erros restantes são **pré-existentes** e restritos a legados: `api/especialidades.ts`, `hooks/useTTS.ts`, `pages/{CadastroEmLote,CadastroUsuarios,Filtros,GestaoDocumentosLegais,GestaoTenants,Home,Plantao,Relatorios}`.
- Sem mocks, sem `localStorage`/`sessionStorage` nos componentes novos; validade imposta por RLS.

## 4. Pendências (não impeditivas para a fundação)
1. **Auth sem armazenamento local (F6)** — `lib/supabase.ts` mantém `persistSession:true`. Migração para cookies exige `@supabase/ssr` (já instalado) + topologia de servidor (BFF/Edge). **Requer decisão de topologia.**
2. **Navegação Database-Driven vazia até aplicar o seed** — `ui_navigation_items` só é populado por `20261128090200_ui_seed_navigation.sql` (não aplicado remotamente). Enquanto não aplicado, sidebar/cards exibem estado vazio honesto. Aplicação remota depende de autorização.
3. **Legados `.jsx` com `localStorage`** (Plantao/Relatorios/Cadastro*/*) — escopo da Fase 3 (rebuild com persistência real).
4. **Homologação visual** — requer inspeção renderizada (desktop/mobile), contraste, animações; código não substitui inspeção.

## 5. Critério de aprovação
Vale o `docs/homologacao_checklist.md` (10 itens por célula). Nenhuma célula foi declarada homologada; a fundação é base reutilizável, não produto final.