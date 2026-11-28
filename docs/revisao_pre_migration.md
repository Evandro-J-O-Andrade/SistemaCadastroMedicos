# Revisão pré-migration — CHECK BOULER 24H / Database-Driven
**Data:** 2026-11-28 · **Supabase alvo:** `susztkudafpxcxkmahbj` · **Nada aplicado remotamente.**

## Migrations revisadas
1. `20261128090000_medical_catalog_core.sql`
2. `20261128090100_production_staging.sql`
3. `20261128090200_ui_seed_navigation.sql`

## Checklist de revisão
| Item | Resultado |
|---|---|
| Compat. CORE People-First (people/tenants/units) | OK — FKs corretas; `nome_norm` segue padrão `upper(nome)` |
| FKs, constraints, índices | OK — FKs + índices por tenant/unidade/data; `updated_at` triggers |
| Unicidade CRM/UF e nulos | OK — `UNIQUE(crm,crm_uf)`; NULL = pendente (não inventado) |
| RLS fail-closed | **CORRIGIDO** (ver abaixo) |
| Isolamento tenant/unidade | OK após correção (escopo por unidade do profissional) |
| Auditoria/triggers | OK — `audit_events` CORE intacto; triggers `updated_at` |
| Idempotência de lotes | OK — `import_batches.hash UNIQUE` |
| Rastreabilidade médico/produção | OK — `origem_arquivo/sheet/linha` + `import_batch_id` |
| Duplicação de menus/células | OK — `ui_navigation_items` idempotente (`WHERE NOT EXISTS`, tenant NULL com `IS NULL`) |
| Compat. CHECK BOULER / Database-Driven | OK — metadados versionados; descoberta não concede acesso |
| Rollback / cenários negativos | Parcial — `DROP TABLE` manual; sem migration reversa automática |

## Correções aplicadas (local, pré-execução)
1. **CRÍTICO — RLS de leitura médica.** As policies `medprof_read`, `medspec_read`, `medunit_read` escopavam por `tenant_memberships` **do médico**. Médicos são `people` **sem membership** (não são usuários), então **apenas ROOT** os veria. Reescritas para escopar via `medical_professional_units → units.tenant_id` (tenant do gestor/admin). Agora gestor vê a equipe da sua unidade; ROOT vê tudo.
2. **MÉDIO — palavra reservada.** Alias `schema` em `ui_seed_navigation` (VALUES) trocado por `schema_json` para evitar conflito de identificador.
3. **MENOR — escrita de produção.** `production_entries`/`import_batches` usam `FOR ALL` com permissão `producao.create` (inclui update/delete). Aceitável para v1; recomenda-se separar `update`/`delete` em hardening futuro.

## Riscos residuais (não impeditivos)
- Políticas `FOR ALL` agregam SELECT/INSERT/UPDATE/DELETE (coerente, mas menos granular).
- Sem migration reversa dedicada (rollback manual por `DROP`).
- `ui_seed_navigation` deve ser conferida contra linhas reais antes de rodar (idempotente, mas validar chaves).

## Veredito
**GO (técnico) — após estas correções.** As 3 migrations estão prontas para revisão final e, com sua autorização específica, execução no `susztkudafpxcxkmahbj`. **Não executadas remotamente.**

## Próximo passo (separado)
- **AUTHORIZE** execução das 3 migrations → **EXECUTE** (você aplica ou fornece credencial) → **VERIFY**.
- Seed real dos 335 médicos + 14.148 produções em etapa **separada**, após verificação.
- Em paralelo (não bloqueia): 1ª célula Enterprise Database-Driven (Admin/ROOT) + AppShell.