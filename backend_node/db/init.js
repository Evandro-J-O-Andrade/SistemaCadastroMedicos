// /backend_node/db/init.js - Versão Otimizada N:N e Segura
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt'; // 🚨 NOVO: Importa bcrypt para hashear a senha

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, 'database.db');
const SALT_ROUNDS = 10; // 🛡️ Constante para segurança do hash

async function initDB() {
    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database
    });

    console.log('🔹 Iniciando criação do banco de dados...');

    await db.exec(`PRAGMA foreign_keys = ON;`);

    // =========================
    // TABELAS
    // =========================

    // 1. USUARIOS (ajustado: campo "tipo" em vez de "cargo")
    await db.exec(`
        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            email TEXT UNIQUE,
            senha TEXT NOT NULL,
            tipo TEXT DEFAULT 'Atendente',
            criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
            atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // 2. ESPECIALIDADES
    await db.exec(`
        CREATE TABLE IF NOT EXISTS especialidades (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL UNIQUE,
            descricao TEXT,
            criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // 3. MÉDICOS
    await db.exec(`
        CREATE TABLE IF NOT EXISTS medicos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            crm TEXT NOT NULL UNIQUE,
            ativo INTEGER DEFAULT 1,
            criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // 4. LIGAÇÃO N:N
    await db.exec(`
        CREATE TABLE IF NOT EXISTS medico_especialidade (
            medico_id INTEGER NOT NULL,
            especialidade_id INTEGER NOT NULL,
            is_primaria INTEGER DEFAULT 0,
            PRIMARY KEY (medico_id, especialidade_id),
            FOREIGN KEY (medico_id) REFERENCES medicos(id) ON DELETE CASCADE,
            FOREIGN KEY (especialidade_id) REFERENCES especialidades(id) ON DELETE CASCADE
        );
    `);

    // 5. PLANTÕES
    await db.exec(`
        CREATE TABLE IF NOT EXISTS plantoes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            medico_id INTEGER NOT NULL,
            data DATE NOT NULL,
            hora_inicio TIME NOT NULL,
            hora_fim TIME NOT NULL,
            observacoes TEXT,
            criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (medico_id) REFERENCES medicos(id) ON DELETE CASCADE
        );
    `);

    // 6. HISTÓRICO DE AÇÕES
    await db.exec(`
        CREATE TABLE IF NOT EXISTS historico_acoes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario_id INTEGER,
            acao TEXT,
            tabela TEXT,
            registro_id INTEGER,
            data_hora DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        );
    `);

    // =========================
    // VIEWS E TRIGGERS
    // =========================
    await db.exec(`
        CREATE VIEW IF NOT EXISTS vw_relatorio_plantao AS
        SELECT 
            p.id AS id_plantao,
            m.nome AS medico,
            m.crm AS crm,
            e.nome AS especialidade_primaria, 
            p.data,
            p.hora_inicio,
            p.hora_fim,
            p.observacoes
        FROM plantoes p
        JOIN medicos m ON p.medico_id = m.id
        LEFT JOIN medico_especialidade me ON me.medico_id = m.id AND me.is_primaria = 1
        LEFT JOIN especialidades e ON me.especialidade_id = e.id;
    `);

    await db.exec(`
        CREATE TRIGGER IF NOT EXISTS trg_medico_insert
        AFTER INSERT ON medicos
        BEGIN
            INSERT INTO historico_acoes (usuario_id, acao, tabela, registro_id)
            VALUES (NULL, 'INSERÇÃO', 'medicos', NEW.id);
        END;
    `);

    await db.exec(`
        CREATE TRIGGER IF NOT EXISTS trg_plantao_insert
        AFTER INSERT ON plantoes
        BEGIN
            INSERT INTO historico_acoes (usuario_id, acao, tabela, registro_id)
            VALUES (NULL, 'INSERÇÃO', 'plantoes', NEW.id);
        END;
    `);

    // =========================
    // ÍNDICES
    // =========================
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_plantao_data ON plantoes(data);`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_historico_data ON historico_acoes(data_hora);`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_me_medico_id ON medico_especialidade(medico_id);`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_me_especialidade_id ON medico_especialidade(especialidade_id);`);

    // =========================
    // DADOS INICIAIS
    // =========================

    // 1. 🛡️ Admin com senha hasheada
    const adminPassword = '12345';
    const adminSenhaHashed = await bcrypt.hash(adminPassword, SALT_ROUNDS);

    await db.exec(`
        INSERT OR IGNORE INTO usuarios (id, nome, email, senha, tipo) 
        VALUES (1, 'Administrador', 'admin@sistema.com', '${adminSenhaHashed}', 'admin');
    `);

    // 2. ESPECIALIDADES
    await db.exec(`
        INSERT OR IGNORE INTO especialidades (id, nome, descricao) VALUES
        (1, 'Cardiologia', 'Doenças do coração'),
        (2, 'Pediatria', 'Cuidado infantil'),
        (3, 'Ortopedia', 'Sistema músculo-esquelético'),
        (4, 'Clínica Geral', 'Atendimento primário');
    `);

    // 3. MÉDICOS
    await db.exec(`
        INSERT OR IGNORE INTO medicos (id, nome, crm) VALUES
        (1, 'Dr. João Silva', 'CRM1234'),
        (2, 'Dra. Maria Souza', 'CRM5678'),
        (3, 'Dr. Carlos Lima', 'CRM9012');
    `);

    // 4. LIGAÇÃO MÉDICO/ESPECIALIDADE
    await db.exec(`
        INSERT OR IGNORE INTO medico_especialidade (medico_id, especialidade_id, is_primaria) VALUES
        (1, 1, 1), 
        (1, 4, 0), 
        (2, 2, 1), 
        (3, 3, 1), 
        (3, 4, 0); 
    `);

    // 5. PLANTÕES
    await db.exec(`
        INSERT OR IGNORE INTO plantoes (id, medico_id, data, hora_inicio, hora_fim, observacoes) VALUES
        (1, 1, '2025-11-09', '08:00', '14:00', 'Plantão diurno'),
        (2, 2, '2025-11-09', '14:00', '20:00', 'Plantão pediátrico'),
        (3, 3, '2025-11-10', '08:00', '14:00', 'Ortopedia geral');
    `);

    console.log('✅ Banco de dados criado e populado com sucesso (Modelo N:N Ativado e SEGURO)!');
    await db.close();
}

initDB();
