// backend_node/db/database.js - Versão Otimizada (com M:N de Especialidades)
import sqlite3 from "sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcrypt";

// =======================
// 🔧 Caminhos e Conexão
// =======================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, "../database.db");

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("❌ Erro ao conectar no SQLite:", err.message);
  } else {
    console.log(`💾 Conectado ao SQLite em: ${dbPath}`);
    initDatabase();
  }
});

db.on("error", (err) => {
  console.error("❌ Erro crítico no DB:", err.message, "\nStack:", err.stack);
});

// Fechamento limpo
const shutdown = (signal) => {
  console.log(`🛑 Recebido ${signal}, encerrando conexão SQLite...`);
  db.close(() => process.exit(0));
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// =======================
// 🧱 Estrutura das Tabelas
// =======================
function initDatabase() {
  db.serialize(() => {
    try {
      // --- Usuários ---
      db.run(`
        CREATE TABLE IF NOT EXISTS usuarios (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nome TEXT NOT NULL,
          username TEXT UNIQUE NOT NULL,
          email TEXT,
          senha TEXT NOT NULL,
          tipo TEXT CHECK(tipo IN ('admin','suporte','usuario')) DEFAULT 'usuario',
          primeiro_login INTEGER DEFAULT 1,
          criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, handleRunError("usuarios"));
      db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_username ON usuarios(username)`);

      // --- Especialidades ---
      db.run(`
        CREATE TABLE IF NOT EXISTS especialidades (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nome TEXT UNIQUE NOT NULL,
          descricao TEXT,
          ativo INTEGER DEFAULT 1,
          criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, handleRunError("especialidades"));

      // --- Médicos ---
      db.run(`
        CREATE TABLE IF NOT EXISTS medicos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nome TEXT NOT NULL,
          crm TEXT UNIQUE NOT NULL,
          observacao TEXT,
          ativo INTEGER DEFAULT 1,
          criado_por INTEGER,
          criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (criado_por) REFERENCES usuarios(id)
        )
      `, handleRunError("medicos"));

      // --- Ligação Médico ↔ Especialidade (N:N) ---
      db.run(`
        CREATE TABLE IF NOT EXISTS medico_especialidade (
          medico_id INTEGER NOT NULL,
          especialidade_id INTEGER NOT NULL,
          is_primaria INTEGER DEFAULT 0,
          FOREIGN KEY (medico_id) REFERENCES medicos(id) ON DELETE CASCADE,
          FOREIGN KEY (especialidade_id) REFERENCES especialidades(id) ON DELETE CASCADE,
          PRIMARY KEY (medico_id, especialidade_id)
        )
      `, handleRunError("medico_especialidade"));

      // --- Plantão ---
      db.run(`
        CREATE TABLE IF NOT EXISTS plantao (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          medico_id INTEGER NOT NULL,
          qtd_atendimentos INTEGER DEFAULT 0,
          data_atendimento DATE NOT NULL,
          hora_atendimento TIME NOT NULL,
          turno TEXT,
          criado_por INTEGER,
          criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (medico_id) REFERENCES medicos(id) ON DELETE CASCADE,
          FOREIGN KEY (criado_por) REFERENCES usuarios(id)
        )
      `, handleRunError("plantao"));

      // --- Logs ---
      db.run(`
        CREATE TABLE IF NOT EXISTS log_acoes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tabela TEXT,
          acao TEXT,
          registro_id INTEGER,
          usuario_id INTEGER,
          detalhes TEXT,
          data_hora DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, handleRunError("log_acoes"));

      // =======================
      // 📊 Views Atualizadas
      // =======================
      db.run(`
        CREATE VIEW IF NOT EXISTS view_relatorio_plantoes AS
        SELECT
          p.id AS id_plantao,
          m.nome AS medico,
          m.id AS medico_id,
          m.crm,
          e.nome AS especialidade_primaria,
          p.data_atendimento,
          p.hora_atendimento,
          p.turno,
          p.qtd_atendimentos,
          p.criado_em,
          u.username AS cadastrado_por
        FROM plantao p
        INNER JOIN medicos m ON m.id = p.medico_id
        LEFT JOIN medico_especialidade me ON me.medico_id = m.id AND me.is_primaria = 1
        LEFT JOIN especialidades e ON e.id = me.especialidade_id
        LEFT JOIN usuarios u ON u.id = p.criado_por
      `, handleRunError("view_relatorio_plantoes"));

      db.run(`
        CREATE VIEW IF NOT EXISTS view_resumo_diario AS
        SELECT
          p.data_atendimento AS data,
          m.id AS medico_id,
          m.nome AS medico,
          e.nome AS especialidade_primaria,
          p.turno,
          SUM(p.qtd_atendimentos) AS total_atendimentos,
          COUNT(p.id) AS num_registros,
          ROUND(AVG(p.qtd_atendimentos), 2) AS media_por_registro
        FROM plantao p
        INNER JOIN medicos m ON m.id = p.medico_id
        LEFT JOIN medico_especialidade me ON me.medico_id = m.id AND me.is_primaria = 1
        LEFT JOIN especialidades e ON e.id = me.especialidade_id
        GROUP BY p.data_atendimento, m.id, p.turno
        ORDER BY p.data_atendimento DESC, total_atendimentos DESC
      `, handleRunError("view_resumo_diario"));

      // =======================
      // 🧠 Triggers Simplificadas
      // =======================
      const triggers = [
        ["trg_log_plantao_insert", "AFTER INSERT ON plantao", "INSERIR", "NEW"],
        ["trg_log_plantao_update", "AFTER UPDATE ON plantao", "ATUALIZAR", "NEW"],
        ["trg_log_plantao_delete", "AFTER DELETE ON plantao", "DELETAR", "OLD"],
        ["trg_log_medico_insert", "AFTER INSERT ON medicos", "INSERIR", "NEW"],
        ["trg_log_medico_update", "AFTER UPDATE ON medicos", "ATUALIZAR", "NEW"],
        ["trg_log_medico_delete", "AFTER DELETE ON medicos", "DELETAR", "OLD"]
      ];

      triggers.forEach(([name, action, tipo, ref]) => {
        db.run(`
          CREATE TRIGGER IF NOT EXISTS ${name}
          ${action}
          BEGIN
            INSERT INTO log_acoes (tabela, acao, registro_id, usuario_id, detalhes)
            VALUES (
              '${action.split(" ")[2]}',
              '${tipo}',
              ${ref}.id,
              COALESCE(${ref}.criado_por, 1),
              'Registro afetado na tabela ${action.split(" ")[2]} (id=${ref}.id)'
            );
          END;
        `, handleRunError(name));
      });

      db.run("PRAGMA journal_mode = WAL;", handleRunError("WAL mode"));
      console.log("✅ Estrutura do banco inicializada com sucesso!");
    } catch (err) {
      console.error("❌ Erro no init do banco:", err.message, "\nStack:", err.stack);
    }
  });
}

// =======================
// 🧩 Funções Utilitárias
// =======================
function handleRunError(context) {
  return (err) => {
    if (err) console.error(`❌ Erro na criação de ${context}:`, err.message);
  };
}

// =======================
// 🌱 Seed Inicial
// =======================
async function seedInitialData() {
  return new Promise((resolve, reject) => {
    db.get("SELECT COUNT(*) as count FROM usuarios", async (err, row) => {
      if (err) return reject(err);
      if (row.count > 0) {
        console.log("✅ Seed ignorado: base já populada.");
        return resolve();
      }

      try {
        db.serialize(async () => {
          const hash = await bcrypt.hash("admin123", 12);

          // 1️⃣ Inserir Admin
          db.run(
            `INSERT INTO usuarios (nome, username, senha, tipo, email)
             VALUES (?, ?, ?, ?, ?)`,
            ["Admin Alpha", "admin", hash, "admin", "admin@alpha.com"]
          );

          // 2️⃣ Inserir Especialidades
          const especialidades = ["Cardiologia", "Pediatria", "Ortopedia", "Dermatologia", "Clínica Geral"];
          const espIds = {};

          const stmtEsp = db.prepare(`INSERT OR IGNORE INTO especialidades (nome) VALUES (?)`);
          especialidades.forEach((n) => stmtEsp.run(n));
          stmtEsp.finalize(() => {
            db.each("SELECT id, nome FROM especialidades", (err, row) => {
              if (row) espIds[row.nome] = row.id;
            });
          });

          // 3️⃣ Inserir Médicos + Relações
          const medicos = [
            { nome: "Dr. João Silva", crm: "CRM12345", primarias: ["Cardiologia"], secundarias: ["Clínica Geral"] },
            { nome: "Dra. Maria Oliveira", crm: "CRM67890", primarias: ["Pediatria"], secundarias: [] },
            { nome: "Dr. Pedro Santos", crm: "CRM11111", primarias: ["Ortopedia"], secundarias: [] },
            { nome: "Dra. Ana Costa", crm: "CRM22222", primarias: ["Dermatologia"], secundarias: [] }
          ];

          const stmtMed = db.prepare(`INSERT INTO medicos (nome, crm, criado_por) VALUES (?, ?, 1)`);
          medicos.forEach((m) => {
            stmtMed.run([m.nome, m.crm], function () {
              const medicoId = this.lastID;
              const ligacoes = [
                ...m.primarias.map((n) => ({ nome: n, is_primaria: 1 })),
                ...m.secundarias.map((n) => ({ nome: n, is_primaria: 0 }))
              ];

              ligacoes.forEach((esp) => {
                const espId = espIds[esp.nome];
                if (espId) {
                  db.run(
                    `INSERT OR IGNORE INTO medico_especialidade (medico_id, especialidade_id, is_primaria)
                     VALUES (?, ?, ?)`,
                    [medicoId, espId, esp.is_primaria]
                  );
                }
              });
            });
          });
          stmtMed.finalize();

          // 4️⃣ Inserir Plantões
          const hoje = new Date().toISOString().split("T")[0];
          const stmtP = db.prepare(`
            INSERT INTO plantao (medico_id, qtd_atendimentos, data_atendimento, hora_atendimento, turno, criado_por)
            VALUES (?, ?, ?, ?, ?, 1)
          `);
          [
            [1, 15, hoje, "08:00", "Manhã"],
            [2, 8, hoje, "14:00", "Tarde"],
            [3, 15, hoje, "16:00", "Tarde"]
          ].forEach((p) => stmtP.run(p));
          stmtP.finalize(() => {
            console.log("✅ Seed inicial concluído!");
            resolve();
          });
        });
      } catch (e) {
        reject(e);
      }
    });
  });
}

// =======================
// 📦 Exportações
// =======================
export default db;
export { seedInitialData };
