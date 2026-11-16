-- 010_reporting_views.sql
-- Views e funções SQL para relatórios e consolidação de produção médica

-- View: consolidação de produção por médico + dia + especialidade + período médico
CREATE OR REPLACE VIEW vw_producao_consolidada AS
SELECT
  pe.medical_professional_id,
  mp.nome AS medico_nome,
  mp.crm,
  mp.crm_uf,
  pe.specialty_id,
  s.nome AS especialidade_nome,
  pe.periodo_medico,
  pe.data_referencia,
  SUM(pe.quantidade) AS total_atendimentos,
  COUNT(*) AS total_lancamentos,
  MAX(pe.criado_em) AS ultimo_lancamento
FROM production_entries pe
JOIN medical_professionals mp ON mp.id = pe.medical_professional_id
LEFT JOIN specialties s ON s.id = pe.specialty_id
GROUP BY
  pe.medical_professional_id,
  mp.nome,
  mp.crm,
  mp.crm_uf,
  pe.specialty_id,
  s.nome,
  pe.periodo_medico,
  pe.data_referencia;

-- View: plantões ativos e lotes em andamento (para a tela operacional)
CREATE OR REPLACE VIEW vw_levantamentos_ativos AS
SELECT
  cs.id AS shift_id,
  cs.turno,
  cs.data_referencia,
  cs.inicio_em,
  cs.fim_em,
  cs.status AS shift_status,
  p.id AS person_id,
  p.nome AS operador_nome,
  u.id AS unit_id,
  u.nome AS unidade_nome,
  cb.id AS batch_id,
  cb.status AS batch_status,
  cb.total_medicos,
  cb.total_atendimentos,
  cb.fechado_em
FROM collection_shifts cs
JOIN people p ON p.id = cs.person_id
JOIN units u ON u.id = cs.unit_id
LEFT JOIN collection_batches cb ON cb.collection_shift_id = cs.id
WHERE cs.status = 'aberto'
  AND (cb.status = 'aberto' OR cb.status IS NULL);

-- View: relatório por período com filtros (usado pelo painel de gestores)
CREATE OR REPLACE VIEW vw_relatorio_producao AS
SELECT
  pe.data_referencia,
  pe.periodo_medico,
  pe.medical_professional_id,
  mp.nome AS medico_nome,
  mp.crm,
  pe.specialty_id,
  s.nome AS especialidade_nome,
  u.id AS unit_id,
  u.nome AS unidade_nome,
  t.id AS tenant_id,
  pe.quantidade,
  pe.origem,
  pe.criado_em,
  pc.nome AS criado_por_nome
FROM production_entries pe
JOIN medical_professionals mp ON mp.id = pe.medical_professional_id
LEFT JOIN specialties s ON s.id = pe.specialty_id
JOIN collection_batches cb ON cb.id = pe.collection_batch_id
JOIN collection_shifts cs ON cs.id = cb.collection_shift_id
JOIN units u ON u.id = cs.unit_id
JOIN tenants t ON t.id = cs.tenant_id
JOIN people pc ON pc.id = pe.criado_por;

-- Função: obter produção para um turno específico (diurno/noturno)
CREATE OR REPLACE FUNCTION fn_producao_por_turno(
  p_data_referencia DATE,
  p_periodo_medico TEXT,
  p_unit_id UUID DEFAULT NULL
) RETURNS TABLE (
  medico_nome TEXT,
  crm TEXT,
  especialidade_nome TEXT,
  quantidade INTEGER,
  data_referencia DATE
) LANGUAGE sql STABLE AS $$
  SELECT
    mp.nome AS medico_nome,
    mp.crm,
    s.nome AS especialidade_nome,
    SUM(pe.quantidade) AS quantidade,
    pe.data_referencia
  FROM production_entries pe
  JOIN medical_professionals mp ON mp.id = pe.medical_professional_id
  LEFT JOIN specialties s ON s.id = pe.specialty_id
  JOIN collection_batches cb ON cb.id = pe.collection_batch_id
  JOIN collection_shifts cs ON cs.id = cb.collection_shift_id
  WHERE pe.data_referencia = p_data_referencia
    AND pe.periodo_medico = p_periodo_medico
    AND (p_unit_id IS NULL OR cs.unit_id = p_unit_id)
  GROUP BY mp.nome, mp.crm, s.nome, pe.data_referencia
  ORDER BY mp.nome;
$$;

-- Função: obter plantão ativo para uma unidade/turno/data
CREATE OR REPLACE FUNCTION fn_shift_aberto_para_unidade(
  p_unit_id UUID,
  p_turno TEXT,
  p_data_referencia DATE
) RETURNS TABLE (
  shift_id UUID,
  status TEXT,
  inicio_em TIMESTAMPTZ,
  fim_em TIMESTAMPTZ,
  operador_nome TEXT,
  batch_id UUID,
  batch_status TEXT
) LANGUAGE sql STABLE AS $$
  SELECT
    cs.id AS shift_id,
    cs.status,
    cs.inicio_em,
    cs.fim_em,
    p.nome AS operador_nome,
    cb.id AS batch_id,
    cb.status AS batch_status
  FROM collection_shifts cs
  JOIN people p ON p.id = cs.person_id
  LEFT JOIN collection_batches cb ON cb.collection_shift_id = cs.id AND cb.status = 'aberto'
  WHERE cs.unit_id = p_unit_id
    AND cs.turno = p_turno
    AND cs.data_referencia = p_data_referencia
    AND cs.status = 'aberto';
$$;

-- Função: encerrar um batch e consolidar totais
CREATE OR REPLACE FUNCTION fn_encerrar_batch(
  p_batch_id UUID,
  p_fechado_por UUID
) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  UPDATE collection_batches
  SET status = 'encerrado',
      fechado_em = now(),
      fechado_por = p_fechado_por,
      total_medicos = (
        SELECT COUNT(DISTINCT medical_professional_id)
        FROM production_entries
        WHERE collection_batch_id = p_batch_id
      ),
      total_atendimentos = (
        SELECT COALESCE(SUM(quantidade), 0)
        FROM production_entries
        WHERE collection_batch_id = p_batch_id
      ),
      updated_at = now()
  WHERE id = p_batch_id;

  INSERT INTO audit_events (
    tenant_id,
    person_id,
    evento,
    entidade,
    entidade_id,
    dados_novos,
    criado_em
  )
  SELECT
    cs.tenant_id,
    p_fechado_por,
    'batch.encerrado',
    'collection_batches',
    p_batch_id,
    jsonb_build_object('status', 'encerrado', 'fechado_em', now(), 'fechado_por', p_fechado_por),
    now()
  FROM collection_batches cb
  JOIN collection_shifts cs ON cs.id = cb.collection_shift_id
  WHERE cb.id = p_batch_id;
END;
$$;

-- Índices adicionais para relatórios
CREATE INDEX idx_vw_producao_data_referencia ON production_entries (data_referencia);
CREATE INDEX idx_vw_producao_prof_periodo ON production_entries (medical_professional_id, periodo_medico, data_referencia);
