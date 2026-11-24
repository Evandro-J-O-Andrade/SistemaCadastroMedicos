# Parecer Gate 2.1.4 — Fechamento de lacunas (local)

**Projeto:** Gestão Médica Alpha Enterprise  
**Data:** 18/11/2026  
**Escopo:** Gate 2.1.4 (correções locais, QA/AppSec, sem implantação remota, sem ativação de Auth Provider, sem provisionamento ROOT, sem commit/push/deploy).

## Parecer: **NO-GO (condicional)** para implantação remota/ativação produtiva do Auth Provider — **GO condicionado** para continuidade local controlada

### Evidências favoráveis
- Gate 1 preservado; migrations incrementais `20261118070000`–`20261118070005` aplicáveis localmente (reseed/validação em `gate213_test`).
- Correções aplicadas: volatilidade (`fn_onboarding_status`, `fn_auth_bootstrap_v2`), grants mínimos `authenticated` com RLS como enforcement, revogação sensível de `anon`, coerência ROOT global vs tenant-scoped (`fn_is_root` global-only, sem bypass global para scoped root; bootstrap coerente), endurecimento de confirmação de senha (service_role-only, não auto-declarável), auditoria sem escrita direta por cliente.
- Fail-closed/authz: identidade inválida/inativa/sem role/revogada/sem auth → negado; anti-impersonação, membership/tenant/unit guards, negação cross-tenant (tenants/units) e escalação direta negadas.
- Onboarding/legal: aceite versionado com evidência+audit, bloqueios de pré-requisitos, confirmação de senha via caminho confiável (DB/service_role) e conclusão de welcome funcionando no fluxo controlado.
- Login `invalid_credentials` (HTTP 400, `src/hooks/useAuth.ts:110`) corretamente identificado como rejeição Auth (credencial/usuário/método) — não frontend/RLS.

### Bloqueios / achados que impedem GO remoto
1. **RLS intra-tenant `people` (corrigido localmente, validar em stack real):** achado inicial (visibilidade 1 por RLS aninhada em `tenant_memberships`) tratado com `fn_persons_share_active_tenant` (SECURITY DEFINER, `70005`) e policies `people/auth_identity_links` por co-membership; reteste local OK (userA vê 4 co-membros do tenant A, não vê tenant B; userB isolado). Revalidar em PostgREST/JWT Supabase real.
2. **Integração confiável de troca de senha com Supabase Auth:** `fn_mark_password_changed` está DB-restrita (correto), mas **não há** componente servidor/hook/edge function comprovado acionando a transição somente após evento real de `password changed` no Supabase Auth. Frontend não é evidência.
3. **Homologação em stack Supabase real:** testes usaram stubs `auth.uid/role` e GUC; faltam provas via PostgREST/JWT real, grants/roles Supabase (`anon/authenticated/service_role`) e comportamento HTTP-independente em requisições reais.
4. **Provisionamento/identidade ROOT real:** `evandro_j.o.a@hotmail.com` não confirmado/provisionado/vinculado; `invalid_credentials` exige verificação administrativa em Auth Users e fluxo seguro (sem autoatribuição por e-mail, sem senha fixa/código).
5. **Segredo exposto:** `SUPABASE_SECRET_KEY` deve ser revogada/rotacionada (ação externa).
6. **CLI remoto:** `login/link/migration list/db push --dry-run` pendentes de sessão autenticada do owner.

### Recomendações imediatas
- Revalidar correção `people_read`/co-membership (`70005`) em stack Supabase real (PostgREST/JWT), incluindo grants/roles efetivos.
- Definir/implementar hook server-side confiável para `password_changed` → `fn_mark_password_changed(person_id)` (service_role) com evidência auditável.
- Executar matriz completa em Supabase local/stack compatível e coletar evidências PostgREST; depois dry-run remoto autorizado.
- Manter Gate 2 ZIP/frontend em preparação (sem ativar Auth Provider/Dispatcher) e preservar módulos médicos/plantão 12×36/relatórios.

**GO remoto/ativação:** **NEGADO** até fechamento dos itens 1–4 com evidência independente.
