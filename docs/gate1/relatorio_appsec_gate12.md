# Relatório AppSec — Gate 1.2 (Revisão Pré-Implantação)

**Projeto:** Gestão Médica Alpha\
**Destino:** Supabase `susztkudafpxcxkmahbj`\
**Ambiente de validação:** PostgreSQL 17.6 local (porta 54322, database `gate1_test`)\
**CLI Supabase:** 2.114.0\
**Status:** Revisão concluída — correções aplicadas

---

## 1. Resumo Executivo

O Gate 1.1 passou na validação funcional local (11/11 testes de isolamento). Durante a revisão de segurança Gate 1.2, foram identificados 3 achados nas funções `SECURITY DEFINER` que foram corrigidos:

| Achado | Severidade | Corrigido |
|--------|------------|-----------|
| `EXECUTE` concedido a `PUBLIC` nas funções de segurança | Alta | Sim — revogado, apenas `authenticated` |
| `search_path` não definido em funções `SECURITY DEFINER` | Média | Sim — `search_path = public, pg_temp` |
| `fn_person_has_permission` aceita `p_person_id` de terceiros (info leak) | Média | Sim — guard `p_person_id = fn_current_person_id()` |

Após as correções, todos os 11 testes de isolamento e 8 testes negativos passaram.

---

## 2. Matriz de Privilígios das Funções de Segurança

### `fn_person_has_permission(UUID, TEXT, TEXT, UUID, UUID)`

| Atributo | Valor |
|----------|-------|
| Proprietário | `postgres` |
| Tipo de execução | `SECURITY DEFINER` |
| Volatilidade | `STABLE` |
| Paralelo | `PARALLEL SAFE` |
| `search_path` | `public, pg_temp` |
| `Leakproof` | `n` |
| EXECUTE concedido a | `authenticated`, `postgres` |
| EXECUTE revogado de | `PUBLIC` |

### `fn_set_session_contexto(UUID, UUID, UUID)`

| Atributo | Valor |
|----------|-------|
| Proprietário | `postgres` |
| Tipo de execução | `SECURITY DEFINER` |
| Volatilidade | `VOLATILE` |
| Paralelo | `UNSAFE` |
| `search_path` | `public, pg_temp` |
| `Leakproof` | `n` |
| EXECUTE concedido a | `authenticated`, `postgres` |
| EXECUTE revogado de | `PUBLIC` |

### Funções de leitura de claims (SECURITY INVOKER — sem alteração)

| Função | Execução | EXECUTE |
|--------|----------|---------|
| `fn_current_person_id()` | `SECURITY INVOKER` | `PUBLIC`, `authenticated`, `app_user`, `postgres` |
| `fn_current_tenant_id()` | `SECURITY INVOKER` | `PUBLIC`, `authenticated`, `app_user`, `postgres` |
| `fn_current_unit_id()` | `SECURITY INVOKER` | `PUBLIC`, `authenticated`, `app_user`, `postgres` |

---

## 3. Resultado dos Testes Negativos de Segurança

Todos os 8 testes negativos passaram (resultado `t` = comportamento seguro confirmado):

| # | Teste | Resultado | Comportamento esperado |
|---|-------|-----------|----------------------|
| NEG-1 | Consultar permissões de outra pessoa | `t` | Bloqueado por guard `p_person_id = fn_current_person_id()` |
| NEG-2 | Definir contexto em tenant não vinculado | `t` | Bloqueado por validação de `tenant_memberships` |
| NEG-3 | Consultar permissões com person_id inexistente | `t` | Retorna `false` (fail-closed) |
| NEG-4 | Bypass global sem ser ROOT | `t` | Retorna `false` — ROOT requer vínculo válido |
| NEG-5 | EXECUTE sobre `PUBLIC` | `REMOVIDO` | Apenas `authenticated`, `postgres` |
| NEG-6 | Cross-tenant via `p_tenant_id` explícito | `t` | Bloqueado por escopo de tenant na função |
| NEG-7 | `search_path` explícito nas funções | `t` | `{"search_path=public, pg_temp"}` em ambas |
| NEG-8 | Definir contexto em unidade não vinculada | `t` | Bloqueado por validação de `unit_memberships` |

Testes de isolamento funcional (Gate 1.1): 11/11 passaram.

---

## 4. Análise de Dependências Circulares nas Policies RLS

**Conclusão: NÃO há dependência circular.**

A cadeia de execução é linear e não recursiva:

```
Policy RLS (tabela de dados)
    → fn_person_has_permission (SECURITY DEFINER, owner=postgres)
        → Consultas a tabelas de metadados (role_assignments, role_permissions, permissions, roles)
        → Executadas como postgres (RLS ignorada pelo proprietário)
        → Retornam boolean
```

- `relforcerowsecurity = f` em todas as 12 tabelas → proprietário (`postgres`) ignora RLS
- Funções `SECURITY DEFINER` executam como `postgres` → consultas a metadados não acionam RLS
- `fn_set_session_contexto` não é chamado por nenhuma policy (0 dependências)
- Não há recursão: policy → função → metadados (sem retorno à policy)

---

## 5. Achado Não-Segurança (Schema Inconsistência)

**Tabelas `tenant_memberships` e `unit_memberships` usam coluna `atualizado_em`**, mas o trigger `trg_set_updated_at()` (definido em `001_core_people.sql`) tenta definir `NEW.updated_at`. Isso causa erro em operações `UPDATE` nessas tabelas.

**Impacto:** Apenas operações `UPDATE` falham. Leitura via RLS não é afetada. Revogação de acesso (desativar memberships via UPDATE) não funcionará até ser corrigido.

**Recomendação:** Renomear `atualizado_em` para `updated_at` nas duas tabelas, ou alterar o trigger para usar `atualizado_em`. Fora do escopo do Gate 1.2.

---

## 6. Compatibilidade com Supabase CLI 2.114.0

| Item | Status | Observação |
|------|--------|------------|
| Diretório | ⚠️ | Migrations em `supabase/migrations/gate1/` (subdiretório). Supabase CLI lê apenas `supabase/migrations/` (estrutura plana). Mover para `supabase/migrations/` antes do `db push`. |
| Numeração | ⚠️ | Gate 1 usa 001-007, conflita com migrations antigas 001-010. Renumerar (ex: 011-017) ou remover antigas. |
| Formato SQL | ✓ | Arquivos `.sql` padrão, compatíveis com PostgreSQL 17 e Supabase CLI. |
| `test_data.sql` | ⚠️ | Não incluir em produção — dados de teste apenas. |
| `isolacao_test.sql` | ⚠️ | Não incluir em produção — testes de validação apenas. |

---

## 7. Parecer Independente: GO (com condições)

**Veredito:** **GO** para implantação, sujeito às seguintes condições prévias:

1. **Mover migrations** de `supabase/migrations/gate1/` para `supabase/migrations/` com numeração sequencial sem conflito (ex: 011-017)
2. **Não incluir** `test_data.sql` e `isolacao_test.sql` no `supabase db push`
3. **Executar backup** completo do banco remoto antes do `supabase db push`
4. **Validar pós-implantação** que `search_path` está definido e `EXECUTE` não está concedido a `PUBLIC`
5. **Corrigir o bug `atualizado_em` vs `updated_at`** nas tabelas de memberships antes ou após a implantação (não bloqueia o GO, mas impede UPDATEs nas memberships)

**Não executar** `supabase db push`, commit, push ou deploy sem autorização explícita e separada do usuário.

---

## 8. Evidências SQL

Todos os comandos e resultados foram executados em `gate1_test` (PostgreSQL 17.6 local). Scripts de teste disponíveis em:
- `supabase/migrations/gate1/isolacao_test.sql` — 11 testes de isolamento (Gate 1.1)
- Arquivos temporários de teste negativo e transição (executados durante a revisão Gate 1.2)
