-- 002_tenancy.sql
-- Contexto de tenancy: vínculos pessoas <-> tenants, unidades, vínculos pessoas <-> unidades

-- Vínculo pessoa <-> tenant (uma pessoa pode pertencer a múltiplos tenants)
CREATE TABLE tenant_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  papel_inicial TEXT, -- papel sugerido no tenant (não substitui RBAC)
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (person_id, tenant_id)
);

CREATE INDEX idx_tenant_memberships_person ON tenant_memberships (person_id);
CREATE INDEX idx_tenant_memberships_tenant ON tenant_memberships (tenant_id);
CREATE INDEX idx_tenant_memberships_ativo ON tenant_memberships (ativo);

-- Unidades (hospital, PA, UPA, UBS, filial)
CREATE TABLE units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  codigo TEXT,
  tipo TEXT, -- HOSPITAL, PA, UPA, UBS, FILIAL
  endereco TEXT,
  cidade TEXT,
  uf CHAR(2),
  telefone TEXT,
  email TEXT,
  fuso_horario TEXT DEFAULT 'America/Sao_Paulo',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_units_tenant ON units (tenant_id);
CREATE INDEX idx_units_ativo ON units (ativo);
CREATE INDEX idx_units_codigo ON units (codigo);

-- Vínculo pessoa <-> unidade (uma pessoa atua em múltiplas unidades)
CREATE TABLE unit_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (person_id, unit_id)
);

CREATE INDEX idx_unit_memberships_person ON unit_memberships (person_id);
CREATE INDEX idx_unit_memberships_unit ON unit_memberships (unit_id);
CREATE INDEX idx_unit_memberships_ativo ON unit_memberships (ativo);

CREATE TRIGGER tenant_memberships_updated_at
BEFORE UPDATE ON tenant_memberships FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

CREATE TRIGGER units_updated_at
BEFORE UPDATE ON units FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

CREATE TRIGGER unit_memberships_updated_at
BEFORE UPDATE ON unit_memberships FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
