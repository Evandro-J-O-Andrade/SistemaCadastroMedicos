-- 20261128090300_verify_medical_isolation.sql
-- HARNESS DE VALIDAÇÃO — executar APÓS 090000/090100/090200, no SQL Editor (postgres) ou psql.
-- Tudo em transação com ROLLBACK (nada persiste). UUIDs 100% hexadecimais válidos.
-- RLS só é exercitada com SET ROLE authenticated + auth.uid() simulado via request.jwt.claims
-- (fn_resolve_person_id usa auth.uid() -> auth_identity_links; NÃO usa claims.person_id).
-- auth_identity_links.auth_user_id é UUID livre (sem FK p/ auth.users): não depende de usuário real.
--
-- AS ASSERTIVAS SÃO AUTOMÁTICAS: qualquer desvio levanta exceção e ABORTA a transação (ROLLBACK).
-- Nada é "esperado em comentário": o script FALHA de verdade se a segurança/integridade não valer.

BEGIN;

-- ===================== FIXTURES (como dono; postgres bypassa RLS) =====================
INSERT INTO tenants (id, nome, slug) VALUES
  ('11111111-1111-1111-1111-111111111111','Tenant A','tenant-a-verify'),
  ('22222222-2222-2222-2222-222222222222','Tenant B','tenant-b-verify');

INSERT INTO units (id, tenant_id, nome) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','11111111-1111-1111-1111-111111111111','Unidade A'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','22222222-2222-2222-2222-222222222222','Unidade B'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc','11111111-1111-1111-1111-111111111111','Unidade A2');

-- permissions exige nome NOT NULL UNIQUE + recurso + acao.
INSERT INTO permissions (id, nome, recurso, acao) VALUES
  ('10000000-0000-0000-0000-000000000001','medicos.read','medicos','read'),
  ('10000000-0000-0000-0000-000000000002','medicos.update','medicos','update'),
  ('10000000-0000-0000-0000-000000000003','producao.read','producao','read'),
  ('10000000-0000-0000-0000-000000000004','producao.create','producao','create'),
  ('10000000-0000-0000-0000-000000000005','medicos.create','medicos','create');

INSERT INTO roles (id, nome) VALUES
  ('20000000-0000-0000-0000-00000000000a','gestor_unidade_a_verify'),
  ('20000000-0000-0000-0000-00000000000b','gestor_unidade_b_verify'),
  ('20000000-0000-0000-0000-00000000000c','gestor_unidade_a2_verify');

INSERT INTO role_permissions (role_id, permission_id) VALUES
  ('20000000-0000-0000-0000-00000000000a','10000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-00000000000a','10000000-0000-0000-0000-000000000002'),
  ('20000000-0000-0000-0000-00000000000a','10000000-0000-0000-0000-000000000003'),
  ('20000000-0000-0000-0000-00000000000a','10000000-0000-0000-0000-000000000004'),
  ('20000000-0000-0000-0000-00000000000a','10000000-0000-0000-0000-000000000005'),
  ('20000000-0000-0000-0000-00000000000b','10000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-00000000000b','10000000-0000-0000-0000-000000000003'),
  -- Papel C: create/read de medicos, escopado APENAS à Unidade A2 (sem papel tenant-wide).
  ('20000000-0000-0000-0000-00000000000c','10000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-00000000000c','10000000-0000-0000-0000-000000000005');

INSERT INTO people (id, nome) VALUES
  ('30000000-0000-0000-0000-0000000000a1','Gestor A'),
  ('30000000-0000-0000-0000-0000000000b1','Gestor B'),
  ('30000000-0000-0000-0000-0000000000e1','Sem Permissao'),
  ('30000000-0000-0000-0000-0000000000d1','Medico A'),
  ('30000000-0000-0000-0000-0000000000d2','Medico B'),
  ('30000000-0000-0000-0000-0000000000d3','Medico C (membro A, sem cadastro)'),
  ('30000000-0000-0000-0000-0000000000a2','Gestor A2 (só Unidade A2)'),
  ('30000000-0000-0000-0000-0000000000d4','Medico D (sem membership)'),
  ('30000000-0000-0000-0000-0000000000d5','Medico E (membro A, sem cadastro)');

-- auth.uid() -> auth_identity_links (auth_user_id UUID livre).
INSERT INTO auth_identity_links (auth_user_id, person_id) VALUES
  ('f0000000-0000-0000-0000-0000000000a1','30000000-0000-0000-0000-0000000000a1'),
  ('f0000000-0000-0000-0000-0000000000b1','30000000-0000-0000-0000-0000000000b1'),
  ('f0000000-0000-0000-0000-0000000000e1','30000000-0000-0000-0000-0000000000e1'),
  ('f0000000-0000-0000-0000-0000000000a2','30000000-0000-0000-0000-0000000000a2');

INSERT INTO tenant_memberships (person_id, tenant_id, ativo) VALUES
  ('30000000-0000-0000-0000-0000000000a1','11111111-1111-1111-1111-111111111111',true),
  ('30000000-0000-0000-0000-0000000000b1','22222222-2222-2222-2222-222222222222',true),
  ('30000000-0000-0000-0000-0000000000e1','11111111-1111-1111-1111-111111111111',true),
  ('30000000-0000-0000-0000-0000000000d3','11111111-1111-1111-1111-111111111111',true),
  ('30000000-0000-0000-0000-0000000000a2','11111111-1111-1111-1111-111111111111',true),
  ('30000000-0000-0000-0000-0000000000d5','11111111-1111-1111-1111-111111111111',true);
-- d4 (Medico D) NÃO tem membership: pessoa nova para testar admissão.

INSERT INTO unit_memberships (person_id, unit_id, tenant_id, ativo) VALUES
  ('30000000-0000-0000-0000-0000000000a1','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','11111111-1111-1111-1111-111111111111',true),
  ('30000000-0000-0000-0000-0000000000b1','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','22222222-2222-2222-2222-222222222222',true),
  ('30000000-0000-0000-0000-0000000000a2','cccccccc-cccc-cccc-cccc-cccccccccccc','11111111-1111-1111-1111-111111111111',true);

INSERT INTO role_assignments (person_id, role_id, tenant_id, unit_id, ativo) VALUES
  ('30000000-0000-0000-0000-0000000000a1','20000000-0000-0000-0000-00000000000a','11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',true),
  ('30000000-0000-0000-0000-0000000000b1','20000000-0000-0000-0000-00000000000b','22222222-2222-2222-2222-222222222222','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',true),
  -- Gestor A também com papel escopado ao TENANT A (unit NULL): opera em A2 (multiunidade),
  -- mas NÃO é global (tenant_id != NULL), então 5m (identidade global) permanece bloqueado.
  ('30000000-0000-0000-0000-0000000000a1','20000000-0000-0000-0000-00000000000a','11111111-1111-1111-1111-111111111111',NULL,true),
  -- Gestor A2: papel C escopado APENAS à Unidade A2 (sem papel tenant-wide).
  ('30000000-0000-0000-0000-0000000000a2','20000000-0000-0000-0000-00000000000c','11111111-1111-1111-1111-111111111111','cccccccc-cccc-cccc-cccc-cccccccccccc',true);

INSERT INTO medical_professionals (id, person_id, crm, crm_uf) VALUES
  ('40000000-0000-0000-0000-0000000000a1','30000000-0000-0000-0000-0000000000d1','CRM-A-1','SP'),
  ('40000000-0000-0000-0000-0000000000b1','30000000-0000-0000-0000-0000000000d2','CRM-B-1','SP');

INSERT INTO medical_professional_units (medical_professional_id, unit_id, ativo) VALUES
  ('40000000-0000-0000-0000-0000000000a1','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',true),
  ('40000000-0000-0000-0000-0000000000b1','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',true);

-- Produção da Unidade B (para testar que Gestor A NÃO enxerga/alinha).
INSERT INTO production_entries (tenant_id, unit_id, medical_professional_id, data, turno, quantidade)
VALUES ('22222222-2222-2222-2222-222222222222','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','40000000-0000-0000-0000-0000000000b1','2026-11-01','Diurno',10);

-- ===================== TESTES COMO authenticated (RLS ativa) =====================
SET ROLE authenticated;

-- Login do Gestor A: auth.uid() = auth_user_id do Gestor A.
SELECT set_config('request.jwt.claims', '{"sub":"f0000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);

-- [5a] Gestor A vê apenas profissionais das suas unidades (esperado: 1).
DO $$ DECLARE v INT;
BEGIN
  SELECT count(*) INTO v FROM medical_professionals;
  IF v <> 1 THEN RAISE EXCEPTION 'FALHA_5A: esperado 1, obtido %', v; END IF;
  RAISE NOTICE 'OK 5a=1';
END $$;

-- [5b] Gestor A NÃO vê produção da Unidade B (esperado: 0).
DO $$ DECLARE v INT;
BEGIN
  SELECT count(*) INTO v FROM production_entries WHERE unit_id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  IF v <> 0 THEN RAISE EXCEPTION 'FALHA_5B: esperado 0, obtido %', v; END IF;
  RAISE NOTICE 'OK 5b=0';
END $$;

-- [5c] Gestor A insere na PRÓPRIA unidade (esperado: 1).
INSERT INTO production_entries (tenant_id, unit_id, medical_professional_id, data, turno, quantidade)
VALUES ('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','40000000-0000-0000-0000-0000000000a1','2026-11-01','Noturno',18);
DO $$ DECLARE v INT;
BEGIN
  SELECT count(*) INTO v FROM production_entries WHERE unit_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  IF v <> 1 THEN RAISE EXCEPTION 'FALHA_5C: esperado 1, obtido %', v; END IF;
  RAISE NOTICE 'OK 5c=1';
END $$;

-- [5d] Gestor A NÃO insere na Unidade B (esperado: bloqueado por RLS = insufficient_privilege).
DO $$
BEGIN
  INSERT INTO production_entries (tenant_id, unit_id, medical_professional_id, data, turno, quantidade)
  VALUES ('22222222-2222-2222-2222-222222222222','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','40000000-0000-0000-0000-0000000000b1','2026-11-02','Diurno',5);
  RAISE EXCEPTION 'FALHA_5D: RLS permitiu inserção cruzada';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'OK 5d bloqueado (insufficient_privilege)';
  WHEN others THEN RAISE;  -- qualquer outro erro = falha real (não mascarar)
END $$;

-- [5e] Gestor A NÃO altera médico da Unidade B (esperado: 0).
DO $$ DECLARE v INT;
BEGIN
  WITH upd AS (
    UPDATE medical_professionals SET nome_social='HACK' WHERE id='40000000-0000-0000-0000-0000000000b1' RETURNING 1
  ) SELECT count(*) INTO v FROM upd;
  IF v <> 0 THEN RAISE EXCEPTION 'FALHA_5E: esperado 0, obtido %', v; END IF;
  RAISE NOTICE 'OK 5e=0';
END $$;

-- [5g] Consistência REJEITA profissional sem vínculo (mesmo com permissão de escrita na unidade).
DO $$
BEGIN
  INSERT INTO production_entries (tenant_id, unit_id, medical_professional_id, data, turno, quantidade)
  VALUES ('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','40000000-0000-0000-0000-0000000000b1','2026-11-03','Diurno',7);
  RAISE EXCEPTION 'FALHA_5G: consistência aceitou vínculo inexistente';
EXCEPTION WHEN others THEN
  IF SQLERRM LIKE 'production_entries: profissional%' THEN RAISE NOTICE 'OK 5g bloqueado (consistência)';
  ELSIF SQLERRM LIKE 'FALHA_5G:%' THEN RAISE;
  ELSE RAISE;
  END IF;
END $$;

-- [5n] Gestor A NÃO vincula Médico B (pessoa de outro tenant) à Unidade A via fn_add_medical_professional_unit.
-- Esperado: bloqueado pelo contrato de admissão (pessoa não é membro ativo do tenant A).
DO $$ BEGIN
  PERFORM fn_add_medical_professional_unit('40000000-0000-0000-0000-0000000000b1','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
  RAISE EXCEPTION 'FALHA_5N: vinculou profissional de outro tenant';
EXCEPTION WHEN others THEN
  IF SQLERRM LIKE '%não é membro ativo%' THEN RAISE NOTICE 'OK 5n bloqueado (admissão)';
  ELSIF SQLERRM LIKE 'FALHA_5N:%' THEN RAISE;
  ELSE RAISE;
  END IF;
END $$;

-- [5o] Gestor A NÃO insere vínculo DIRETO em medical_professional_units (root-only); esperado: bloqueado.
DO $$
BEGIN
  INSERT INTO medical_professional_units (medical_professional_id, unit_id, ativo)
  VALUES ('40000000-0000-0000-0000-0000000000b1','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',true);
  RAISE EXCEPTION 'FALHA_5O: inserção direta de vínculo permitida';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'OK 5o bloqueado (root-only)';
  WHEN others THEN RAISE;
END $$;

-- [5f] Usuário SEM permissão (membership ativa, sem role/permissão) não vê nada (esperado: 0/0).
SELECT set_config('request.jwt.claims', '{"sub":"f0000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
DO $$ DECLARE v INT;
BEGIN
  SELECT count(*) INTO v FROM medical_professionals;
  IF v <> 0 THEN RAISE EXCEPTION 'FALHA_5F_MED: esperado 0, obtido %', v; END IF;
  SELECT count(*) INTO v FROM production_entries;
  IF v <> 0 THEN RAISE EXCEPTION 'FALHA_5F_PROD: esperado 0, obtido %', v; END IF;
  RAISE NOTICE 'OK 5f=0/0';
END $$;

-- [5h] SEM sessão (auth.uid() nulo): helpers fail-closed (esperado: 0/0).
SELECT set_config('request.jwt.claims', '{"role":"authenticated"}', true);
DO $$ DECLARE v INT;
BEGIN
  SELECT count(*) INTO v FROM medical_professionals;
  IF v <> 0 THEN RAISE EXCEPTION 'FALHA_5H_MED: esperado 0, obtido %', v; END IF;
  SELECT count(*) INTO v FROM production_entries;
  IF v <> 0 THEN RAISE EXCEPTION 'FALHA_5H_PROD: esperado 0, obtido %', v; END IF;
  RAISE NOTICE 'OK 5h=0/0';
END $$;

-- [5m] Gestor A (unidade) NÃO altera identidade GLOBAL do próprio Médico A (esperado: 0).
SELECT set_config('request.jwt.claims', '{"sub":"f0000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
DO $$ DECLARE v INT;
BEGIN
  WITH upd AS (
    UPDATE medical_professionals SET nome_social='HACK-A' WHERE id='40000000-0000-0000-0000-0000000000a1' RETURNING 1
  ) SELECT count(*) INTO v FROM upd;
  IF v <> 0 THEN RAISE EXCEPTION 'FALHA_5M: esperado 0, obtido %', v; END IF;
  RAISE NOTICE 'OK 5m=0';
END $$;

-- [5r] Multiunidade REUTILIZA o profissional (não duplica) e NÃO expõe outro tenant.
-- Gestor A (papel tenant A) vincula o Médico A (membro A) à Unidade A2. Esperado: sucesso,
-- continua 1 registro profissional para a pessoa d1, e Gestor A ainda NÃO vê a Unidade B.
DO $$ DECLARE v_links INT; v_profs INT; v_b INT;
BEGIN
  PERFORM fn_add_medical_professional_unit('40000000-0000-0000-0000-0000000000a1','cccccccc-cccc-cccc-cccc-cccccccccccc');
  SELECT count(*) INTO v_links FROM medical_professional_units
    WHERE medical_professional_id='40000000-0000-0000-0000-0000000000a1' AND unit_id='cccccccc-cccc-cccc-cccc-cccccccccccc';
  IF v_links <> 1 THEN RAISE EXCEPTION 'FALHA_5R_LINK: vínculo A2 ausente (%);', v_links; END IF;
  SELECT count(*) INTO v_profs FROM medical_professionals WHERE person_id='30000000-0000-0000-0000-0000000000d1';
  IF v_profs <> 1 THEN RAISE EXCEPTION 'FALHA_5R_DUP: duplicou profissional (person d1=%);', v_profs; END IF;
  SELECT count(*) INTO v_b FROM production_entries WHERE unit_id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  IF v_b <> 0 THEN RAISE EXCEPTION 'FALHA_5R_EXPO: exposição de outro tenant (%);', v_b; END IF;
  RAISE NOTICE 'OK 5r multiunidade sem duplicação/ sem exposição';
END $$;

-- [5s] Cadastro inicial (pessoa MEMBRO do tenant, sem cadastro) via fn_create_medical_professional.
-- Gestor A (papel tenant A) cria profissional para a pessoa d3 (membro A) na Unidade A2. Esperado: sucesso + vínculo.
DO $$ DECLARE v_id UUID; v_link INT;
BEGIN
  v_id := fn_create_medical_professional('30000000-0000-0000-0000-0000000000d3','CRM-C-1','SP','Dr C','cccccccc-cccc-cccc-cccc-cccccccccccc');
  SELECT count(*) INTO v_link FROM medical_professional_units
    WHERE medical_professional_id=v_id AND unit_id='cccccccc-cccc-cccc-cccc-cccccccccccc' AND ativo=true;
  IF v_link <> 1 THEN RAISE EXCEPTION 'FALHA_5S: vínculo inicial ausente'; END IF;
  RAISE NOTICE 'OK 5s cadastro inicial (membro) com vínculo';
END $$;

-- [5t] Pessoa NOVA (sem membership) admitida por caller com autoridade de TENANT (Gestor A). Esperado: sucesso.
DO $$ DECLARE v_id UUID; v_link INT;
BEGIN
  v_id := fn_create_medical_professional('30000000-0000-0000-0000-0000000000d4','CRM-D-1','SP','Dr D','cccccccc-cccc-cccc-cccc-cccccccccccc');
  SELECT count(*) INTO v_link FROM medical_professional_units
    WHERE medical_professional_id=v_id AND unit_id='cccccccc-cccc-cccc-cccc-cccccccccccc' AND ativo=true;
  IF v_link <> 1 THEN RAISE EXCEPTION 'FALHA_5T: admissão de pessoa nova (tenant) falhou'; END IF;
  RAISE NOTICE 'OK 5t admissão pessoa nova (autoridade tenant)';
END $$;

RESET ROLE;

-- [5u] Pessoa NOVA (sem membership) NÃO pode ser admitida por caller SÓ de unidade (Gestor A2).
-- Gestor A2 tem medicos.create escopado à A2, mas NÃO tem autoridade de admissão em nível de tenant.
-- Esperado: bloqueado pelo contrato de admissão.
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"f0000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);
DO $$ BEGIN
  PERFORM fn_create_medical_professional('30000000-0000-0000-0000-0000000000d4','CRM-D-2','SP','Dr D dup','cccccccc-cccc-cccc-cccc-cccccccccccc');
  RAISE EXCEPTION 'FALHA_5U: admissão de pessoa nova por gestor de unidade permitida';
EXCEPTION WHEN others THEN
  IF SQLERRM LIKE '%sem autorização para admitir%' THEN RAISE NOTICE 'OK 5u bloqueado (admissão exige tenant)';
  ELSIF SQLERRM LIKE 'FALHA_5U:%' THEN RAISE;
  ELSE RAISE;
  END IF;
END $$;

RESET ROLE;

-- [5v] Revogação isolada: prova o contrato real dos helpers (autorização por role_assignments).
-- 5v1: revogar SOMENTE a membership (role ainda ativa) NÃO revoga acesso — o helper consulta
--      role_assignments, não tenant_memberships. Esperado: acesso PERMANECE (v = 1 profissional visível).
-- 5v2: revogar TAMBÉM a role (membership já revogada) CESSA o acesso. Esperado: 0.
DO $$ BEGIN
  UPDATE tenant_memberships SET ativo=false
    WHERE person_id='30000000-0000-0000-0000-0000000000a1' AND tenant_id='11111111-1111-1111-1111-111111111111';
END $$;
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"f0000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
DO $$ DECLARE v INT;
BEGIN
  SELECT count(*) INTO v FROM medical_professionals;
  IF v <> 1 THEN RAISE EXCEPTION 'FALHA_5V1: membership isolada alterou acesso (esperado 1, obtido %);', v; END IF;
  RAISE NOTICE 'OK 5v1 membership isolada NÃO revoga (gate = role)';
END $$;
RESET ROLE;

DO $$ BEGIN
  UPDATE role_assignments SET ativo=false WHERE person_id='30000000-0000-0000-0000-0000000000a1';
END $$;
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"f0000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
DO $$ DECLARE v INT;
BEGIN
  SELECT count(*) INTO v FROM medical_professionals;
  IF v <> 0 THEN RAISE EXCEPTION 'FALHA_5V2: acesso persistiu após revogar role (%);', v; END IF;
  RAISE NOTICE 'OK 5v2 role revogada CESSA acesso';
END $$;

RESET ROLE;

-- [5j] Consistência independe da RLS (contexto DONO): vínculo inexistente é rejeitado pelo trigger.
DO $$
BEGIN
  INSERT INTO production_entries (tenant_id, unit_id, medical_professional_id, data, turno, quantidade)
  VALUES ('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','40000000-0000-0000-0000-0000000000b1','2026-11-04','Diurno',3);
  RAISE EXCEPTION 'FALHA_5J: trigger de consistência não rejeitou vínculo inexistente';
EXCEPTION WHEN others THEN
  IF SQLERRM LIKE 'production_entries: profissional%' THEN RAISE NOTICE 'OK 5j (consistência, dono)';
  ELSIF SQLERRM LIKE 'FALHA_5J:%' THEN RAISE; ELSE RAISE; END IF;
END $$;

-- [5k] Reparentar lote já referenciado é bloqueado (mesmo como dono).
DO $$
DECLARE v_batch UUID;
BEGIN
  INSERT INTO import_batches (id, tenant_id, arquivo, hash) VALUES
    ('50000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','a.csv','hash-a') RETURNING id INTO v_batch;
  INSERT INTO production_staging (tenant_id, unit_id, import_batch_id, doctor_key, attendances) VALUES
    ('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', v_batch, 'k1', 5);
  BEGIN
    UPDATE import_batches SET tenant_id='22222222-2222-2222-2222-222222222222' WHERE id=v_batch;
    RAISE EXCEPTION 'FALHA_5K: lote referenciado foi reparentado';
  EXCEPTION WHEN others THEN
    IF SQLERRM LIKE '%já referenciado%' THEN RAISE NOTICE 'OK 5k (reparent bloqueado)';
    ELSIF SQLERRM LIKE 'FALHA_5K:%' THEN RAISE; ELSE RAISE; END IF;
  END;
END $$;

-- [5p] Pessoa não recebe segundo cadastro profissional (UNIQUE person_id); esperado: bloqueado.
DO $$ BEGIN
  INSERT INTO medical_professionals (person_id, crm, crm_uf) VALUES
    ('30000000-0000-0000-0000-0000000000d1','CRM-A-2','SP');
  RAISE EXCEPTION 'FALHA_5P: duplicou profissional da mesma pessoa';
EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'OK 5p bloqueado (unique person_id)';
  WHEN others THEN RAISE;
END $$;

-- [5q] Staging não aceita lote de outro tenant (fn_staging_batch_consistency); esperado: bloqueado.
DO $$
DECLARE v_batch UUID;
BEGIN
  INSERT INTO import_batches (id, tenant_id, arquivo, hash) VALUES
    ('50000000-0000-0000-0000-000000000002','22222222-2222-2222-2222-222222222222','b.csv','hash-b') RETURNING id INTO v_batch;
  BEGIN
    INSERT INTO production_staging (tenant_id, unit_id, import_batch_id, doctor_key, attendances) VALUES
      ('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', v_batch, 'k2', 9);
    RAISE EXCEPTION 'FALHA_5Q: staging aceitou lote de outro tenant';
  EXCEPTION WHEN others THEN
    IF SQLERRM LIKE 'production_staging: lote%' THEN RAISE NOTICE 'OK 5q (lote cross-tenant bloqueado)';
    ELSIF SQLERRM LIKE 'FALHA_5Q:%' THEN RAISE; ELSE RAISE; END IF;
  END;
END $$;

ROLLBACK;

-- ===================== ESTRUTURA (como dono) =====================
-- [1] 7 tabelas
DO $$ DECLARE v INT;
BEGIN
  SELECT count(*) INTO v FROM information_schema.tables
  WHERE table_schema='public' AND table_name IN ('medical_professionals','specialties','medical_professional_specialties','medical_professional_units','production_entries','production_staging','import_batches');
  IF v <> 7 THEN RAISE EXCEPTION 'FALHA_E1: esperado 7 tabelas, obtido %', v; END IF;
  RAISE NOTICE 'OK E1=7 tabelas';
END $$;

-- [2] 4 policies por tabela (SELECT/INSERT/UPDATE/DELETE)
DO $$ DECLARE v INT;
BEGIN
  SELECT count(*) INTO v FROM (
    SELECT tablename, count(*) c FROM pg_policies
    WHERE schemaname='public' AND tablename IN ('medical_professionals','specialties','medical_professional_specialties','medical_professional_units','production_entries','production_staging','import_batches')
    GROUP BY tablename
  ) s WHERE c <> 4;
  IF v <> 0 THEN RAISE EXCEPTION 'FALHA_E2: há tabela com != 4 policies'; END IF;
  RAISE NOTICE 'OK E2=4 policies/tabela';
END $$;

-- [3] nav_itens = 9; 0 duplicidades (tenant NULL)
DO $$ DECLARE v INT;
BEGIN
  SELECT count(*) INTO v FROM ui_navigation_items;
  IF v <> 9 THEN RAISE EXCEPTION 'FALHA_E3: esperado 9 nav_itens, obtido %', v; END IF;
  SELECT count(*) INTO v FROM (SELECT key FROM ui_navigation_items WHERE tenant_id IS NULL GROUP BY key HAVING count(*)>1) d;
  IF v <> 0 THEN RAISE EXCEPTION 'FALHA_E3B: há duplicidade de nav key'; END IF;
  RAISE NOTICE 'OK E3=9 nav_itens sem duplicidade';
END $$;

-- [4] helpers + triggers instalados
DO $$ DECLARE v INT;
BEGIN
  SELECT count(*) INTO v FROM pg_proc WHERE proname IN ('fn_person_unit_readable','fn_person_unit_writable','fn_person_tenant_readable','fn_person_tenant_writable','fn_person_global_writable','fn_prod_entries_consistency','fn_batch_unit_consistency','fn_staging_unit_consistency','fn_staging_batch_consistency','fn_create_medical_professional','fn_add_medical_professional_unit');
  IF v <> 11 THEN RAISE EXCEPTION 'FALHA_E4: esperado 11 funções, obtido %', v; END IF;
  SELECT count(*) INTO v FROM pg_trigger WHERE tgname IN ('trg_prod_entries_consistency','trg_import_batches_consistency','trg_production_staging_consistency','trg_staging_batch_consistency','import_batches_updated_at','production_entries_updated_at');
  IF v <> 6 THEN RAISE EXCEPTION 'FALHA_E4B: esperado 6 triggers, obtido %', v; END IF;
  RAISE NOTICE 'OK E4 helpers+triggers';
END $$;

-- FIM. Se chegou até aqui sem exceção, TODAS as assertivas passaram => GO.
-- ROLLBACK garante que nada persiste; execute 090000/090100/090200 antes deste harness.