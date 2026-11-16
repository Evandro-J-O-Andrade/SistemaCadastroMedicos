# Gate 1.2 — Plano de Implantação, Backup e Rollback

## 1. Pré-requisitos

- Supabase CLI 2.114.0 instalado e autenticado
- Acesso ao projeto `susztkudafpxcxkmahbj` (host: `db.susztkudafpxcxkmahbj.supabase.co:5432`)
- Usuário proprietário: `newwavegestaoalpha@hotmail.com`
- `SUPABASE_SECRET_KEY` deve ser revogada/regenerada no Supabase Dashboard antes do push

## 2. Backup pré-implantação

Executar ANTES de qualquer alteração no banco remoto:

```bash
# 1. Conectar ao banco remoto Supabase
export PGPASSWORD=<senha_do_postgres_remoto>

# 2. Dump completo do esquema e dados
pg_dump -h db.susztkudafpxcxkmahbj.supabase.co -p 5432 -U postgres -d postgres \
  --schema=public \
  --file=backup_pre_gate1_$(date +%Y%m%d_%H%M%S).sql

# 3. Verificar integridade do backup
grep -c "CREATE TABLE" backup_pre_gate1_*.sql
```

O backup deve ser armazenado fora do repositório (não commitar).

## 3. Implantação das migrations

```bash
# 1. Linkar projeto Supabase (se ainda não linkado)
supabase login
supabase link --project-ref susztkudafpxcxkmahbj

# 2. Verificar migrations pendentes
supabase migration list

# 3. Aplicar migrations Gate 1 na ordem correta
supabase db push
```

**Ordem das migrations Gate 1 (deve ser mantida):**
1. `001_core_people.sql` — pessoas e auth_identity_links
2. `002_tenants_units.sql` — tenants, units, tenant_settings
3. `003_memberships.sql` — tenant_memberships, unit_memberships
4. `004_roles_permissions.sql` — roles, permissions, role_permissions, role_assignments
5. `005_security_functions.sql` — funções de contexto e permissão (COM as correções Gate 1.2)
6. `006_audit_events.sql` — tabela de auditoria append-only
7. `007_rls_policies.sql` — RLS policies e triggers de auditoria

**NOTA:** As migrations estão atualmente em `supabase/migrations/gate1/`. O Supabase CLI 2.114.0 lê apenas de `supabase/migrations/` (estrutura plana). Antes do `supabase db push`, mover os 7 arquivos SQL para `supabase/migrations/` com numeração sequencial (ex: 011-017, evitando conflito com 001-010 existentes) ou remover as migrations antigas 001-010.

**Arquivos que NÃO devem ir para produção:**
- `supabase/migrations/gate1/test_data.sql` — dados de teste apenas
- `supabase/migrations/gate1/isolacao_test.sql` — testes apenas

## 4. Validação pós-implantação

Após o `supabase db push`, executar no banco remoto (via SQL Editor do Supabase Dashboard ou `psql`):

```sql
-- Verificar que as funções existem com search_path correto
SELECT proname, proconfig FROM pg_proc
WHERE proname IN ('fn_person_has_permission', 'fn_set_session_contexto');

-- Verificar RLS habilitado em todas as tabelas
SELECT relname, relrowsecurity FROM pg_class
WHERE relkind = 'r' AND relnamespace = 'public'::regnamespace;

-- Verificar que EXECUTE não está concedido a PUBLIC
SELECT grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_name IN ('fn_person_has_permission', 'fn_set_session_contexto');
```

## 5. Plano de Rollback

Em caso de falha crítica após implantação:

```bash
# 1. Restaurar backup pré-implantação
psql -h db.susztkudafpxcxkmahbj.supabase.co -p 5432 -U postgres -d postgres \
  -f backup_pre_gate1_*.sql

# 2. Se o restore falhar, recriar o banco e restaurar
# (via Supabase Dashboard: criar novo projeto e restaurar backup)
```

**Critérios de rollback:**
- Qualquer erro durante `supabase db push`
- Testes de isolamento falhando no banco remoto
- Vazamento de dados entre tenants detectado
- Qualquer usuário conseguir acessar dados de outro tenant

## 6. Considerações de Segurança para Implantação

- Não executar `supabase db push` sem autorização explícita do usuário
- Não commitar/pushar o `SUPABASE_SECRET_KEY` para o repositório
- O `.env` local contém apenas chaves públicas (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
- Os dados de teste (`test_data.sql`) não devem ser carregados em produção
- Após implantação, revisar o `supabase/config.toml` se existir
