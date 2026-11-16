-- 001_core_people.sql
-- Gate 1 - CORE: Pessoas (People-First) e vínculo de identidade com auth.users
-- Referência: não reutiliza cegamente as migrations 001-010 anteriores.
-- Não executar no Supabase sem autorização do Gate 1.

-- Extensões
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================
-- people: identidade canônica da pessoa física
-- Independente de cargo, papel ou acesso ao sistema.
-- ============================================
CREATE TABLE people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  nome_norm TEXT GENERATED ALWAYS AS (upper(nome)) STORED,
  email TEXT UNIQUE,
  telefone TEXT,
  documento TEXT,
  data_nascimento DATE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_people_nome ON people (nome);
CREATE INDEX idx_people_email ON people (email);
CREATE INDEX idx_people_ativo ON people (ativo);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION trg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER people_updated_at
BEFORE UPDATE ON people FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

-- ============================================
-- auth_identity_links: mapeamento confiável 1:1
-- auth.users.id (Supabase Auth) -> people.id
-- Uma pessoa autenticada tem exatamente um link.
-- Sem link, não há acesso ao sistema (fail-closed).
-- ============================================
CREATE TABLE auth_identity_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID NOT NULL UNIQUE, -- id do auth.users (Supabase Auth)
  person_id UUID NOT NULL UNIQUE REFERENCES people(id) ON DELETE CASCADE,
  email_verificado BOOLEAN NOT NULL DEFAULT false,
  vinculado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_auth_identity_links_auth_user ON auth_identity_links (auth_user_id);
CREATE INDEX idx_auth_identity_links_person ON auth_identity_links (person_id);

CREATE TRIGGER auth_identity_links_updated_at
BEFORE UPDATE ON auth_identity_links FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

-- Comentário de documento (sem código arbitrário)
COMMENT ON TABLE people IS 'Identidade canônica de pessoa física (People-First).';
COMMENT ON TABLE auth_identity_links IS 'Vínculo confiável 1:1 entre auth.users (Supabase Auth) e people.';
