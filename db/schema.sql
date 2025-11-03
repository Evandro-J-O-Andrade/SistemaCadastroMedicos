-- Esquema PostgreSQL para SistemaCadastroMedicos
-- Requisitos: EXTENSION unaccent, pg_trgm (para buscas)
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- TABELAS PRINCIPAIS
CREATE TABLE especialidades (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  cor VARCHAR(7),
  icone TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE medicos (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  nome_norm TEXT, -- normalizado para pesquisa
  crm VARCHAR(50),
  especialidade_id INTEGER REFERENCES especialidades(id) ON DELETE SET NULL,
  observacao TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE plantao (
  id SERIAL PRIMARY KEY,
  medico_id INTEGER REFERENCES medicos(id) ON DELETE SET NULL,
  medico_nome TEXT,
  crm VARCHAR(50),
  especialidade_id INTEGER REFERENCES especialidades(id) ON DELETE SET NULL,
  especialidade_nome TEXT,
  data DATE NOT NULL,
  hora TIME,
  quantidade INTEGER DEFAULT 1,
  periodo TEXT, -- Manhã | Tarde/Noite | Indefinido
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ÍNDICES (melhoram desempenho de filtros/relatórios)
CREATE INDEX idx_plantao_data ON plantao (data);
CREATE INDEX idx_plantao_medico ON plantao (medico_id);
CREATE INDEX idx_plantao_esp ON plantao (especialidade_id);
CREATE INDEX idx_plantao_crm ON plantao (crm);
CREATE INDEX idx_medicos_nome_norm ON medicos USING gin (nome_norm gin_trgm_ops);
CREATE INDEX idx_medicos_crm ON medicos (crm);

-- FUNÇÕES ÚTEIS
-- normaliza texto: remove acentos, múltiplos espaços e uppercase
CREATE OR REPLACE FUNCTION fn_normalize_text(txt TEXT) RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT upper(regexp_replace(unaccent(coalesce($1,'')),'\s+',' ','g'));
$$;

-- calcula período a partir da hora
CREATE OR REPLACE FUNCTION fn_compute_periodo(h TIME) RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN h IS NULL THEN 'Indefinido'
    WHEN h < time '12:00' THEN 'Manhã'
    ELSE 'Tarde/Noite'
  END;
$$;

-- Trigger para normalizar nome do médico antes de insert/update
CREATE OR REPLACE FUNCTION trg_medicos_normalize() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.nome_norm := fn_normalize_text(NEW.nome);
  RETURN NEW;
END;
$$;

CREATE TRIGGER medicos_before_ins_up
BEFORE INSERT OR UPDATE ON medicos
FOR EACH ROW EXECUTE FUNCTION trg_medicos_normalize();

-- Trigger para preencher periodo e nomes derivados em plantao
CREATE OR REPLACE FUNCTION trg_plantao_before_ins_up() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  esp_id INTEGER;
  med_id INTEGER;
BEGIN
  -- calcula periodo
  NEW.periodo := fn_compute_periodo(NEW.hora);

  -- se especialidade_id não preenchido, tenta achar por nome e seta id
  IF NEW.especialidade_id IS NULL AND NEW.especialidade_nome IS NOT NULL THEN
    SELECT id INTO esp_id FROM especialidades WHERE lower(nome)=lower(NEW.especialidade_nome) LIMIT 1;
    IF esp_id IS NOT NULL THEN
      NEW.especialidade_id := esp_id;
    END IF;
  END IF;

  -- se medico_id não preenchido, tenta achar por crm
  IF NEW.medico_id IS NULL AND NEW.crm IS NOT NULL THEN
    SELECT id INTO med_id FROM medicos WHERE crm = NEW.crm LIMIT 1;
    IF med_id IS NOT NULL THEN
      NEW.medico_id := med_id;
    END IF;
  END IF;

  -- garante que nomes de exibição estão consistentes
  IF NEW.medico_id IS NOT NULL THEN
    SELECT nome INTO NEW.medico_nome FROM medicos WHERE id = NEW.medico_id;
  END IF;
  IF NEW.especialidade_id IS NOT NULL THEN
    SELECT nome INTO NEW.especialidade_nome FROM especialidades WHERE id = NEW.especialidade_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER plantao_before_ins_up
BEFORE INSERT OR UPDATE ON plantao
FOR EACH ROW EXECUTE FUNCTION trg_plantao_before_ins_up();

-- VIEW de consolidação: agrega por médico + data + especialidade
CREATE OR REPLACE VIEW vw_consolidado_medico_dia_esp AS
SELECT
  COALESCE(p.medico_id, 0) AS medico_id,
  COALESCE(p.medico_nome, '—') AS medico_nome,
  COALESCE(p.especialidade_id, 0) AS especialidade_id,
  COALESCE(p.especialidade_nome, '—') AS especialidade_nome,
  p.data::date AS data,
  SUM(p.quantidade) AS atendimentos
FROM plantao p
GROUP BY COALESCE(p.medico_id,0), COALESCE(p.medico_nome,'—'), COALESCE(p.especialidade_id,0), COALESCE(p.especialidade_nome,'—'), p.data;

-- VIEW para relatórios mensais / anuais
CREATE OR REPLACE VIEW vw_relatorio_mensal AS
SELECT
  date_trunc('month', data)::date AS mes,
  especialidade_nome,
  SUM(quantidade) AS total_atendimentos
FROM plantao
GROUP BY date_trunc('month', data), especialidade_nome
ORDER BY mes DESC;

CREATE OR REPLACE VIEW vw_relatorio_anual AS
SELECT
  date_trunc('year', data)::date AS ano,
  especialidade_nome,
  SUM(quantidade) AS total_atendimentos
FROM plantao
GROUP BY date_trunc('year', data), especialidade_nome
ORDER BY ano DESC;

-- MATERIALIZED VIEW para acelerar relatórios pesados (opcional)
CREATE MATERIALIZED VIEW mv_consolidado_total AS
SELECT data, especialidade_nome, SUM(quantidade) AS total_atendimentos
FROM plantao
GROUP BY data, especialidade_nome
WITH NO DATA;

-- PROCEDURES / FUNÇÕES para inserção e relatórios
-- procedure para inserir plantão (faz upsert de medico/especialidade se necessário)
CREATE OR REPLACE FUNCTION sp_upsert_medico(p_nome TEXT, p_crm TEXT, p_esp_nome TEXT)
RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE
  m_id INTEGER;
  esp_id INTEGER;
BEGIN
  -- garante especialidade
  IF p_esp_nome IS NOT NULL THEN
    SELECT id INTO esp_id FROM especialidades WHERE lower(nome)=lower(p_esp_nome) LIMIT 1;
    IF esp_id IS NULL THEN
      INSERT INTO especialidades(nome) VALUES (p_esp_nome) RETURNING id INTO esp_id;
    END IF;
  END IF;

  -- upsert medico por crm se fornecido
  IF p_crm IS NOT NULL AND p_crm <> '' THEN
    SELECT id INTO m_id FROM medicos WHERE crm = p_crm LIMIT 1;
  END IF;

  IF m_id IS NULL THEN
    SELECT id INTO m_id FROM medicos WHERE lower(nome)=lower(p_nome) LIMIT 1;
  END IF;

  IF m_id IS NULL THEN
    INSERT INTO medicos(nome, crm, especialidade_id) VALUES (p_nome, p_crm, esp_id) RETURNING id INTO m_id;
  ELSE
    UPDATE medicos SET nome = COALESCE(p_nome, nome), crm = COALESCE(p_crm, crm), especialidade_id = COALESCE(esp_id, especialidade_id) WHERE id = m_id;
  END IF;

  RETURN m_id;
END;
$$;

CREATE OR REPLACE FUNCTION sp_insert_plantao(
  p_nome TEXT,
  p_crm TEXT,
  p_esp_nome TEXT,
  p_data DATE,
  p_hora TIME,
  p_quantidade INTEGER DEFAULT 1,
  p_source TEXT DEFAULT NULL
) RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE
  m_id INTEGER;
  esp_id INTEGER;
  new_id INTEGER;
BEGIN
  m_id := sp_upsert_medico(p_nome, p_crm, p_esp_nome);

  IF p_esp_nome IS NOT NULL THEN
    SELECT id INTO esp_id FROM especialidades WHERE lower(nome)=lower(p_esp_nome) LIMIT 1;
  END IF;

  INSERT INTO plantao(medico_id, medico_nome, crm, especialidade_id, especialidade_nome, data, hora, quantidade, source)
  VALUES (m_id, p_nome, p_crm, esp_id, p_esp_nome, p_data, p_hora, p_quantidade, p_source)
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

-- Função que retorna relatório com filtros (usada pela app)
CREATE OR REPLACE FUNCTION fn_get_relatorio(
  p_data_inicio DATE,
  p_data_fim DATE,
  p_medico TEXT DEFAULT NULL,
  p_crm TEXT DEFAULT NULL,
  p_especialidade TEXT DEFAULT NULL,
  p_hora_de TIME DEFAULT NULL,
  p_hora_ate TIME DEFAULT NULL
) RETURNS TABLE (
  medico_nome TEXT,
  crm TEXT,
  especialidade_nome TEXT,
  data DATE,
  hora TIME,
  atendimentos INTEGER
) LANGUAGE sql AS $$
  SELECT p.medico_nome, p.crm, p.especialidade_nome, p.data, p.hora, SUM(p.quantidade) AS atendimentos
  FROM plantao p
  WHERE (p.data BETWEEN p_data_inicio AND p_data_fim)
    AND (p_medico IS NULL OR lower(p.medico_nome) LIKE '%' || lower(p_medico) || '%')
    AND (p_crm IS NULL OR p.crm = p_crm)
    AND (p_especialidade IS NULL OR lower(p.especialidade_nome) LIKE '%' || lower(p_especialidade) || '%')
    AND (p_hora_de IS NULL OR p.hora >= p_hora_de)
    AND (p_hora_ate IS NULL OR p.hora <= p_hora_ate)
  GROUP BY p.medico_nome, p.crm, p.especialidade_nome, p.data, p.hora
  ORDER BY p.data, p.medico_nome;
$$;

-- Trigger para atualizar materialized view automaticamente (opcional)
CREATE OR REPLACE FUNCTION trg_refresh_mv_on_plantao() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM 1; -- placeholder; refreshing MV on every insert may be heavy
  RETURN NEW;
END;
$$;

-- NOTAS:
-- - Rode: REFRESH MATERIALIZED VIEW mv_consolidado_total; quando precisar atualizar.
-- - A app pode chamar fn_get_relatorio(...) para obter os dados consolidados que já respeitam filtros.
-- - Para melhorar pesquisas por partes do nome, use indeks gin_trgm_ops (já criado).