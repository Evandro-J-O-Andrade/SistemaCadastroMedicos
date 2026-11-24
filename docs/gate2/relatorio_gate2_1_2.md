# Relatório Gate 2.1.2 — Correções P0 (local, estático)

**Data:** 18/11/2026  
**Base:** Gate 1 (`20261116080000`–`20261116080006`) + revisões incrementais Gate 2.1/2.1.1.  
**Estado:** correções aplicadas no código SQL das migrations Gate 2; **não executadas em banco** (Docker daemon indisponível) e **não aplicadas em remoto**.

## Arquivos alterados/criados
- `supabase/migrations/20261118070000_gate2_01_security_hardening.sql` — **substituído** (revisão P0)
- `supabase/migrations/20261118070001_gate2_02_onboarding_legal.sql` — **substituído** (revisão P0)
- `supabase/migrations/20261118070002_gate2_03_auth_bootstrap.sql` — **substituído** (contrato ROOT/permissions)
- `supabase/migrations/20261118070003_gate2_04_rls_stateless_root.sql` — **novo** (ajustes RLS stateless + ROOT global)
- Rascunhos anteriores preservados em `supabase/migrations/gate2/_draft_20261118070000-002*.bak`

## Correções endereçadas

| Achado P0/P1 | Correção implementada |
|---|---|
| **P0 Troca de senha auto-declarável** | `fn_mark_password_changed(p_person_id)` exige `request.jwt.role = 'service_role'` e não é executável por `authenticated` (EXECUTE apenas `service_role`). Remove auto-declaração pelo frontend. |
| **P0 Contexto transacional entre requests** | Introduzido modelo **stateless por requisição**: `fn_resolve_person_id()`/`fn_current_person_id()` derivam de `auth.uid()`; `fn_current_tenant_id/unit_id` retornam NULL; `fn_set_session_contexto` mantém apenas `set_config` best-effort na transação e documenta que autorização entre HTTP não depende de GUC. RLS complementada em `70003` para membership/auth.uid(). |
| **P0 Impersonação / identidade ausente** | `fn_person_has_permission` nega quando `fn_resolve_person_id()` é NULL e restringe consulta à própria pessoa autenticada (`p_person_id = v_auth_person`). |
| **P0 ROOT global** | `fn_is_root`/checks consideram assignment `tenant_id NULL`; bootstrap expande `permissions` para ROOT com todas permissões ativas (contrato UI); RLS 70003 concede acesso legítimo global ao ROOT sem exigir membership. |
| **P1 `fn_audit_log` autoatribuível pelo cliente** | `fn_audit_log` revogada de `authenticated` e concedida apenas a `service_role` (eventos explícitos por fluxos confiáveis; triggers continuam via definer). |
| **P1 Contrato `permissions[]` ROOT** | `fn_auth_bootstrap_v2` retorna todas `permissions.ativo=true` quando `root` em roles. |

## Limitações conhecidas (requerem validação em banco)
- **Evidência de troca de senha no Supabase Auth:** a função agora exige `service_role`, mas o mecanismo confiável de confirmação (hook/webhook/backend administrativo que observe evento real de password update no Auth e chame `fn_mark_password_changed`) **ainda não está implementado no ambiente** — necessário para fluxo produtivo.
- **Políticas 007 originais:** permanecem aplicadas antes de 70003; 70003 substitui as principais policies para reduzir dependência de GUC. Necessário teste completo de regressão/isolation (especialmente leitura de memberships/roles em cenários multi-tenant) para confirmar que não houve abertura indevida nem bloqueio legítimo.
- **`FORCE ROW LEVEL SECURITY`** adicionado em `audit_events`, `legal_acceptances`, `user_onboarding`; pode impactar operações administrativas diretas — validar com `service_role`/definer.
- **Execução real:** nenhuma migration aplicada; sem evidência de `supabase start`/`supabase db reset` seguro; sem suíte automatizada executada.

## Ambiente (bloqueio)
- Docker daemon indisponível: `//./pipe/dockerDesktopLinuxEngine` não encontrado.
- `supabase start/status` falharam; sem instância local em `54322`.

## Próximo passo obrigatório para homologação
1. Iniciar Docker Desktop (engine Linux funcional) e confirmar `docker info`.
2. Em banco local **descartável**: `supabase start` → aplicar 7 (Gate 1) + 4 (Gate 2.1.2) migrations em instância limpa.
3. Executar 14 cenários QA/AppSec + testes específicos (HTTP independente, senha server-side, impersonação, escalada, ROOT sem tenant, revogação em sessão, auditoria/falsificação) com evidências.
4. Ajustar incrementalmente conforme achados e emitir GO/NO-GO independente.
