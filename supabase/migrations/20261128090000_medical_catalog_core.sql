-- 20261128090000_medical_catalog_core.sql
-- CHECK BOULER 24H / Database-Driven — Catálogo médico adaptado ao CORE People-First.
-- PREPARADA PARA REVISÃO. NÃO EXECUTAR NO SUPABASE SEM AUTORIZAÇÃO ESPECÍFICA.
-- Depende de: people, tenants, units, tenant_memberships, unit_memberships,
--             trg_set_updated_at(), fn_is_root, fn_resolve_person_id,
--             fn_person_has_permission, audit_events (CORE já publicado).
-- Não reutiliza cegamente legacy/004; CRM/UF e vínculos são reais e não inferidos.
--
-- CORREÇÕES (GO técnico):
--  * Isolamento por UNIDADE: leitura/escrita validam a unidade do registro (não só membership de tenant).
--  * Escrita não usa NULL,NULL genérico: valida tenant/unidade efetivos do registro.
--  * Políticas separadas INSERT/UPDATE/DELETE com USING e WITH CHECK corretos.
--  * Helpers SECURITY DEFINER explícitos (não dependem do contexto de sessão para o escopo da linha).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================
-- Helpers de isolamento por unidade/tenant (reutilizados por production_staging).
-- SECURITY DEFINER + search_path fixo: leem memberships/roles sem depender de RLS de terceiros.
-- Escopo explícito pela LINHA (p_tenant/p_unit), nunca pelo claim de sessão.
-- ============================================
CREATE OR REPLACE FUNCTION fn_person_unit_readable(p_person UUID, p_unit UUID, p_recurso TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  -- Guarda anti-vazamento: só avalia a própria identidade autenticada.
  IF p_person IS NULL OR fn_resolve_person_id() IS NULL OR p_person <> fn_resolve_person_id() THEN
    RETURN false;
  END IF;
  RETURN fn_is_root(p_person)
    OR EXISTS (
      SELECT 1
      FROM units u
      JOIN role_assignments ra
        ON ra.person_id = p_person AND ra.ativo = true
       AND ra.tenant_id = u.tenant_id
       AND (ra.unit_id IS NULL OR ra.unit_id = u.id)
      JOIN role_permissions rp ON rp.role_id = ra.role_id AND rp.ativo = true
      JOIN permissions p
        ON p.id = rp.permission_id AND p.ativo = true
       AND p.recurso = p_recurso AND p.acao = 'read'
      WHERE u.id = p_unit
    );
END;
$$;

CREATE OR REPLACE FUNCTION fn_person_unit_writable(p_person UUID, p_unit UUID, p_recurso TEXT, p_acao TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF p_person IS NULL OR fn_resolve_person_id() IS NULL OR p_person <> fn_resolve_person_id() THEN
    RETURN false;
  END IF;
  RETURN fn_is_root(p_person)
    OR EXISTS (
      SELECT 1
      FROM units u
      JOIN role_assignments ra
        ON ra.person_id = p_person AND ra.ativo = true
       AND ra.tenant_id = u.tenant_id
       AND (ra.unit_id IS NULL OR ra.unit_id = u.id)
      JOIN role_permissions rp ON rp.role_id = ra.role_id AND rp.ativo = true
      JOIN permissions p
        ON p.id = rp.permission_id AND p.ativo = true
       AND p.recurso = p_recurso AND p.acao = p_acao
      WHERE u.id = p_unit
    );
END;
$$;

CREATE OR REPLACE FUNCTION fn_person_tenant_readable(p_person UUID, p_tenant UUID, p_recurso TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF p_person IS NULL OR fn_resolve_person_id() IS NULL OR p_person <> fn_resolve_person_id() THEN
    RETURN false;
  END IF;
  RETURN fn_is_root(p_person)
    OR EXISTS (
      SELECT 1
      FROM role_assignments ra
      JOIN role_permissions rp ON rp.role_id = ra.role_id AND rp.ativo = true
      JOIN permissions p
        ON p.id = rp.permission_id AND p.ativo = true
       AND p.recurso = p_recurso AND p.acao = 'read'
      WHERE ra.person_id = p_person AND ra.ativo = true
        AND ra.tenant_id = p_tenant AND ra.unit_id IS NULL
    );
END;
$$;

CREATE OR REPLACE FUNCTION fn_person_tenant_writable(p_person UUID, p_tenant UUID, p_recurso TEXT, p_acao TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF p_person IS NULL OR fn_resolve_person_id() IS NULL OR p_person <> fn_resolve_person_id() THEN
    RETURN false;
  END IF;
  RETURN fn_is_root(p_person)
    OR EXISTS (
      SELECT 1
      FROM role_assignments ra
      JOIN role_permissions rp ON rp.role_id = ra.role_id AND rp.ativo = true
      JOIN permissions p
        ON p.id = rp.permission_id AND p.ativo = true
       AND p.recurso = p_recurso AND p.acao = p_acao
      WHERE ra.person_id = p_person AND ra.ativo = true
        AND ra.tenant_id = p_tenant AND ra.unit_id IS NULL
    );
END;
$$;

-- Capacidade GLOBAL (tenant/unit NULL): só ROOT ou papel global (role_assignment sem escopo).
-- Usada para identidade compartilhada do profissional (CRM/nome), que não pertence a uma única unidade.
CREATE OR REPLACE FUNCTION fn_person_global_writable(p_person UUID, p_recurso TEXT, p_acao TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF p_person IS NULL OR fn_resolve_person_id() IS NULL OR p_person <> fn_resolve_person_id() THEN
    RETURN false;
  END IF;
  RETURN fn_is_root(p_person)
    OR EXISTS (
      SELECT 1
      FROM role_assignments ra
      JOIN role_permissions rp ON rp.role_id = ra.role_id AND rp.ativo = true
      JOIN permissions p
        ON p.id = rp.permission_id AND p.ativo = true
       AND p.recurso = p_recurso AND p.acao = p_acao
      WHERE ra.person_id = p_person AND ra.ativo = true
        AND ra.tenant_id IS NULL AND ra.unit_id IS NULL
    );
END;
$$;

REVOKE ALL ON FUNCTION fn_person_unit_readable(UUID, UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION fn_person_unit_writable(UUID, UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION fn_person_tenant_readable(UUID, UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION fn_person_tenant_writable(UUID, UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION fn_person_global_writable(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fn_person_unit_readable(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION fn_person_unit_writable(UUID, UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION fn_person_tenant_readable(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION fn_person_tenant_writable(UUID, UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION fn_person_global_writable(UUID, TEXT, TEXT) TO authenticated;

-- ============================================
-- specialties: catálogo de especialidades (tenant NULL = global)
-- Não confundir com CBO (ocupação) nem SIGTAP (procedimento).
-- ============================================
CREATE TABLE IF NOT EXISTS specialties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  nome_norm TEXT GENERATED ALWAYS AS (upper(nome)) STORED,
  codigo_cbo TEXT,
  codigo_sigtap TEXT,
  cor VARCHAR(7) DEFAULT '#1f4e78',
  icone TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_specialties_tenant ON specialties(tenant_id);
CREATE INDEX IF NOT EXISTS idx_specialties_nome_norm ON specialties(nome_norm);
CREATE INDEX IF NOT EXISTS idx_specialties_ativo ON specialties(ativo);

DROP TRIGGER IF EXISTS specialties_updated_at ON specialties;
CREATE TRIGGER specialties_updated_at
BEFORE UPDATE ON specialties FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

-- ============================================
-- medical_professionals: profissional médico vinculado a people
-- CRM/UF reais; UNIQUE(crm,crm_uf) evita duplicidade; NULL = pendente (não inventado).
-- Não possui tenant/unit próprios: o escopo vem dos vínculos em medical_professional_units.
-- ============================================
CREATE TABLE IF NOT EXISTS medical_professionals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  crm TEXT,
  crm_uf CHAR(2),
  nome_social TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (crm, crm_uf),
  CONSTRAINT uq_medprof_person UNIQUE (person_id)   -- 1 profissional por pessoa (People-First).
);
CREATE INDEX IF NOT EXISTS idx_medprof_person ON medical_professionals(person_id);
CREATE INDEX IF NOT EXISTS idx_medprof_crm ON medical_professionals(crm);
CREATE INDEX IF NOT EXISTS idx_medprof_ativo ON medical_professionals(ativo);
-- Reaplicável APENAS para bases existentes: adiciona a constraint nomeada se faltar.
-- Em instalação nova a constraint já vem no CREATE TABLE, então este bloco não faz nada
-- (evita UNIQUE duplicado / índice redundante).
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    WHERE c.conrelid = 'medical_professionals'::regclass
      AND c.contype = 'u'
      AND pg_get_constraintdef(c.oid) LIKE '%(person_id)%'
  ) THEN
    ALTER TABLE medical_professionals ADD CONSTRAINT uq_medprof_person UNIQUE (person_id);
  END IF;
END $$;

DROP TRIGGER IF EXISTS medical_professionals_updated_at ON medical_professionals;
CREATE TRIGGER medical_professionals_updated_at
BEFORE UPDATE ON medical_professionals FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

-- ============================================
-- medical_professional_specialties: N:N médico <-> especialidade
-- ============================================
CREATE TABLE IF NOT EXISTS medical_professional_specialties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medical_professional_id UUID NOT NULL REFERENCES medical_professionals(id) ON DELETE CASCADE,
  specialty_id UUID NOT NULL REFERENCES specialties(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (medical_professional_id, specialty_id)
);
CREATE INDEX IF NOT EXISTS idx_medprof_spec_med ON medical_professional_specialties(medical_professional_id);
CREATE INDEX IF NOT EXISTS idx_medprof_spec_spec ON medical_professional_specialties(specialty_id);

-- ============================================
-- medical_professional_units: onde o médico atua (tenant via units)
-- ============================================
CREATE TABLE IF NOT EXISTS medical_professional_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medical_professional_id UUID NOT NULL REFERENCES medical_professionals(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (medical_professional_id, unit_id)
);
CREATE INDEX IF NOT EXISTS idx_medprof_unit_med ON medical_professional_units(medical_professional_id);
CREATE INDEX IF NOT EXISTS idx_medprof_unit_unit ON medical_professional_units(unit_id);
CREATE INDEX IF NOT EXISTS idx_medprof_unit_ativo ON medical_professional_units(ativo);

DROP TRIGGER IF EXISTS medical_professional_units_updated_at ON medical_professional_units;
CREATE TRIGGER medical_professional_units_updated_at
BEFORE UPDATE ON medical_professional_units FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

-- ============================================
-- RLS fail-closed (padrão CORE). Escopo por UNIDADE do registro.
-- ============================================
ALTER TABLE specialties ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_professional_specialties ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_professional_units ENABLE ROW LEVEL SECURITY;

-- specialties: leitura global (tenant NULL) ou por membership/ROOT.
DROP POLICY IF EXISTS specialties_read ON specialties;
CREATE POLICY specialties_read ON specialties
  FOR SELECT TO authenticated
  USING (
    fn_is_root(fn_resolve_person_id())
    OR specialties.tenant_id IS NULL
    OR fn_person_tenant_readable(fn_resolve_person_id(), specialties.tenant_id, 'specialties')
  );
DROP POLICY IF EXISTS specialties_insert ON specialties;
CREATE POLICY specialties_insert ON specialties
  FOR INSERT TO authenticated
  WITH CHECK (
    fn_is_root(fn_resolve_person_id())
    OR (tenant_id IS NOT NULL AND fn_person_tenant_writable(fn_resolve_person_id(), tenant_id, 'specialties', 'create'))
  );
DROP POLICY IF EXISTS specialties_update ON specialties;
CREATE POLICY specialties_update ON specialties
  FOR UPDATE TO authenticated
  USING (
    fn_is_root(fn_resolve_person_id())
    OR (tenant_id IS NOT NULL AND fn_person_tenant_writable(fn_resolve_person_id(), tenant_id, 'specialties', 'update'))
  )
  WITH CHECK (
    fn_is_root(fn_resolve_person_id())
    OR (tenant_id IS NOT NULL AND fn_person_tenant_writable(fn_resolve_person_id(), tenant_id, 'specialties', 'update'))
  );
DROP POLICY IF EXISTS specialties_delete ON specialties;
CREATE POLICY specialties_delete ON specialties
  FOR DELETE TO authenticated
  USING (
    fn_is_root(fn_resolve_person_id())
    OR (tenant_id IS NOT NULL AND fn_person_tenant_writable(fn_resolve_person_id(), tenant_id, 'specialties', 'delete'))
  );

-- medical_professionals: acesso por UNIDADE do profissional (não por membership do médico).
-- INSERT não tem unidade na linha (vínculo é tabela separada): exige capacidade global 'medicos.create'.
DROP POLICY IF EXISTS medprof_read ON medical_professionals;
CREATE POLICY medprof_read ON medical_professionals
  FOR SELECT TO authenticated
  USING (
    fn_is_root(fn_resolve_person_id())
    OR EXISTS (
      SELECT 1
      FROM medical_professional_units mpu
      WHERE mpu.medical_professional_id = medical_professionals.id
        AND mpu.ativo = true
        AND fn_person_unit_readable(fn_resolve_person_id(), mpu.unit_id, 'medicos')
    )
  );
DROP POLICY IF EXISTS medprof_insert ON medical_professionals;
CREATE POLICY medprof_insert ON medical_professionals
  FOR INSERT TO authenticated
  WITH CHECK (fn_is_root(fn_resolve_person_id()));

-- Cadastro transacional (profissional + 1º vínculo) com contrato de ADMISSÃO explícito:
--  * caller precisa de 'medicos.create' escopado à unidade alvo (ou ROOT);
--  * pessoa MEMBRO do tenant da unidade: admissão permitida (create na unidade basta);
--  * pessoa SEM membership (nova): exige autorização de admissão em nível de TENANT
--    ('medicos.create' com role_assignment unit NULL, ou ROOT) — não basta "não ter outro tenant";
--  * pessoa vinculada a OUTRO tenant: recusada (exige fluxo formal de compartilhamento).
CREATE OR REPLACE FUNCTION fn_create_medical_professional(
  p_person UUID, p_crm TEXT, p_crm_uf CHAR(2), p_nome_social TEXT, p_unit_id UUID
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_id UUID;
  v_caller UUID := fn_resolve_person_id();
  v_tenant UUID;
  v_membro BOOLEAN;
  v_outro BOOLEAN;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'sem identidade autenticada'; END IF;
  IF p_person IS NULL OR p_unit_id IS NULL THEN RAISE EXCEPTION 'person e unit são obrigatórios'; END IF;
  IF NOT EXISTS (SELECT 1 FROM people pe WHERE pe.id = p_person AND pe.ativo = true) THEN
    RAISE EXCEPTION 'pessoa inexistente ou inativa';
  END IF;
  SELECT tenant_id INTO v_tenant FROM units WHERE id = p_unit_id;
  IF v_tenant IS NULL THEN RAISE EXCEPTION 'unidade % inexistente', p_unit_id; END IF;
  IF NOT fn_person_unit_writable(v_caller, p_unit_id, 'medicos', 'create') THEN
    RAISE EXCEPTION 'sem permissão para cadastrar médico na unidade %', p_unit_id;
  END IF;

  SELECT EXISTS (SELECT 1 FROM tenant_memberships tm
                 WHERE tm.person_id = p_person AND tm.ativo = true AND tm.tenant_id = v_tenant) INTO v_membro;
  SELECT EXISTS (SELECT 1 FROM tenant_memberships tm
                 WHERE tm.person_id = p_person AND tm.ativo = true AND tm.tenant_id <> v_tenant) INTO v_outro;

  IF v_outro THEN
    RAISE EXCEPTION 'pessoa % já vinculada a outro tenant; use fluxo de compartilhamento', p_person;
  END IF;

  -- Pessoa NOVA (sem membership no tenant): exige autorização de admissão em nível de TENANT.
  IF NOT v_membro AND NOT fn_person_tenant_writable(v_caller, v_tenant, 'medicos', 'create') THEN
    RAISE EXCEPTION 'sem autorização para admitir pessoa nova % no tenant %', p_person, v_tenant;
  END IF;

  INSERT INTO medical_professionals (person_id, crm, crm_uf, nome_social)
  VALUES (p_person, p_crm, p_crm_uf, p_nome_social) RETURNING id INTO v_id;
  INSERT INTO medical_professional_units (medical_professional_id, unit_id, ativo) VALUES (v_id, p_unit_id, true);
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION fn_create_medical_professional(UUID, TEXT, CHAR(2), TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fn_create_medical_professional(UUID, TEXT, CHAR(2), TEXT, UUID) TO authenticated;

-- Adiciona vínculo a OUTRA unidade REUTILIZANDO o profissional existente (não duplica CRM).
-- Contrato de admissão explícito: vincular um profissional JÁ EXISTENTE a uma unidade exige que
-- a PESSOA desse profissional seja MEMBRO ATIVO do tenant da unidade alvo. Não basta "não ter outro
-- tenant": isso impede associar arbitrariamente pessoas conhecidas só pelo UUID.
-- (Admissão inicial de pessoa nova ocorre em fn_create_medical_professional.)
-- Caller precisa de 'medicos.update' escopado à unidade alvo (ou ROOT).
CREATE OR REPLACE FUNCTION fn_add_medical_professional_unit(
  p_medical_professional_id UUID, p_unit_id UUID
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_caller UUID := fn_resolve_person_id();
  v_link UUID;
  v_tenant UUID;
  v_person UUID;
  v_membro BOOLEAN;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'sem identidade autenticada'; END IF;
  IF NOT EXISTS (SELECT 1 FROM medical_professionals mp WHERE mp.id = p_medical_professional_id) THEN
    RAISE EXCEPTION 'profissional % inexistente', p_medical_professional_id;
  END IF;
  SELECT tenant_id INTO v_tenant FROM units WHERE id = p_unit_id;
  IF v_tenant IS NULL THEN RAISE EXCEPTION 'unidade % inexistente', p_unit_id; END IF;
  IF NOT fn_person_unit_writable(v_caller, p_unit_id, 'medicos', 'update') THEN
    RAISE EXCEPTION 'sem permissão para vincular médico na unidade %', p_unit_id;
  END IF;

  -- Vínculo exigido: a pessoa do profissional deve ser MEMBRO ATIVO do tenant da unidade alvo.
  SELECT person_id INTO v_person FROM medical_professionals WHERE id = p_medical_professional_id;
  SELECT EXISTS (SELECT 1 FROM tenant_memberships tm
                 WHERE tm.person_id = v_person AND tm.ativo = true AND tm.tenant_id = v_tenant) INTO v_membro;
  IF NOT v_membro THEN
    RAISE EXCEPTION 'profissional % (pessoa %) não é membro ativo do tenant %; use fluxo formal de admissão/compartilhamento',
      p_medical_professional_id, v_person, v_tenant;
  END IF;

  INSERT INTO medical_professional_units (medical_professional_id, unit_id, ativo)
  VALUES (p_medical_professional_id, p_unit_id, true)
  ON CONFLICT (medical_professional_id, unit_id) DO UPDATE SET ativo = true
  RETURNING id INTO v_link;
  RETURN v_link;
END;
$$;
REVOKE ALL ON FUNCTION fn_add_medical_professional_unit(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fn_add_medical_professional_unit(UUID, UUID) TO authenticated;
DROP POLICY IF EXISTS medprof_update ON medical_professionals;
CREATE POLICY medprof_update ON medical_professionals
  FOR UPDATE TO authenticated
  USING (fn_is_root(fn_resolve_person_id())
    OR fn_person_global_writable(fn_resolve_person_id(), 'medicos', 'update'))
  WITH CHECK (fn_is_root(fn_resolve_person_id())
    OR fn_person_global_writable(fn_resolve_person_id(), 'medicos', 'update'));
DROP POLICY IF EXISTS medprof_delete ON medical_professionals;
CREATE POLICY medprof_delete ON medical_professionals
  FOR DELETE TO authenticated
  USING (fn_is_root(fn_resolve_person_id())
    OR fn_person_global_writable(fn_resolve_person_id(), 'medicos', 'delete'));

-- medical_professional_specialties: escopo pela unidade do profissional.
DROP POLICY IF EXISTS medspec_read ON medical_professional_specialties;
CREATE POLICY medspec_read ON medical_professional_specialties
  FOR SELECT TO authenticated
  USING (
    fn_is_root(fn_resolve_person_id())
    OR EXISTS (
      SELECT 1
      FROM medical_professional_units mpu
      WHERE mpu.medical_professional_id = medical_professional_specialties.medical_professional_id
        AND mpu.ativo = true
        AND fn_person_unit_readable(fn_resolve_person_id(), mpu.unit_id, 'medicos')
    )
  );
DROP POLICY IF EXISTS medspec_insert ON medical_professional_specialties;
CREATE POLICY medspec_insert ON medical_professional_specialties
  FOR INSERT TO authenticated
  WITH CHECK (
    fn_is_root(fn_resolve_person_id())
    OR EXISTS (
      SELECT 1
      FROM medical_professional_units mpu
      JOIN units u ON u.id = mpu.unit_id
      JOIN specialties s ON s.id = medical_professional_specialties.specialty_id
      WHERE mpu.medical_professional_id = medical_professional_specialties.medical_professional_id
        AND mpu.ativo = true
        AND (s.tenant_id IS NULL OR s.tenant_id = u.tenant_id)
        AND fn_person_unit_writable(fn_resolve_person_id(), mpu.unit_id, 'medicos', 'update')
    )
  );
DROP POLICY IF EXISTS medspec_update ON medical_professional_specialties;
CREATE POLICY medspec_update ON medical_professional_specialties
  FOR UPDATE TO authenticated
  USING (
    fn_is_root(fn_resolve_person_id())
    OR EXISTS (
      SELECT 1
      FROM medical_professional_units mpu
      JOIN units u ON u.id = mpu.unit_id
      JOIN specialties s ON s.id = medical_professional_specialties.specialty_id
      WHERE mpu.medical_professional_id = medical_professional_specialties.medical_professional_id
        AND mpu.ativo = true
        AND (s.tenant_id IS NULL OR s.tenant_id = u.tenant_id)
        AND fn_person_unit_writable(fn_resolve_person_id(), mpu.unit_id, 'medicos', 'update')
    )
  )
  WITH CHECK (
    fn_is_root(fn_resolve_person_id())
    OR EXISTS (
      SELECT 1
      FROM medical_professional_units mpu
      JOIN units u ON u.id = mpu.unit_id
      JOIN specialties s ON s.id = medical_professional_specialties.specialty_id
      WHERE mpu.medical_professional_id = medical_professional_specialties.medical_professional_id
        AND mpu.ativo = true
        AND (s.tenant_id IS NULL OR s.tenant_id = u.tenant_id)
        AND fn_person_unit_writable(fn_resolve_person_id(), mpu.unit_id, 'medicos', 'update')
    )
  );
DROP POLICY IF EXISTS medspec_delete ON medical_professional_specialties;
CREATE POLICY medspec_delete ON medical_professional_specialties
  FOR DELETE TO authenticated
  USING (
    fn_is_root(fn_resolve_person_id())
    OR EXISTS (
      SELECT 1
      FROM medical_professional_units mpu
      WHERE mpu.medical_professional_id = medical_professional_specialties.medical_professional_id
        AND mpu.ativo = true
        AND fn_person_unit_writable(fn_resolve_person_id(), mpu.unit_id, 'medicos', 'delete')
    )
  );

-- medical_professional_units: isolamento pela PRÓPRIA unidade da linha.
-- INSERT/UPDATE diretos são ROOT-ONLY: associação/reativação deve passar por
-- fn_create_medical_professional / fn_add_medical_professional_unit (validam pertencimento),
-- senão um gestor poderia contornar a validação de compartilhamento conhecendo o UUID.
DROP POLICY IF EXISTS medunit_read ON medical_professional_units;
CREATE POLICY medunit_read ON medical_professional_units
  FOR SELECT TO authenticated
  USING (
    fn_is_root(fn_resolve_person_id())
    OR fn_person_unit_readable(fn_resolve_person_id(), medical_professional_units.unit_id, 'medicos')
  );
DROP POLICY IF EXISTS medunit_insert ON medical_professional_units;
CREATE POLICY medunit_insert ON medical_professional_units
  FOR INSERT TO authenticated
  WITH CHECK (fn_is_root(fn_resolve_person_id()));
DROP POLICY IF EXISTS medunit_update ON medical_professional_units;
CREATE POLICY medunit_update ON medical_professional_units
  FOR UPDATE TO authenticated
  USING (fn_is_root(fn_resolve_person_id()))
  WITH CHECK (fn_is_root(fn_resolve_person_id()));
DROP POLICY IF EXISTS medunit_delete ON medical_professional_units;
CREATE POLICY medunit_delete ON medical_professional_units
  FOR DELETE TO authenticated
  USING (
    fn_is_root(fn_resolve_person_id())
    OR fn_person_unit_writable(fn_resolve_person_id(), medical_professional_units.unit_id, 'medicos', 'delete')
  );

COMMENT ON TABLE specialties IS 'Catálogo de especialidades (não é CBO nem SIGTAP). tenant NULL = global.';
COMMENT ON TABLE medical_professionals IS 'Profissional médico vinculado a people; CRM/UF reais, NULL = pendente.';
COMMENT ON TABLE medical_professional_specialties IS 'N:N médico-especialidade.';
COMMENT ON TABLE medical_professional_units IS 'Unidades onde o médico atua; fonte do escopo de isolamento por unidade.';