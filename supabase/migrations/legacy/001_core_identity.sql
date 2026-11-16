-- 001_core_identity.sql
-- Camada CORE: identidade universal (people), organizações (tenants), configurações de tenant
-- People = identidade canônica de uma pessoa, independentemente de cargo ou acesso ao sistema

-- Extensões úteis
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Tabela canônica de pessoas (identidade universal, sem papel fixo)
CREATE TABLE people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  nome_norm TEXT GENERATED ALWAYS AS (upper(unaccent(nome))) STORED,
  email TEXT UNIQUE,
  telefone TEXT,
  documento TEXT,
  data_nascimento DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice para busca fuzzy por nome
CREATE INDEX idx_people_nome_norm ON people USING gin (nome_norm gin_trgm_ops);
CREATE INDEX idx_people_email ON people (email);

-- Organizações clientes do SaaS (multi-tenant)
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  cnpj TEXT,
  email TEXT,
  telefone TEXT,
  endereco TEXT,
  plano TEXT DEFAULT 'free',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tenants_slug ON tenants (slug);
CREATE INDEX idx_tenants_ativo ON tenants (ativo);

-- Configurações por tenant (tema, idioma, moeda, módulos habilitados, etc.)
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

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION trg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Aplicar trigger nas tabelas core
CREATE TRIGGER people_updated_at
BEFORE UPDATE ON people FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

CREATE TRIGGER tenants_updated_at
BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

CREATE TRIGGER tenant_settings_updated_at
BEFORE UPDATE ON tenant_settings FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
