-- 003_memberships.sql
-- Gate 1 - CORE: Vínculos de pessoa com tenants e unidades
-- Controla quem pertence a onde, com status ativo/inativo.
-- Não executar no Supabase sem autorização.

-- ============================================
-- tenant_memberships: vínculo pessoa -> tenant
-- ============================================
CREATE TABLE tenant_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (person_id, tenant_id)
);

CREATE INDEX idx_tenant_memberships_person ON tenant_memberships (person_id);
CREATE INDEX idx_tenant_memberships_tenant ON tenant_memberships (tenant_id);
CREATE INDEX idx_tenant_memberships_ativo ON tenant_memberships (ativo);
CREATE INDEX idx_tenant_memberships_person_tenant_ativo
  ON tenant_memberships (person_id, tenant_id, ativo);

CREATE TRIGGER tenant_memberships_updated_at
BEFORE UPDATE ON tenant_memberships FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

-- ============================================
-- unit_memberships: vínculo pessoa -> unidade (dentro de um tenant)
-- tenant_id é desnormalizado propositalmente para evitar joins cruzados
-- e garantir que a unidade pertença ao tenant do contexto de segurança.
-- ============================================
CREATE TABLE unit_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (person_id, unit_id),
  CONSTRAINT fk_unit_memberships_unit_tenant
    FOREIGN KEY (unit_id, tenant_id)
    REFERENCES units(id, tenant_id)
    ON DELETE CASCADE
);

CREATE INDEX idx_unit_memberships_person ON unit_memberships (person_id);
CREATE INDEX idx_unit_memberships_unit ON unit_memberships (unit_id);
CREATE INDEX idx_unit_memberships_tenant ON unit_memberships (tenant_id);
CREATE INDEX idx_unit_memberships_ativo ON unit_memberships (ativo);
CREATE INDEX idx_unit_memberships_person_tenant_ativo
  ON unit_memberships (person_id, tenant_id, ativo);

CREATE TRIGGER unit_memberships_updated_at
BEFORE UPDATE ON unit_memberships FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

COMMENT ON TABLE tenant_memberships IS 'Vínculo de pessoa com tenant (multi-tenant).';
COMMENT ON TABLE unit_memberships IS 'Vínculo de pessoa com unidade dentro de um tenant (multiunidade).';
