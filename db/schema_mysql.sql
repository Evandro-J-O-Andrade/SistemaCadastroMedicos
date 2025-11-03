-- Esquema MySQL (compatível com phpMyAdmin) para SistemaCadastroMedicos
-- Observações:
--  - Execute em MySQL 5.7+ / 8.0+
--  - Ajuste nomes de usuário/charset conforme seu ambiente
--  - Use este arquivo via phpMyAdmin -> SQL ou via mysql CLI

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS plantao;
DROP TABLE IF EXISTS medicos;
DROP TABLE IF EXISTS especialidades;
DROP TABLE IF EXISTS usuarios;

CREATE TABLE especialidades (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(255) NOT NULL UNIQUE,
  cor VARCHAR(7),
  icone VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE medicos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  nome_search VARCHAR(255) DEFAULT NULL,
  crm VARCHAR(50),
  especialidade_id INT DEFAULT NULL,
  observacao TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_medico_esp FOREIGN KEY (especialidade_id) REFERENCES especialidades(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE plantao (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  medico_id INT DEFAULT NULL,
  medico_nome VARCHAR(255),
  crm VARCHAR(50),
  especialidade_id INT DEFAULT NULL,
  especialidade_nome VARCHAR(255),
  data DATE NOT NULL,
  hora TIME DEFAULT NULL,
  quantidade INT DEFAULT 1,
  periodo ENUM('Manhã','Tarde/Noite','Indefinido') DEFAULT 'Indefinido',
  source VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_plantao_medico FOREIGN KEY (medico_id) REFERENCES medicos(id) ON DELETE SET NULL,
  CONSTRAINT fk_plantao_esp FOREIGN KEY (especialidade_id) REFERENCES especialidades(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  senha_hash VARCHAR(255) NOT NULL,
  role ENUM('admin','user') DEFAULT 'user',
  ativo TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Índices auxiliares
CREATE INDEX idx_plantao_data ON plantao (data);
CREATE INDEX idx_plantao_medico ON plantao (medico_id);
CREATE INDEX idx_plantao_esp ON plantao (especialidade_id);
CREATE INDEX idx_plantao_crm ON plantao (crm);
CREATE INDEX idx_medicos_crm ON medicos (crm);
ALTER TABLE medicos ADD FULLTEXT INDEX ft_medicos_nome (nome);

SET FOREIGN_KEY_CHECKS = 1;

-- FUNÇÃO: remove acentos (implementação por REPLACE — determinística)
DELIMITER //
DROP FUNCTION IF EXISTS fn_remove_accents;
//
CREATE FUNCTION fn_remove_accents(s VARCHAR(255)) RETURNS VARCHAR(255)
DETERMINISTIC
BEGIN
  IF s IS NULL THEN
    RETURN NULL;
  END IF;
  DECLARE r VARCHAR(255) DEFAULT s;
  SET r = REPLACE(r, 'á', 'a'); SET r = REPLACE(r, 'à', 'a'); SET r = REPLACE(r, 'ã', 'a'); SET r = REPLACE(r, 'â', 'a'); SET r = REPLACE(r, 'Á', 'A');
  SET r = REPLACE(r, 'é', 'e'); SET r = REPLACE(r, 'è', 'e'); SET r = REPLACE(r, 'ê', 'e'); SET r = REPLACE(r, 'É', 'E');
  SET r = REPLACE(r, 'í', 'i'); SET r = REPLACE(r, 'ì', 'i'); SET r = REPLACE(r, 'î', 'i'); SET r = REPLACE(r, 'Í', 'I');
  SET r = REPLACE(r, 'ó', 'o'); SET r = REPLACE(r, 'ò', 'o'); SET r = REPLACE(r, 'õ', 'o'); SET r = REPLACE(r, 'ô', 'o'); SET r = REPLACE(r, 'Ó', 'O');
  SET r = REPLACE(r, 'ú', 'u'); SET r = REPLACE(r, 'ù', 'u'); SET r = REPLACE(r, 'û', 'u'); SET r = REPLACE(r, 'Ú', 'U');
  SET r = REPLACE(r, 'ç', 'c'); SET r = REPLACE(r, 'Ç', 'C');
  -- Maiúsculas/acentos remanescentes
  SET r = REPLACE(r, 'ä', 'a'); SET r = REPLACE(r, 'ë', 'e'); SET r = REPLACE(r, 'ï', 'i'); SET r = REPLACE(r, 'ö', 'o'); SET r = REPLACE(r, 'ü', 'u');
  -- Remover múltiplos espaços
  SET r = REGEXP_REPLACE(r, '\\s+', ' ');
  RETURN r;
END;
//
DELIMITER ;

-- FUNÇÃO: calcula período a partir da hora
DELIMITER //
DROP FUNCTION IF EXISTS fn_compute_periodo;
//
CREATE FUNCTION fn_compute_periodo(h TIME) RETURNS VARCHAR(20)
DETERMINISTIC
BEGIN
  IF h IS NULL THEN
    RETURN 'Indefinido';
  ELSEIF h < '12:00:00' THEN
    RETURN 'Manhã';
  ELSE
    RETURN 'Tarde/Noite';
  END IF;
END;
//
DELIMITER ;

-- TRIGGERS: manter campos auxiliares atualizados
DELIMITER //
DROP TRIGGER IF EXISTS trg_medicos_before_ins;
CREATE TRIGGER trg_medicos_before_ins
BEFORE INSERT ON medicos FOR EACH ROW
BEGIN
  SET NEW.nome_search = LOWER(fn_remove_accents(NEW.nome));
END;
//
DROP TRIGGER IF EXISTS trg_medicos_before_upd;
CREATE TRIGGER trg_medicos_before_upd
BEFORE UPDATE ON medicos FOR EACH ROW
BEGIN
  SET NEW.nome_search = LOWER(fn_remove_accents(NEW.nome));
END;
//
DROP TRIGGER IF EXISTS trg_plantao_before_ins;
CREATE TRIGGER trg_plantao_before_ins
BEFORE INSERT ON plantao FOR EACH ROW
BEGIN
  -- calcula periodo
  SET NEW.periodo = fn_compute_periodo(NEW.hora);
  -- tenta preencher ids/nomes se faltarem
  IF NEW.especialidade_id IS NULL AND NEW.especialidade_nome IS NOT NULL THEN
    SELECT id INTO @espid FROM especialidades WHERE LOWER(nome) = LOWER(NEW.especialidade_nome) LIMIT 1;
    IF @espid IS NOT NULL THEN SET NEW.especialidade_id = @espid; END IF;
  END IF;
  IF NEW.medico_id IS NULL AND NEW.crm IS NOT NULL THEN
    SELECT id INTO @medid FROM medicos WHERE crm = NEW.crm LIMIT 1;
    IF @medid IS NOT NULL THEN SET NEW.medico_id = @medid; END IF;
  END IF;
  IF NEW.medico_id IS NOT NULL THEN
    SELECT nome INTO @mn FROM medicos WHERE id = NEW.medico_id LIMIT 1;
    IF @mn IS NOT NULL THEN SET NEW.medico_nome = @mn; END IF;
  END IF;
  IF NEW.especialidade_id IS NOT NULL THEN
    SELECT nome INTO @en FROM especialidades WHERE id = NEW.especialidade_id LIMIT 1;
    IF @en IS NOT NULL THEN SET NEW.especialidade_nome = @en; END IF;
  END IF;
END;
//
DROP TRIGGER IF EXISTS trg_plantao_before_upd;
CREATE TRIGGER trg_plantao_before_upd
BEFORE UPDATE ON plantao FOR EACH ROW
BEGIN
  SET NEW.periodo = fn_compute_periodo(NEW.hora);
  IF NEW.medico_id IS NOT NULL THEN
    SELECT nome INTO @mn2 FROM medicos WHERE id = NEW.medico_id LIMIT 1;
    IF @mn2 IS NOT NULL THEN SET NEW.medico_nome = @mn2; END IF;
  END IF;
  IF NEW.especialidade_id IS NOT NULL THEN
    SELECT nome INTO @en2 FROM especialidades WHERE id = NEW.especialidade_id LIMIT 1;
    IF @en2 IS NOT NULL THEN SET NEW.especialidade_nome = @en2; END IF;
  END IF;
END;
//
DELIMITER ;

-- PROCEDURE: upsert de médico e especialidade
DELIMITER //
DROP PROCEDURE IF EXISTS sp_upsert_medico;
CREATE PROCEDURE sp_upsert_medico(
  IN p_nome VARCHAR(255),
  IN p_crm VARCHAR(50),
  IN p_esp_nome VARCHAR(255),
  OUT p_medico_id INT
)
BEGIN
  DECLARE esp_id INT DEFAULT NULL;
  DECLARE med_id INT DEFAULT NULL;

  IF p_esp_nome IS NOT NULL AND p_esp_nome <> '' THEN
    SELECT id INTO esp_id FROM especialidades WHERE LOWER(nome) = LOWER(p_esp_nome) LIMIT 1;
    IF esp_id IS NULL THEN
      INSERT INTO especialidades(nome) VALUES (p_esp_nome);
      SET esp_id = LAST_INSERT_ID();
    END IF;
  END IF;

  IF p_crm IS NOT NULL AND p_crm <> '' THEN
    SELECT id INTO med_id FROM medicos WHERE crm = p_crm LIMIT 1;
  END IF;

  IF med_id IS NULL AND p_nome IS NOT NULL THEN
    SELECT id INTO med_id FROM medicos WHERE LOWER(nome) = LOWER(p_nome) LIMIT 1;
  END IF;

  IF med_id IS NULL THEN
    INSERT INTO medicos(nome, crm, especialidade_id) VALUES (p_nome, p_crm, esp_id);
    SET p_medico_id = LAST_INSERT_ID();
  ELSE
    UPDATE medicos SET nome = COALESCE(p_nome, nome), crm = COALESCE(p_crm, crm), especialidade_id = COALESCE(esp_id, especialidade_id) WHERE id = med_id;
    SET p_medico_id = med_id;
  END IF;
END;
//
DELIMITER ;

-- PROCEDURE: inserir plantão usando upsert médico
DELIMITER //
DROP PROCEDURE IF EXISTS sp_insert_plantao;
CREATE PROCEDURE sp_insert_plantao(
  IN p_nome VARCHAR(255),
  IN p_crm VARCHAR(50),
  IN p_esp_nome VARCHAR(255),
  IN p_data DATE,
  IN p_hora TIME,
  IN p_quantidade INT,
  IN p_source VARCHAR(255)
)
BEGIN
  DECLARE med_id INT;
  CALL sp_upsert_medico(p_nome, p_crm, p_esp_nome, med_id);
  INSERT INTO plantao(medico_id, medico_nome, crm, especialidade_id, especialidade_nome, data, hora, quantidade, source)
  VALUES (med_id, p_nome, p_crm, (SELECT id FROM especialidades WHERE LOWER(nome)=LOWER(p_esp_nome) LIMIT 1), p_esp_nome, p_data, p_hora, COALESCE(p_quantidade,1), p_source);
END;
//
DELIMITER ;

-- PROCEDURE: obter relatório com filtros (retorna resultset)
DELIMITER //
DROP PROCEDURE IF EXISTS sp_get_relatorio;
CREATE PROCEDURE sp_get_relatorio(
  IN p_data_inicio DATE,
  IN p_data_fim DATE,
  IN p_medico VARCHAR(255),
  IN p_crm VARCHAR(50),
  IN p_especialidade VARCHAR(255),
  IN p_hora_de TIME,
  IN p_hora_ate TIME
)
BEGIN
  SELECT
    p.medico_nome AS medico_nome,
    p.crm AS crm,
    p.especialidade_nome AS especialidade_nome,
    p.data AS data,
    p.hora AS hora,
    SUM(p.quantidade) AS atendimentos
  FROM plantao p
  WHERE (p.data BETWEEN p_data_inicio AND p_data_fim)
    AND (p_medico IS NULL OR p_medico = '' OR LOWER(p.medico_nome) LIKE CONCAT('%', LOWER(p_medico), '%'))
    AND (p_crm IS NULL OR p_crm = '' OR p.crm = p_crm)
    AND (p_especialidade IS NULL OR p_especialidade = '' OR LOWER(p.especialidade_nome) LIKE CONCAT('%', LOWER(p_especialidade), '%'))
    AND (p_hora_de IS NULL OR p.hora >= p_hora_de)
    AND (p_hora_ate IS NULL OR p.hora <= p_hora_ate)
  GROUP BY p.medico_nome, p.crm, p.especialidade_nome, p.data, p.hora
  ORDER BY p.data ASC, p.medico_nome ASC;
END;
//
DELIMITER ;

-- VIEW: consolidação por médico + data + especialidade
DROP VIEW IF EXISTS vw_consolidado_medico_dia_esp;
CREATE VIEW vw_consolidado_medico_dia_esp AS
SELECT
  COALESCE(p.medico_id, 0) AS medico_id,
  COALESCE(p.medico_nome, '—') AS medico_nome,
  COALESCE(p.especialidade_id, 0) AS especialidade_id,
  COALESCE(p.especialidade_nome, '—') AS especialidade_nome,
  p.data AS data,
  SUM(p.quantidade) AS atendimentos
FROM plantao p
GROUP BY COALESCE(p.medico_id,0), COALESCE(p.medico_nome,'—'), COALESCE(p.especialidade_id,0), COALESCE(p.especialidade_nome,'—'), p.data;

-- VIEW: relatório mensal/annual simplificado
DROP VIEW IF EXISTS vw_relatorio_mensal;
CREATE VIEW vw_relatorio_mensal AS
SELECT
  DATE_FORMAT(data, '%Y-%m-01') AS mes,
  especialidade_nome,
  SUM(quantidade) AS total_atendimentos
FROM plantao
GROUP BY mes, especialidade_nome
ORDER BY mes DESC;

DROP VIEW IF EXISTS vw_relatorio_anual;
CREATE VIEW vw_relatorio_anual AS
SELECT
  DATE_FORMAT(data, '%Y-01-01') AS ano,
  especialidade_nome,
  SUM(quantidade) AS total_atendimentos
FROM plantao
GROUP BY ano, especialidade_nome
ORDER BY ano DESC;

-- Inserções de exemplo (opcional)
-- INSERT INTO especialidades(nome, cor) VALUES ('Clínica Médica','#1f4e78');
-- CALL sp_insert_plantao('Dr. João','CRM123','Clínica Médica','2025-11-01','08:30:00',2,'web');

-- NOTAS DE INTEGRAÇÃO
--  - Para gravar plantões pela aplicação: CALL sp_insert_plantao(nome, crm, especialidade, data, hora, quantidade, source);
--  - Para obter dados filtrados (usado por getDadosConsolidados): CALL sp_get_relatorio('2025-11-01','2025-11-30','João',NULL,'Cardiologia','07:00:00','19:00:00');
--  - Para pesquisas textuais melhores: use nome_search preenchido por trigger e pesquise com LOWER(fn_remove_accents(nome)) ou FULLTEXT em 'nome'.
--  - Atualize sua camada dataServices para usar estas procedures (via PHP/mysql or node/mysql) para garantir consistência.
