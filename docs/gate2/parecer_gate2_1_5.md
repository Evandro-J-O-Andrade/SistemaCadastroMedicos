# Parecer Gate 2.1.5 — CRUD administrativo, senha confiável e prontidão Auth (local)

**Projeto:** Gestão Médica Alpha Enterprise  
**Data:** 18/11/2026  
**Escopo:** Gate 2.1.5 (correções locais DBA/AppSec/IAM, QA em PostgreSQL local, sem remoto/provisionamento/ativação/commit-push-deploy/db-push real).

## Parecer: **NO-GO (condicional)** para implantação remota e ativação do Admin Master/Auth Provider Enterprise — **GO condicionado** para avanço local controlado

### O que foi fechado (evidência local)
- **Cadastro People-First transacional e tenant-scoped:** `fn_admin_register_person` cria `people` + `tenant_membership` (+ `unit_membership`) atomicamente, valida tenant/unidade/escopo/permissão/membership do chamador, audita (`people/admin_register`), sem criar Auth user/link e sem auto-ROOT por e-mail. Bloqueios cross-tenant/unidade inválida/sem permissão confirmados; rollback sem órfãos confirmado.
- **RLS/escopo:** helper `fn_has_people_permission_in_any_member_tenant` + policies `people` ajustadas para admins autorizados em tenant-membro; ROOT global e ROOT tenant-scoped preservados (scoped registra no próprio tenant e é bloqueado fora; global permitido). Regressões 2.1.4 (bootstrap fail-closed, isolamento tenant/unidade, auditoria, onboarding/aceites) preservadas em amostragem.
- **Troca de senha (camada DB):** confirmação restrita a `service_role` via `fn_confirm_password_changed_by_auth_user(auth_user_id)` e `fn_mark_password_changed` endurecida; cliente autenticado não pode auto-declarar; atualização de `user_onboarding` e auditoria com evidência (`confirmed_by`, `auth_user_id`).
- **Login remoto diagnosticado:** `invalid_credentials` (HTTP 400) permanece questão de Supabase Auth/provisionamento de `evandro_j.o.a@hotmail.com`, não de RLS/frontend local.

### Bloqueios remanescentes (impedem GO remoto/ativação)
1. **Integração confiável com Supabase Auth (obrigatória):** falta componente servidor/hook/Edge Function comprovado que, **somente após evento real** de password change no Supabase Auth, invoque (service_role) `fn_confirm_password_changed_by_auth_user`/fluxo equivalente. Sem isso, cadeia de onboarding não está fechada em produção.
2. **Provisionamento administrativo seguro:** fluxo via Supabase Auth/Admin API (invite/senha temporária, link `auth.users`→`auth_identity_links`→`people`, auditoria, sem auto-ROOT por e-mail) não implementado/executado. `evandro_j.o.a@hotmail.com` não confirmado/provisionado.
3. **Homologação em stack Supabase real:** ambiente local possui apenas DB (sem PostgREST/GoTrue/JWT real); políticas/grants/comportamento HTTP-independente e correções 70005–70006 devem ser revalidadas em Supabase local completo e depois dry-run remoto autorizado.
4. **Cadastro médico completo:** cadeia `people → tenant/unit memberships → medical_professionals` (CRM/UF, CBO/SIGTAP, especialidades) depende de catálogo legado (`legacy/004_medical_catalog.sql`) não incorporado ao CORE Gate 1/2.1 — escopo parcial (até memberships) concluído.
5. **RLS/UX administrativo:** INSERT direto em `people` por admin tenant-scoped mostrou inconsistência em sessão RLS (RPC é o caminho seguro/transacional); leitura de memberships de terceiros pode exigir permissão/policy adicional para UX. Revisar antes de expor CRUD no frontend.
6. **Segurança operacional:** `SUPABASE_SECRET_KEY` exposta deve ser revogada/rotacionada (ação externa). CLI remoto (`login/link/migration list/db push --dry-run`) pendente.

### Decisão
- **GO local:** continuar correções/integração controlada (hook Auth confiável, catálogo médico/medical_professionals em migration incremental, revalidação stack real, ajustes finos de RLS/visibilidade para CRUD).
- **NO-GO remoto/Admin Master/Auth Provider:** até fechamento dos itens 1–5 com evidência e autorização explícita.

**Artefatos:** `docs/gate2/matriz_testes_gate2_1_5.md`, `supabase/migrations/20261118070006_gate2_07_people_rls_and_registration.sql` (+ 70000–70005), evidências SQL em `gate213_test`.
