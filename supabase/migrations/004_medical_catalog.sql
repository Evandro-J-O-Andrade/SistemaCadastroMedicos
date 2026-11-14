-- 004_medical_catalog.sql
-- Profissionais médicos, registros profissionais (CRM/UF) e catálogo de especialidades

-- Especialidades institucionais (catalogo)
CREATE TABLE specialties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL, -- NULL = especialidade global
  nome TEXT NOT NULL,
  nome_norm TEXT GENERATED ALWAYS AS (upper(unaccent(nome))) STORED,
  codigo_cbo TEXT,
  codigo_sigtap TEXT,
  cor VARCHAR(7) DEFAULT '#1f4e78',
  icone TEXT DEFAULT 'FaUserMd',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_specialties_tenant ON specialties (tenant_id);
CREATE INDEX idx_specialties_nome_norm ON specialties USING gin (nome_norm gin_trgm_ops);
CREATE INDEX idx_specialties_ativo ON specialties (ativo);

-- Profissionais médicos (vinculados a people)
CREATE TABLE medical_professionals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  crm TEXT,
  crm_uf CHAR(2),
  nome_social TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (crm, crm_uf)
);

CREATE INDEX idx_medical_professionals_person ON medical_professionals (person_id);
CREATE INDEX idx_medical_professionals_crm ON medical_professionals (crm);
CREATE INDEX idx_medical_professionals_ativo ON medical_professionals (ativo);

-- Vínculos N:N entre médicos e especialidades (um médico atua em múltiplas)
CREATE TABLE medical_professional_specialties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medical_professional_id UUID NOT NULL REFERENCES medical_professionals(id) ON DELETE CASCADE,
  specialty_id UUID NOT NULL REFERENCES specialties(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (medical_professional_id, specialty_id)
);

CREATE INDEX idx_medprof_spec_medprof ON medical_professional_specialties (medical_professional_id);
CREATE INDEX idx_medprof_spec_spec ON medical_professional_specialties (specialty_id);

-- Vínculos médico <-> unidade (onde o médico atua)
CREATE TABLE medical_professional_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medical_professional_id UUID NOT NULL REFERENCES medical_professionals(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (medical_professional_id, unit_id)
);

CREATE INDEX idx_medprof_unit_medprof ON medical_professional_units (medical_professional_id);
CREATE INDEX idx_medprof_unit_unit ON medical_professional_units (unit_id);
CREATE INDEX idx_medprof_unit_ativo ON medical_professional_units (ativo);

CREATE TRIGGER specialties_updated_at
BEFORE UPDATE ON specialties FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

CREATE TRIGGER medical_professionals_updated_at
BEFORE UPDATE ON medical_professionals FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

CREATE TRIGGER medical_professional_units_updated_at
BEFORE UPDATE ON medical_professional_units FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
