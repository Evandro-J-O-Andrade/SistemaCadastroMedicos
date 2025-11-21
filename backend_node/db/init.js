// db/init.js - Script de inicialização do banco de dados SQLite

import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

// Caminho do arquivo de banco de dados
const SQLITE_FILE = path.resolve(process.env.DB_PATH || './db/database.db');

// O SQL corrigido com todas as alterações
const SQL_SCHEMA = `
-- Desativa o modo de verificação de chaves estrangeiras durante o setup
PRAGMA foreign_keys = OFF;

----------------------------------------------------
-- 1. CRIAÇÃO DE TABELAS (CORRIGIDAS)
----------------------------------------------------

-- Tabela de usuários
CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    -- CORRIGIDO: de 'nome' para 'usuario'. Adicionado COLLATE NOCASE.
    usuario TEXT UNIQUE NOT NULL COLLATE NOCASE, 
    email TEXT NULL, 
    -- CORRIGIDO: de 'tipo' para 'role'.
    role TEXT CHECK(role IN ('admin','suporte','comum')) DEFAULT 'comum', 
    senha TEXT NOT NULL,
    primeiro_login INTEGER DEFAULT 1,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME
);

-- Tabela de especialidades (Mantida)
CREATE TABLE IF NOT EXISTS especialidades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT UNIQUE NOT NULL,
    icone TEXT,
    descricao TEXT,
    cor TEXT,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME
);

-- Tabela de médicos
CREATE TABLE IF NOT EXISTS medicos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    -- CORRIGIDO: Adicionado COLLATE NOCASE para o CRM.
    crm TEXT UNIQUE NOT NULL COLLATE NOCASE,
    -- CORRIGIDO: de 'observacoes' para 'observacao' (singular).
    observacao TEXT, 
    ativo INTEGER DEFAULT 1,
    especialidade_principal_id INTEGER,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME,
    FOREIGN KEY (especialidade_principal_id) REFERENCES especialidades(id) ON DELETE SET NULL
);

-- Tabela de relacionamento N:N (Mantida)
CREATE TABLE IF NOT EXISTS medico_especialidade (
    medico_id INTEGER NOT NULL,
    especialidade_id INTEGER NOT NULL,
    is_primaria INTEGER DEFAULT 0,
    PRIMARY KEY (medico_id, especialidade_id),
    FOREIGN KEY (medico_id) REFERENCES medicos(id) ON DELETE CASCADE,
    FOREIGN KEY (especialidade_id) REFERENCES especialidades(id) ON DELETE CASCADE
);

-- Plantões (Tabela principal)
CREATE TABLE IF NOT EXISTS plantoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    medico_id INTEGER NOT NULL,
    data DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fim TIME NOT NULL DEFAULT '23:59',
    status TEXT DEFAULT 'Agendado',
    -- CORRIGIDO: de 'observacoes' para 'observacao' (singular).
    observacao TEXT,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME,
    criado_por INTEGER,
    FOREIGN KEY (medico_id) REFERENCES medicos(id) ON DELETE RESTRICT,
    FOREIGN KEY (criado_por) REFERENCES usuarios(id) ON DELETE SET NULL
);

-- Log de ações de plantões (Mantida)
CREATE TABLE IF NOT EXISTS log_plantoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plantao_id INTEGER,
    acao TEXT,
    usuario_id INTEGER,
    data_hora DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Auditoria de requisições de sistema (Mantida)
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

-- Atendimentos (Mantida)
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

----------------------------------------------------
-- 2. CRIAÇÃO DE ÍNDICES
----------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_usuarios_usuario ON usuarios(usuario);
CREATE INDEX IF NOT EXISTS idx_medicos_crm ON medicos(crm);
CREATE INDEX IF NOT EXISTS idx_medicos_nome ON medicos(nome);
CREATE INDEX IF NOT EXISTS idx_medico_especialidade_medico ON medico_especialidade(medico_id);
CREATE INDEX IF NOT EXISTS idx_medico_especialidade_esp ON medico_especialidade(especialidade_id);
CREATE INDEX IF NOT EXISTS idx_especialidades_nome ON especialidades(nome);
CREATE INDEX IF NOT EXISTS idx_plantoes_data_medico ON plantoes(data, medico_id);
CREATE INDEX IF NOT EXISTS idx_atend_plantao ON atendimentos(plantao_id);

----------------------------------------------------
-- 3. CRIAÇÃO DE VIEWS
----------------------------------------------------

CREATE VIEW IF NOT EXISTS view_relatorio_plantoes AS
SELECT
    p.id,
    p.data,
    p.hora_inicio,
    p.hora_fim,
    p.status,
    p.observacao, -- CORRIGIDO (singular)
    m.nome AS nome_medico,
    m.crm,
    e.nome AS nome_especialidade,
    u.usuario AS nome_usuario_criador, -- CORRIGIDO: de u.nome para u.usuario
    (SELECT COUNT(a.id) FROM atendimentos a WHERE a.plantao_id = p.id) AS total_atendimentos
FROM plantoes p
JOIN medicos m ON p.medico_id = m.id
LEFT JOIN especialidades e ON m.especialidade_principal_id = e.id
LEFT JOIN usuarios u ON p.criado_por = u.id;

-- Reativa o modo de verificação de chaves estrangeiras
PRAGMA foreign_keys = ON;
`;

async function initializeDatabase() {
    // 1. Garante que a pasta existe
    const dir = path.dirname(SQLITE_FILE);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    console.log(`[DB] Abrindo/Criando banco em: ${SQLITE_FILE}`);
    
    // 2. Abre a conexão com o banco de dados
    const db = await open({
        filename: SQLITE_FILE,
        driver: sqlite3.Database,
    });

    console.log('[DB] Conectado. Executando script de inicialização...');

    // 3. Executa o script SQL completo
    await db.exec(SQL_SCHEMA);

    await db.close();
    console.log('✅ Banco de dados inicializado e todas as tabelas e views criadas/verificadas com sucesso.');
}

initializeDatabase().catch((error) => {
    console.error('[DB ERROR] Falha ao inicializar o banco:', error.message);
    process.exit(1);
});