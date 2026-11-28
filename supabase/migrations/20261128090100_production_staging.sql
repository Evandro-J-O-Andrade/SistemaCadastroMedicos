-- 20261128090100_production_staging.sql
-- CHECK BOULER 24H / Database-Driven — Produção médica + staging de importação.
-- PREPARADA PARA REVISÃO. NÃO EXECUTAR NO SUPABASE SEM AUTORIZAÇÃO ESPECÍFICA.
-- Depende de: tenants, units, people, medical_professionals, specialties,
--             trg_set_updated_at(), fn_is_root, fn_resolve_person_id, fn_person_has_permission,
--             fn_person_unit_readable/writable, fn_person_tenant_readable/writable (090000).
-- Preserva proveniência (arquivo/linha) e mantém não vinculados em staging (não associa por semelhança).
--
-- CORREÇÕES (GO técnico):
--  * import_batches usa updated_at (compatível com trg_set_updated_at do CORE).
--  * import_batches/production_staging recebem tenant_id/unit_id (isolamento entre organizações).
--  * Idempotência por (tenant_id, hash) — não colide entre tenants.
--  * production_entries exige vínculo de unidade e valida consistência tenant/unidade/profissional (trigger).
--  * RLS por unidade do registro (read/write separados), não apenas por tenant.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================
-- import_batches: proveniência de cada importação (idempotência por tenant + hash do arquivo)
-- updated_at alinhado ao trigger CORE (trg_set_updated_at escreve NEW.updated_at).
-- tenant_id NOT NULL: todo lote pertence a uma organização (ROOT importa em nome de um tenant).
-- unit_id NULL: lote pode cobrir várias unidades; quando informado, restringe a uma unidade.
-- ============================================
CREATE TABLE IF NOT EXISTS import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
  arquivo TEXT NOT NULL,
  hash TEXT NOT NULL,                      -- hash do arquivo-fonte (idempotência por tenant)
  tipo TEXT NOT NULL DEFAULT 'producao',   -- producao | medicos
  total_linhas INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'staging' CHECK (status IN ('staging', 'validated', 'imported', 'failed')),
  criado_por UUID REFERENCES people(id) ON DELETE SET NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_import_batches_tenant_hash UNIQUE (tenant_id, hash)
);
CREATE INDEX IF NOT EXISTS idx_import_batches_hash ON import_batches(hash);
CREATE INDEX IF NOT EXISTS idx_import_batches_tenant ON import_batches(tenant_id);
CREATE INDEX IF NOT EXISTS idx_import_batches_unit ON import_batches(unit_id);
CREATE INDEX IF NOT EXISTS idx_import_batches_status ON import_batches(status);

DROP TRIGGER IF EXISTS import_batches_updated_at ON import_batches;
CREATE TRIGGER import_batches_updated_at
BEFORE UPDATE ON import_batches FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

-- ============================================
-- production_entries: lançamentos consolidados (vinculados a médico real e unidade)
-- Regra 12x36 é domínio; aqui persistimos turno/data/unidade/quantidade.
-- tenant_id/unit_id/profissional NOT NULL: consolidado exige vínculo real (não vinculados vão a staging).
-- ============================================
CREATE TABLE IF NOT EXISTS production_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
  medical_professional_id UUID NOT NULL REFERENCES medical_professionals(id) ON DELETE RESTRICT,
  specialty_id UUID REFERENCES specialties(id) ON DELETE RESTRICT,
  data DATE NOT NULL,
  turno TEXT NOT NULL CHECK (turno IN ('Diurno', 'Noturno')),
  setor TEXT,
  quantidade INTEGER NOT NULL DEFAULT 0 CHECK (quantidade >= 0),
  origem_arquivo TEXT,
  origem_sheet TEXT,
  origem_linha INTEGER,
  import_batch_id UUID REFERENCES import_batches(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'importado' CHECK (status IN ('importado', 'conferido', 'cancelado')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_prod_unit_tenant FOREIGN KEY (unit_id, tenant_id)
    REFERENCES units(id, tenant_id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_prod_entries_med ON production_entries(medical_professional_id);
CREATE INDEX IF NOT EXISTS idx_prod_entries_data ON production_entries(data);
CREATE INDEX IF NOT EXISTS idx_prod_entries_tenant_unit ON production_entries(tenant_id, unit_id);
CREATE INDEX IF NOT EXISTS idx_prod_entries_batch ON production_entries(import_batch_id);

DROP TRIGGER IF EXISTS production_entries_updated_at ON production_entries;
CREATE TRIGGER production_entries_updated_at
BEFORE UPDATE ON production_entries FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

-- ============================================
-- production_staging: registros NÃO vinculados (placeholder/identidade a conferir)
-- Preserva doctor_key e review_status; nunca vincula por semelhança.
-- tenant_id NOT NULL / unit_id NULL: isolamento por organização; unidade pode ser indefinida na origem.
-- ============================================
CREATE TABLE IF NOT EXISTS production_staging (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
  import_batch_id UUID REFERENCES import_batches(id) ON DELETE CASCADE,
  sheet TEXT,
  source_row INTEGER,
  data DATE,
  turno TEXT,
  setor TEXT,
  doctor_name_raw TEXT,
  doctor_key TEXT,
  attendances INTEGER,
  doctor_in_aux BOOLEAN,
  review_status TEXT,
  resolvido BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_prod_staging_tenant ON production_staging(tenant_id);
CREATE INDEX IF NOT EXISTS idx_prod_staging_batch ON production_staging(import_batch_id);
CREATE INDEX IF NOT EXISTS idx_prod_staging_resolvido ON production_staging(resolvido);
CREATE INDEX IF NOT EXISTS idx_prod_staging_key ON production_staging(doctor_key);

-- ============================================
-- Invariante de consistência: tenant/unidade/profissional/especialidade coerentes.
-- Impede misturar contextos (unidade de outro tenant, profissional sem vínculo, especialidade de outro tenant).
-- ============================================
CREATE OR REPLACE FUNCTION fn_prod_entries_consistency()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  -- 1) Unidade pertence ao tenant informado (FK composta já garante; reforço explícito).
  IF NOT EXISTS (SELECT 1 FROM units u WHERE u.id = NEW.unit_id AND u.tenant_id = NEW.tenant_id) THEN
    RAISE EXCEPTION 'production_entries: unidade % não pertence ao tenant %', NEW.unit_id, NEW.tenant_id;
  END IF;

  -- 2) Profissional tem vínculo ATIVO com a unidade informada.
  IF NOT EXISTS (
    SELECT 1 FROM medical_professional_units mpu
    WHERE mpu.medical_professional_id = NEW.medical_professional_id
      AND mpu.unit_id = NEW.unit_id
      AND mpu.ativo = true
  ) THEN
    RAISE EXCEPTION 'production_entries: profissional % sem vínculo ativo na unidade %', NEW.medical_professional_id, NEW.unit_id;
  END IF;

  -- 3) Especialidade (quando informada) é global ou do mesmo tenant.
  IF NEW.specialty_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM specialties s
    WHERE s.id = NEW.specialty_id AND (s.tenant_id IS NULL OR s.tenant_id = NEW.tenant_id)
  ) THEN
    RAISE EXCEPTION 'production_entries: especialidade % incompatível com o tenant %', NEW.specialty_id, NEW.tenant_id;
  END IF;

  -- 4) Lote de origem (quando informado) deve pertencer ao MESMO tenant e ser compatível com a unidade.
  IF NEW.import_batch_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM import_batches b
    WHERE b.id = NEW.import_batch_id
      AND b.tenant_id = NEW.tenant_id
      AND (b.unit_id IS NULL OR b.unit_id = NEW.unit_id)
  ) THEN
    RAISE EXCEPTION 'production_entries: lote % incompatível com tenant %/unidade %', NEW.import_batch_id, NEW.tenant_id, NEW.unit_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prod_entries_consistency ON production_entries;
CREATE TRIGGER trg_prod_entries_consistency
BEFORE INSERT OR UPDATE ON production_entries
FOR EACH ROW EXECUTE FUNCTION fn_prod_entries_consistency();

REVOKE ALL ON FUNCTION fn_prod_entries_consistency() FROM PUBLIC;

-- Consistência tenant/unidade para LOTES (INSERT e UPDATE): unidade deve pertencer ao tenant.
-- Proteção de reparent: lote já referenciado não pode mudar tenant/unit (OLD.id É o id do lote).
CREATE OR REPLACE FUNCTION fn_batch_unit_consistency()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW.unit_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM units u WHERE u.id = NEW.unit_id AND u.tenant_id = NEW.tenant_id) THEN
    RAISE EXCEPTION '%: unidade % não pertence ao tenant %', TG_TABLE_NAME, NEW.unit_id, NEW.tenant_id;
  END IF;
  -- Impede "reparentar" lote já referenciado (tenant/unit imutáveis após uso).
  IF TG_OP = 'UPDATE' AND (NEW.tenant_id IS DISTINCT FROM OLD.tenant_id OR NEW.unit_id IS DISTINCT FROM OLD.unit_id) THEN
    IF EXISTS (SELECT 1 FROM production_entries pe WHERE pe.import_batch_id = OLD.id)
       OR EXISTS (SELECT 1 FROM production_staging ps WHERE ps.import_batch_id = OLD.id) THEN
      RAISE EXCEPTION '%: lote % já referenciado; tenant/unit não podem mudar', TG_TABLE_NAME, OLD.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_import_batches_consistency ON import_batches;
CREATE TRIGGER trg_import_batches_consistency
BEFORE INSERT OR UPDATE ON import_batches
FOR EACH ROW EXECUTE FUNCTION fn_batch_unit_consistency();

-- Consistência tenant/unidade para STAGING (INSERT e UPDATE): unidade deve pertencer ao tenant.
-- NÃO usa OLD.id como lote (OLD.id aqui é o id do registro de staging, não do lote).
CREATE OR REPLACE FUNCTION fn_staging_unit_consistency()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW.unit_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM units u WHERE u.id = NEW.unit_id AND u.tenant_id = NEW.tenant_id) THEN
    RAISE EXCEPTION '%: unidade % não pertence ao tenant %', TG_TABLE_NAME, NEW.unit_id, NEW.tenant_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_production_staging_consistency ON production_staging;
CREATE TRIGGER trg_production_staging_consistency
BEFORE INSERT OR UPDATE ON production_staging
FOR EACH ROW EXECUTE FUNCTION fn_staging_unit_consistency();

-- Integridade do lote no staging: import_batch_id deve ser do MESMO tenant (e unidade compatível).
CREATE OR REPLACE FUNCTION fn_staging_batch_consistency()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW.import_batch_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM import_batches b
    WHERE b.id = NEW.import_batch_id
      AND b.tenant_id = NEW.tenant_id
      AND (b.unit_id IS NULL OR b.unit_id = NEW.unit_id)
  ) THEN
    RAISE EXCEPTION 'production_staging: lote % incompatível com tenant %/unidade %', NEW.import_batch_id, NEW.tenant_id, NEW.unit_id;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_staging_batch_consistency ON production_staging;
CREATE TRIGGER trg_staging_batch_consistency
BEFORE INSERT OR UPDATE ON production_staging
FOR EACH ROW EXECUTE FUNCTION fn_staging_batch_consistency();
REVOKE ALL ON FUNCTION fn_staging_batch_consistency() FROM PUBLIC;
REVOKE ALL ON FUNCTION fn_staging_unit_consistency() FROM PUBLIC;

REVOKE ALL ON FUNCTION fn_batch_unit_consistency() FROM PUBLIC;

-- ============================================
-- RLS fail-closed (escopo por unidade/tenant do registro)
-- ============================================
ALTER TABLE import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_staging ENABLE ROW LEVEL SECURITY;

-- import_batches: leitura/escrita por unidade (quando definida) ou por tenant.
DROP POLICY IF EXISTS batches_read ON import_batches;
CREATE POLICY batches_read ON import_batches
  FOR SELECT TO authenticated
  USING (
    fn_is_root(fn_resolve_person_id())
    OR (unit_id IS NOT NULL AND fn_person_unit_readable(fn_resolve_person_id(), unit_id, 'producao'))
    OR (unit_id IS NULL AND fn_person_tenant_readable(fn_resolve_person_id(), tenant_id, 'producao'))
  );
DROP POLICY IF EXISTS batches_insert ON import_batches;
CREATE POLICY batches_insert ON import_batches
  FOR INSERT TO authenticated
  WITH CHECK (
    fn_is_root(fn_resolve_person_id())
    OR (unit_id IS NOT NULL AND fn_person_unit_writable(fn_resolve_person_id(), unit_id, 'producao', 'create'))
    OR (unit_id IS NULL AND fn_person_tenant_writable(fn_resolve_person_id(), tenant_id, 'producao', 'create'))
  );
DROP POLICY IF EXISTS batches_update ON import_batches;
CREATE POLICY batches_update ON import_batches
  FOR UPDATE TO authenticated
  USING (
    fn_is_root(fn_resolve_person_id())
    OR (unit_id IS NOT NULL AND fn_person_unit_writable(fn_resolve_person_id(), unit_id, 'producao', 'update'))
    OR (unit_id IS NULL AND fn_person_tenant_writable(fn_resolve_person_id(), tenant_id, 'producao', 'update'))
  )
  WITH CHECK (
    fn_is_root(fn_resolve_person_id())
    OR (unit_id IS NOT NULL AND fn_person_unit_writable(fn_resolve_person_id(), unit_id, 'producao', 'update'))
    OR (unit_id IS NULL AND fn_person_tenant_writable(fn_resolve_person_id(), tenant_id, 'producao', 'update'))
  );
DROP POLICY IF EXISTS batches_delete ON import_batches;
CREATE POLICY batches_delete ON import_batches
  FOR DELETE TO authenticated
  USING (
    fn_is_root(fn_resolve_person_id())
    OR (unit_id IS NOT NULL AND fn_person_unit_writable(fn_resolve_person_id(), unit_id, 'producao', 'delete'))
    OR (unit_id IS NULL AND fn_person_tenant_writable(fn_resolve_person_id(), tenant_id, 'producao', 'delete'))
  );

-- production_entries: leitura/escrita pela UNIDADE do lançamento.
DROP POLICY IF EXISTS prod_read ON production_entries;
CREATE POLICY prod_read ON production_entries
  FOR SELECT TO authenticated
  USING (
    fn_is_root(fn_resolve_person_id())
    OR fn_person_unit_readable(fn_resolve_person_id(), unit_id, 'producao')
  );
DROP POLICY IF EXISTS prod_insert ON production_entries;
CREATE POLICY prod_insert ON production_entries
  FOR INSERT TO authenticated
  WITH CHECK (
    fn_is_root(fn_resolve_person_id())
    OR fn_person_unit_writable(fn_resolve_person_id(), unit_id, 'producao', 'create')
  );
DROP POLICY IF EXISTS prod_update ON production_entries;
CREATE POLICY prod_update ON production_entries
  FOR UPDATE TO authenticated
  USING (
    fn_is_root(fn_resolve_person_id())
    OR fn_person_unit_writable(fn_resolve_person_id(), unit_id, 'producao', 'update')
  )
  WITH CHECK (
    fn_is_root(fn_resolve_person_id())
    OR fn_person_unit_writable(fn_resolve_person_id(), unit_id, 'producao', 'update')
  );
DROP POLICY IF EXISTS prod_delete ON production_entries;
CREATE POLICY prod_delete ON production_entries
  FOR DELETE TO authenticated
  USING (
    fn_is_root(fn_resolve_person_id())
    OR fn_person_unit_writable(fn_resolve_person_id(), unit_id, 'producao', 'delete')
  );

-- production_staging: área de conferência; leitura/escrita por unidade (quando definida) ou tenant.
DROP POLICY IF EXISTS staging_read ON production_staging;
CREATE POLICY staging_read ON production_staging
  FOR SELECT TO authenticated
  USING (
    fn_is_root(fn_resolve_person_id())
    OR (unit_id IS NOT NULL AND fn_person_unit_readable(fn_resolve_person_id(), unit_id, 'producao'))
    OR (unit_id IS NULL AND fn_person_tenant_readable(fn_resolve_person_id(), tenant_id, 'producao'))
  );
DROP POLICY IF EXISTS staging_insert ON production_staging;
CREATE POLICY staging_insert ON production_staging
  FOR INSERT TO authenticated
  WITH CHECK (
    fn_is_root(fn_resolve_person_id())
    OR (unit_id IS NOT NULL AND fn_person_unit_writable(fn_resolve_person_id(), unit_id, 'producao', 'create'))
    OR (unit_id IS NULL AND fn_person_tenant_writable(fn_resolve_person_id(), tenant_id, 'producao', 'create'))
  );
DROP POLICY IF EXISTS staging_update ON production_staging;
CREATE POLICY staging_update ON production_staging
  FOR UPDATE TO authenticated
  USING (
    fn_is_root(fn_resolve_person_id())
    OR (unit_id IS NOT NULL AND fn_person_unit_writable(fn_resolve_person_id(), unit_id, 'producao', 'update'))
    OR (unit_id IS NULL AND fn_person_tenant_writable(fn_resolve_person_id(), tenant_id, 'producao', 'update'))
  )
  WITH CHECK (
    fn_is_root(fn_resolve_person_id())
    OR (unit_id IS NOT NULL AND fn_person_unit_writable(fn_resolve_person_id(), unit_id, 'producao', 'update'))
    OR (unit_id IS NULL AND fn_person_tenant_writable(fn_resolve_person_id(), tenant_id, 'producao', 'update'))
  );
DROP POLICY IF EXISTS staging_delete ON production_staging;
CREATE POLICY staging_delete ON production_staging
  FOR DELETE TO authenticated
  USING (
    fn_is_root(fn_resolve_person_id())
    OR (unit_id IS NOT NULL AND fn_person_unit_writable(fn_resolve_person_id(), unit_id, 'producao', 'delete'))
    OR (unit_id IS NULL AND fn_person_tenant_writable(fn_resolve_person_id(), tenant_id, 'producao', 'delete'))
  );

COMMENT ON TABLE import_batches IS 'Proveniência e idempotência de importações (tenant_id + hash). updated_at compatível com CORE.';
COMMENT ON TABLE production_entries IS 'Produção consolidada: vínculo real (profissional+unidade); consistência tenant/unidade/especialidade por trigger.';
COMMENT ON TABLE production_staging IS 'Registros não vinculados (placeholder/identidade a conferir); isolados por tenant; não associa por semelhança.';