-- 005_collection_shifts.sql
-- Levantamentos 12x36: turnos da equipe de TI, lotes de preenchimento, entradas de produção
--
-- Separação de três conceitos:
-- 1. collection_shift = turno da pessoa que FAZ o levantamento (TI operador)
-- 2. collection_batch = sessão de preenchimento em andamento (aberta/encerrada)
-- 3. production_entry = quantidade de atendimentos de um médico num período apurado

-- Turnos de levantamento da equipe TI (regime 12x36)
CREATE TABLE collection_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE, -- operador de TI responsável
  turno TEXT NOT NULL CHECK (turno IN ('diurno', 'noturno')), -- diurno 07-19, noturno 19-07
  data_referencia DATE NOT NULL, -- data de referência do turno operacional
  inicio_em TIMESTAMPTZ NOT NULL, -- início real do turno (inclui fuso da unidade)
  fim_em TIMESTAMPTZ, -- fim real (null enquanto aberto)
  status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'encerrado', 'renovado')),
  observacao TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (fim_em IS NULL OR fim_em > inicio_em)
);

CREATE INDEX idx_collection_shifts_tenant ON collection_shifts (tenant_id);
CREATE INDEX idx_collection_shifts_unit ON collection_shifts (unit_id);
CREATE INDEX idx_collection_shifts_person ON collection_shifts (person_id);
CREATE INDEX idx_collection_shifts_status ON collection_shifts (status);
CREATE INDEX idx_collection_shifts_data_ref ON collection_shifts (data_referencia);
CREATE INDEX idx_collection_shifts_turno ON collection_shifts (turno);

-- Lote de preenchimento (sessão em andamento de um turno)
CREATE TABLE collection_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_shift_id UUID NOT NULL REFERENCES collection_shifts(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'conferindo', 'encerrado', 'cancelado')),
  total_medicos INTEGER DEFAULT 0,
  total_atendimentos INTEGER DEFAULT 0,
  fechado_em TIMESTAMPTZ,
  fechado_por UUID REFERENCES people(id),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_collection_batches_shift ON collection_batches (collection_shift_id);
CREATE INDEX idx_collection_batches_status ON collection_batches (status);

-- Entrada de produção médica (quantidade levantada)
CREATE TABLE production_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_batch_id UUID NOT NULL REFERENCES collection_batches(id) ON DELETE CASCADE,
  medical_professional_id UUID NOT NULL REFERENCES medical_professionals(id),
  specialty_id UUID REFERENCES specialties(id), -- especialidade atuante naquele lançamento (pode diferir da principal)
  periodo_medico TEXT NOT NULL CHECK (periodo_medico IN ('diurno', 'noturno')), -- turno médico apurado
  data_referencia DATE NOT NULL, -- data de referência da produção médica (pode ser dia anterior para noturno)
  quantidade INTEGER NOT NULL DEFAULT 0 CHECK (quantidade >= 0),
  observacao TEXT,
  origem TEXT NOT NULL DEFAULT 'manual' CHECK (origem IN ('manual', 'importacao', 'integracao')),
  origem_referencia TEXT, -- ref externa (ex: id do CMDPro, linha do CSV)
  criado_por UUID NOT NULL REFERENCES people(id),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_production_entries_batch ON production_entries (collection_batch_id);
CREATE INDEX idx_production_entries_prof ON production_entries (medical_professional_id);
CREATE INDEX idx_production_entries_spec ON production_entries (specialty_id);
CREATE INDEX idx_production_entries_periodo ON production_entries (periodo_medico, data_referencia);
CREATE INDEX idx_production_entries_criado_em ON production_entries (criado_em);

CREATE TRIGGER collection_shifts_updated_at
BEFORE UPDATE ON collection_shifts FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

CREATE TRIGGER collection_batches_updated_at
BEFORE UPDATE ON collection_batches FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

CREATE TRIGGER production_entries_updated_at
BEFORE UPDATE ON production_entries FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

-- Restrição: não permite batch aberto duplicado para o mesmo shift
CREATE UNIQUE INDEX ux_collection_batches_shift_aberto
ON collection_batches (collection_shift_id)
WHERE status = 'aberto';

-- Restrição: não permite shift aberto duplicado para mesma unidade/turno/data
CREATE UNIQUE INDEX ux_collection_shifts_unit_turno_data_aberto
ON collection_shifts (unit_id, turno, data_referencia)
WHERE status = 'aberto';
