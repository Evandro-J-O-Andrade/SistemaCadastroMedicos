-- 002_tenants_units.sql
-- Gate 1 - CORE: Organizações (tenants) e unidades organizacionais
-- Multi-tenant, multiunidade. Não executar no Supabase sem autorização.

-- ============================================
-- tenants: organizações clientes do SaaS
-- ============================================
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  cnpj TEXT,
  email TEXT,
  telefone TEXT,
  endereco TEXT,
  plano TEXT NOT NULL DEFAULT 'free',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tenants_slug ON tenants (slug);
CREATE INDEX idx_tenants_ativo ON tenants (ativo);

CREATE TRIGGER tenants_updated_at
BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

-- ============================================
-- units: unidades organizacionais dentro de um tenant
-- ============================================
CREATE TABLE units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  codigo TEXT,
  endereco TEXT,
  telefone TEXT,
  email TEXT,
  responsavel_nome TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, tenant_id)
);

CREATE INDEX idx_units_tenant ON units (tenant_id);
CREATE INDEX idx_units_ativo ON units (ativo);
CREATE INDEX idx_units_tenant_ativo ON units (tenant_id, ativo);

CREATE TRIGGER units_updated_at
BEFORE UPDATE ON units FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

-- ============================================
-- tenant_settings: configurações por tenant (chave-valor JSONB)
-- Usado pelo motor Database-Driven UI/UX para tema, idioma, módulos habilitados, etc.
-- ============================================
CREATE TABLE tenant_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  chave TEXT NOT NULL,
  valor JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, chave)
);

CREATE INDEX idx_tenant_settings_tenant ON tenant_settings (tenant_id);

CREATE TRIGGER tenant_settings_updated_at
BEFORE UPDATE ON tenant_settings FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

COMMENT ON TABLE tenants IS 'Organizações clientes do SaaS (multi-tenant).';
COMMENT ON TABLE units IS 'Unidades organizacionais dentro de um tenant.';
COMMENT ON TABLE tenant_settings IS 'Configurações por tenant (tema, idioma, módulos habilitados, etc.).';
