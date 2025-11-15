import sqlite3 from "sqlite3";
import { open } from "sqlite";
import path from "path";
import fs from "fs";

const DB_FILE = path.join(process.cwd(), process.env.DB_PATH || "./db/database.db");
const DB_DIR = path.dirname(DB_FILE);
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

async function init() {
  const db = await open({ filename: DB_FILE, driver: sqlite3.Database });

  await db.exec(`
PRAGMA foreign_keys = ON;

-- usuarios
CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT,
  senha TEXT NOT NULL,
  tipo TEXT CHECK(tipo IN ('admin','suporte','usuario')) DEFAULT 'usuario',
  primeiro_login INTEGER DEFAULT 1,
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME
);

-- especialidades
CREATE TABLE IF NOT EXISTS especialidades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT UNIQUE NOT NULL,
  descricao TEXT,
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME
);

-- medicos
CREATE TABLE IF NOT EXISTS medicos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  crm TEXT UNIQUE NOT NULL,
  observacoes TEXT,
  ativo INTEGER DEFAULT 1,
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME
);

-- relacionamento N:N medico <-> especialidade
CREATE TABLE IF NOT EXISTS medico_especialidade (
  medico_id INTEGER NOT NULL,
  especialidade_id INTEGER NOT NULL,
  is_primaria INTEGER DEFAULT 0,
  PRIMARY KEY (medico_id, especialidade_id),
  FOREIGN KEY (medico_id) REFERENCES medicos(id) ON DELETE CASCADE,
  FOREIGN KEY (especialidade_id) REFERENCES especialidades(id) ON DELETE CASCADE
);

-- plantoes
CREATE TABLE IF NOT EXISTS plantoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  medico_id INTEGER NOT NULL,
  data DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fim TIME NOT NULL DEFAULT '23:59',
  status TEXT DEFAULT 'Agendado',
  observacoes TEXT,
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME,
  criado_por INTEGER,
  FOREIGN KEY (medico_id) REFERENCES medicos(id) ON DELETE RESTRICT,
  FOREIGN KEY (criado_por) REFERENCES usuarios(id) ON DELETE SET NULL
);

-- log de ações de plantões
CREATE TABLE IF NOT EXISTS log_plantoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plantao_id INTEGER,
  acao TEXT,
  usuario_id INTEGER,
  data_hora DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- auditoria de requisições
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rota TEXT,
  metodo TEXT,
  usuario TEXT,
  ip TEXT,
  payload TEXT,
  resultado TEXT,
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- atendimentos (nova tabela)
CREATE TABLE IF NOT EXISTS atendimentos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plantao_id INTEGER NOT NULL,
  paciente_nome TEXT NOT NULL,
  procedimento TEXT,
  hora TEXT NOT NULL,
  obs TEXT,
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (plantao_id) REFERENCES plantoes(id) ON DELETE CASCADE
);

-- indices
CREATE INDEX IF NOT EXISTS idx_usuarios_username ON usuarios(username);
CREATE INDEX IF NOT EXISTS idx_medicos_crm ON medicos(crm);
CREATE INDEX IF NOT EXISTS idx_plantoes_data_medico ON plantoes(data, medico_id);
CREATE INDEX IF NOT EXISTS idx_atend_plantao ON atendimentos(plantao_id);

-- view relatorio plantoes
CREATE VIEW IF NOT EXISTS view_relatorio_plantoes AS
SELECT
  p.id,
  p.medico_id,
  m.nome AS medico,
  m.crm,
  GROUP_CONCAT(e.nome, ', ') AS especialidades,
  p.data,
  p.hora_inicio,
  p.hora_fim,
  p.status,
  p.criado_em
FROM plantoes p
INNER JOIN medicos m ON m.id = p.medico_id
LEFT JOIN medico_especialidade me ON m.id = me.medico_id
LEFT JOIN especialidades e ON me.especialidade_id = e.id
GROUP BY p.id;

-- view resumo diario
CREATE VIEW IF NOT EXISTS view_resumo_diario AS
SELECT
  p.data,
  m.nome AS medico,
  GROUP_CONCAT(e.nome, ', ') AS especialidades,
  COUNT(p.id) AS total_plantoes
FROM plantoes p
INNER JOIN medicos m ON p.medico_id = m.id
LEFT JOIN medico_especialidade me ON m.id = me.medico_id
LEFT JOIN especialidades e ON me.especialidade_id = e.id
GROUP BY p.data, m.id;

-- view de atendimentos (relatorio)
CREATE VIEW IF NOT EXISTS vw_relatorio_atendimentos AS
SELECT a.id, a.paciente_nome, a.procedimento, a.hora, a.obs,
       p.id AS plantao_id, p.data AS plantao_data, p.hora_inicio, p.hora_fim,
       m.id AS medico_id, m.nome AS medico, m.crm,
       GROUP_CONCAT(e.nome, ', ') AS especialidades
FROM atendimentos a
JOIN plantoes p ON p.id = a.plantao_id
JOIN medicos m ON m.id = p.medico_id
LEFT JOIN medico_especialidade me ON m.id = me.medico_id
LEFT JOIN especialidades e ON me.especialidade_id = e.id
GROUP BY a.id;

-- triggers para log de plantoes
CREATE TRIGGER IF NOT EXISTS trg_plantao_insert
AFTER INSERT ON plantoes
BEGIN
  INSERT INTO log_plantoes (plantao_id, acao, usuario_id) VALUES (NEW.id, 'INSERIDO', NEW.criado_por);
END;

CREATE TRIGGER IF NOT EXISTS trg_plantao_update
AFTER UPDATE ON plantoes
BEGIN
  INSERT INTO log_plantoes (plantao_id, acao, usuario_id) VALUES (NEW.id, 'ATUALIZADO', NEW.criado_por);
END;

CREATE TRIGGER IF NOT EXISTS trg_plantao_delete
AFTER DELETE ON plantoes
BEGIN
  INSERT INTO log_plantoes (plantao_id, acao, usuario_id) VALUES (OLD.id, 'DELETADO', 1);
END;
`);
  console.log("✅ DB inicializado em", DB_FILE);
  await db.close();
}

init().catch((e) => console.error("Erro init DB:", e));
