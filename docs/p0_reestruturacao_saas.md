# P0 — Reestruturação SaaS (Navegação e Contexto)

Base: branch `main`. Sem migrations/DB. Sem alterar auth/RBAC/RLS/aceites.

## 1. Auditoria (causas)
- **Sidebar vazia:** `App.tsx` renderizava `<EnterpriseShell>` sem `sidebarContent`.
- **Welcome sem seletor:** `Welcome.tsx` só tinha 3 cards informativos; não escolhia contexto.
- **Dispatcher por papel:** `dispatcherService.ts` resolve destino por papel e usa a 1ª membership (`tenantPrimario`), inadequado para multiunidade.
- **Sem contexto ativo:** não havia camada de contexto (tenant/unidade) validada.

## 2. Implementado no P0
- `core/context/contextResolver.ts` — resolve contextos autorizados (ROOT global + memberships), validação `isContextAllowed` (não concede permissão), `defaultContext` (não auto-seleciona múltiplos).
- `core/context/ContextProvider.tsx` — contexto ativo persistido (localStorage), reconciliado contra o bootstrap; falha nega acesso.
- `core/shell/SidebarNav.tsx` — sidebar dinâmica por papel/permissão + seletor de contexto.
- `pages/Welcome.tsx` — Central de Contextos: seleção real; conclui `fn_complete_welcome`, revalida bootstrap, aplica contexto e usa `resolverDestino`.
- `App.tsx` — `sidebarContent={<SidebarNav/>}`.
- `main.tsx` — `ContextProvider` envolvendo a app.

### Welcome recorrente x onboarding (separação de flags)
- `welcome_pending` (servidor) = obrigação de onboarding inicial (não reutilizada para o Welcome recorrente).
- `context_selection_pending` (sessão, em memo) = seleção de contexto por login. Definida **somente** no evento `SIGNED_IN`; **não** em `INITIAL_SESSION` (refresh) nem `TOKEN_REFRESHED`.
- Fluxo: onboarding (senha→LGPD→welcome_pending) e, em login novo, Central de Contextos; após escolher, `completeContextSelection()` zera a flag e libera o workspace. Refresh mantém o contexto persistido e não reabre o Welcome.

## 3. Segurança ( UX, RLS é a fonte de verdade )
- Escolher contexto **nunca** concede permissão: `isContextAllowed` revalida contra memberships/ROOT global.
- ROOT global → Central Admin Master; multiunidade → exige seleção; 1 contexto → pré-seleção.
- Rotas reais protegidas por `ProtectedRoute` (papel/permissão) + RLS no banco.
- Dados administrativos x assistenciais sensíveis permanecem sob RLS.

### Casos de teste (manuais)
1. ROOT global sem tenant → vê "Central Admin Master (Global)" e vai a `/dashboard/admin-master`.
2. Usuário com 2 memberships → precisa escolher; destino respeita papel.
3. Contexto não autorizado (forjado no storage) → `isContextAllowed` false → pré-seleção/falha.
4. Usuário sem papel/contexto → "Nenhum contexto autorizado".
5. Sidebar não exibe itens sem papel/permissão.
6. Troca de contexto não altera permissões (apenas escopo).

## 4. Auditoria dos módulos existentes (matriz)
| Módulo | Preservar | Corrigir | Substituir |
|---|---|---|---|
| `Medicos.tsx` | Regras de domínio | CRM validado no servidor (não só estado local) | Formulário/consulta legada |
| `CadastroEmLote.tsx` | Importação em lote | Associação por índice (risco de vínculo errado) | Pipeline transacional/ staging |
| `Relatorios.tsx` | Filtros/gráficos | Acoplamento查询+UI | Central de Inteligência (P4) |
| `Plantao.tsx` | Regra 12×36 | — | Apresentação (P1) |

## 5. Plano progressivo
- **P1 — Design System Enterprise:** componentes reutilizáveis, responsivo, dark/light, estados.
- **P2 — CRUDs e governança:** pessoas, médicos, funcionários, pacientes, usuários, unidades, vínculos, permissões, auditoria.
- **P3 — Catálogos e importação:** CBO (catálogo oficial versionado), especialidades, SIGTAP, XML (localizar fonte real; não inventar seed), importação idempotente com staging/prévia.
- **P4 — Produção e relatórios:** plantões 12×36, produção, dashboards, relatórios dinâmicos, exportações.

## 6. Pendências / limites
- Sem runner de testes automatizados no repo (documentados casos manuais).
- `dispatcherService` ainda usa 1ª membership para `tenantPrimario`; evoluir para contexto ativo no P1.
- XML/seed de médicos: aguardando arquivo-fonte real.
- Nenhuma migration/seed/publicação executada.