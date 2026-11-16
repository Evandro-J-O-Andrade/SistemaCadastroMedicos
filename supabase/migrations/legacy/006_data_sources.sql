-- 006_data_sources.sql
-- Integração e rastreabilidade de origem dos dados (CMDPro, CSV, manual)

-- Fontes de dados externas/internas
CREATE TABLE data_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nome TEXT NOT NULL, -- CMDPro, Heal, CSV Import, Manual
  tipo TEXT NOT NULL CHECK (tipo IN ('manual', 'arquivo', 'api', 'integracao')),
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_data_sources_tenant ON data_sources (tenant_id);

-- Referências de fonte por entrada (rastreabilidade detalhada)
CREATE TABLE source_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_entry_id UUID NOT NULL REFERENCES production_entries(id) ON DELETE CASCADE,
  data_source_id UUID NOT NULL REFERENCES data_sources(id),
  valor_referencia TEXT, -- valor lido na fonte (ex: "38 atendimentos" no CMDPro)
  coletado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  observacao TEXT
);

CREATE INDEX idx_source_references_entry ON source_references (production_entry_id);
CREATE INDEX idx_source_references_source ON source_references (data_source_id);

-- Lotes de importação (CSV/XLSX)
CREATE TABLE import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  arquivo_nome TEXT,
  status TEXT NOT NULL DEFAULT 'processando' CHECK (status IN ('processando', 'concluido', 'com_erros', 'cancelado')),
  total_linhas INTEGER DEFAULT 0,
  linhas_sucesso INTEGER DEFAULT 0,
  linhas_erro INTEGER DEFAULT 0,
  relatorio_erros JSONB DEFAULT '[]',
  importado_por UUID REFERENCES people(id),
  importado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_import_batches_tenant ON import_batches (tenant_id);
CREATE INDEX idx_import_batches_status ON import_batches (status);

CREATE TRIGGER data_sources_updated_at
BEFORE UPDATE ON data_sources FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
