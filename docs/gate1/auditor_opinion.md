# GATE 1 — Auditor Independente: Parecer de Homologação

**Projeto:** SistemaCadastroMedicos\
**Auditor:** Independente (revisão de código, arquitetura e segurança)\
**Data:** Gate 1 — CORE Reconstruction\
**Status:** Pendente de aplicação no Supabase (aguardando autorização)

---

## 1. Resumo Executivo

O Gate 1 propõe uma reconstrução CORE do SistemaCadastroMedicos com foco em People-First, multi-tenant, multiunidade, RBAC/RLS e Database-Driven UI/UX. A arquitetura está alinhada com boas práticas de segurança (fail-closed, isolamento por RLS, auditoria obrigatória, separação entre auth.users e identidade canônica).

**Parecer:** APROVADO COM RESSALVAS — sujeito à correção de itens P0 antes de aplicação no Supabase de produção.

---

## 2. Avaliação por Domínio

### 2.1 Arquiteto Master — Arquitetura CORE

| Item | Status | Observação |
|------|--------|------------|
| Separação people ↔ auth.users | OK | Identidade canônica independente de sessão |
| Contrato auth_identity_links 1:1 | OK | Garante rastreabilidade |
| Multi-tenant + multiunidade | OK | Tenants e unidades com isolamento físico |
| tenant_settings para UI-driven | OK | Chave-valor JSONB para tema, idioma, módulos |

**Ressalva:** Nenhuma crítica. Arquitetura sólida.

### 2.2 DBA PostgreSQL — Migrations (001-007)

| Item | Status | Observação |
|------|--------|------------|
| Extensões (pgcrypto) | OK | Suporte a UUID e criptografia |
| Tabelas CORE (people, auth_identity_links) | OK | Chaves UUID, índices, updated_at trigger |
| Tabelas tenants/units/memberships | OK | Restrição de integridade tenant-unidade |
| Tabelas RBAC (roles, permissions, assignments) | OK | Escopo opcional, restrição ROOT global |
| Funções de segurança (005) | OK | Fail-closed, validação de vínculos |
| Tabela audit_events (006) | OK | Append-only, índices apropriados |
| RLS e políticas (007) | OK | Cobertura completa de todas as tabelas |

**Ressalva P0:** A função `trg_audit_event()` tenta fazer cast de `current_setting('request.jwt.claims.sub', true)` para UUID. Se o claim `sub` não estiver definido, `NULLIF(..., '')::UUID` pode falhar. Deve-se usar um bloco `EXCEPTION` ou validar antes do cast.

**Recomendação:** Ajustar `trg_audit_event()` para tratar `sub` ausente de forma segura:

```sql
DECLARE
  v_auth_user_id UUID;
BEGIN
  v_auth_user_id := NULL;
  BEGIN
    v_auth_user_id := NULLIF(current_setting('request.jwt.claims.sub', true), '')::UUID;
  EXCEPTION WHEN others THEN
    v_auth_user_id := NULL;
  END;
  -- usar v_auth_user_id no INSERT
END;
```

### 2.3 IAM / RBAC — Matriz de Permissões

| Item | Status | Observação |
|------|--------|------------|
| Contrato Auth ↔ People | OK | Fluxo claro: login → link → pessoa → memberships → papéis |
| Permissões atômicas (recurso.acao) | OK | Padrão claro e extensível |
| Matriz por perfil | OK | ROOT/Admin/Gestor/Operador/Suporte/Auditor bem definidos |
| Prevenção de elevação de privilégios | OK | Contexto definido apenas por `fn_set_session_contexto()` |
| Restrição de atribuição ROOT | OK | `chk_role_assignment_scoped` impede não-ROOT sem tenant |

**Ressalva P1:** A matriz de permissões no documento `iam_rbac.md` lista `roles.assign` para Admin, mas não especifica se Admin pode atribuir papéis a outras pessoas dentro do próprio tenant sem ser ROOT. Deve-se esclarecer se Admin pode atribuir qualquer papel ou apenas papéis abaixo de seu nível.

**Recomendação:** Adicionar regra explícita: "Admin só pode atribuir papéis com nível <= ao seu próprio nível, exceto ROOT que só ROOT pode atribuir."

### 2.4 AppSec — RLS e Políticas de Segurança

| Item | Status | Observação |
|------|--------|------------|
| RLS habilitado em todas as tabelas | OK | 12 tabelas cobertas |
| Políticas SELECT com isolamento tenant | OK | Usam `tenant_memberships` para validar |
| Políticas INSERT/UPDATE/DELETE com WITH CHECK | OK | Validam permissão antes de gravar |
| audit_events append-only | OK | Políticas `false` para UPDATE/DELETE |
| Fail-closed sem contexto | OK | Sem claims = 0 linhas |

**Ressalva P0:** Algumas políticas usam `fn_current_tenant_id()` dentro de `USING` para tabelas que não têm coluna `tenant_id` diretamente (ex: `people` usa join com `tenant_memberships`). Isso está correto, mas deve-se garantir que `fn_current_tenant_id()` retorne NULL quando não definido, não string vazia.

**Recomendação:** Ajustar `fn_current_tenant_id()` e `fn_current_person_id()` para retornar NULL quando a setting estiver vazia ou ausente:

```sql
CREATE OR REPLACE FUNCTION fn_current_tenant_id()
RETURNS UUID LANGUAGE sql STABLE PARALLEL SAFE AS $$
  SELECT NULLIF(current_setting('request.jwt.claims.tenant_id', true), '')::UUID;
$$;
```

### 2.5 Database-Driven UI/UX — Contratos CORE ↔ UI

| Item | Status | Observação |
|------|--------|------------|
| Contexto de sessão via RPC | OK | `fn_set_session_contexto()` valida antes de definir claims |
| Verificação de permissão por ação | OK | `fn_person_has_permission()` via RPC |
| tenant_settings para tema/idioma/módulos | OK | Chave-valor JSONB, isolado por tenant |
| Mapeamento módulo → rota | OK | Tabela clara de rotas e permissões |
| Regras de renderização condicional | OK | Botão invisível vs desabilitado bem definidos |

**Ressalva P1:** O contrato não especifica comportamento quando `tenant_settings` está ausente para uma chave. Deve-se definir valores padrão (fallbacks) no frontend para evitar quebra de UI quando o tenant não tem uma configuração específica.

**Recomendação:** Documentar fallbacks padrão para cada chave de `tenant_settings` (ex: tema padrão `"medico_light"`, idioma `"pt-BR"`).

### 2.6 QA — Plano de Testes de Isolamento

| Item | Status | Observação |
|------|--------|------------|
| Usuários de teste (fixtures) | OK | 8 perfis cobrindo todos os papéis |
| Casos de teste cross-tenant | OK | 6 casos de isolamento |
| Casos de teste cross-unit | OK | 5 casos de isolamento |
| Casos de teste RBAC | OK | 6 casos de permissão |
| Casos de teste audit | OK | 6 casos de auditoria |
| Scripts pgTAP | OK | Exemplos fornecidos |
| Critérios de aprovação | OK | Lista clara de critérios Gate 1 |

**Ressalva:** Nenhuma crítica. Plano de teste abrangente.

---

## 3. Itens de Correção Obrigatórios (P0)

| ID | Item | Arquivo | Impacto |
|----|------|---------|---------|
| P0-1 | Ajustar `trg_audit_event()` para tratar `sub` ausente com `EXCEPTION` | `supabase/migrations/gate1/007_rls_policies.sql` | Alto — evita erro de cast em auditoria |
| P0-2 | Ajustar `fn_current_tenant_id()` e `fn_current_person_id()` para retornar NULL com setting vazia | `supabase/migrations/gate1/005_security_functions.sql` | Alto — evita RLS comportamentos inesperados |

---

## 4. Itens de Melhoria (P1)

| ID | Item | Arquivo | Impacto |
|----|------|---------|---------|
| P1-1 | Esclarecer regra de atribuição de papel: Admin só atribui nível <= próprio | `docs/gate1/iam_rbac.md` | Médio — prevenção de elevação |
| P1-2 | Documentar fallbacks padrão para chaves de `tenant_settings` | `docs/gate1/database_driven_ui_ux.md` | Médio — robustez da UI |

---

## 5. Itens Observacionais (P2)

| ID | Item | Arquivo | Impacto |
|----|------|---------|---------|
| P2-1 | Considerar adicionar `deleted_at` (soft delete) em tabelas críticas | `supabase/migrations/gate1/` | Baixo — recuperação de dados |
| P2-2 | Considerar adicionar índices compostos para consultas frequentes de dashboard | `supabase/migrations/gate1/` | Baixo — performance |

---

## 6. Parecer Final

**APROVADO COM RESSALVAS P0.**

O Gate 1 atende aos requisitos de segurança, isolamento multi-tenant/multiunidade, RBAC fail-closed e Database-Driven UI/UX. Após a correção dos itens P0 (tratamento de `sub` ausente na trigger de auditoria e retorno NULL em funções de contexto), o conjunto de migrations e contratos está apto para aplicação no Supabase de produção, sujeito à autorização do responsável pelo projeto.

**Recomendação:** Aplicar primeiro em ambiente de homologação, executar o plano de testes QA completo, e somente então aplicar em produção com backup prévio.

---

**Assinatura do Auditor:** Independente — Revisão de Segurança e Arquitetura\
**Data:** Gate 1 — CORE Reconstruction\
**Versão do documento:** 1.0
