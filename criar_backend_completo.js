// criar_backend_adaptado_v2.js
import fs from "fs";
import path from "path";

const root = process.cwd();
const backendDir = path.join(root, "backend_robusto_v2");

// Cria as pastas necessárias
const folders = ["db", "routes", "utils", "middleware"];
folders.forEach((f) => fs.mkdirSync(path.join(backendDir, f), { recursive: true }));

// =================================================================
// 1. package.json e .env.example (Mantidos)
// =================================================================
fs.writeFileSync(
 path.join(backendDir, "package.json"),
 JSON.stringify(
 {
name: "backend_robusto_gestao_medica_v2",
version: "2.1.0",
 description: "Backend robusto para intranet de gestão de atendimentos médicos consolidados (versão final N:N)",
type: "module",
scripts: {
 start: "node server.js",
 dev: "nodemon server.js",
 "init-db": "node db/init.js",
 seed: "node db/seed.js",
 migrate: "node utils/migrate.js",
 },
 dependencies: {
        express: "^4.18.2",
        sqlite3: "^5.1.6",
        sqlite: "^5.1.0",
        bcrypt: "^5.1.0",
        jsonwebtoken: "^9.0.0",
        dotenv: "^16.0.3",
        cors: "^2.8.5",
        helmet: "^7.1.0",
        "express-rate-limit": "^7.1.5",
        joi: "^17.13.3",
        winston: "^3.13.0",
        nodemailer: "^6.9.13",
      },
      devDependencies: { nodemon: "^3.0.2" },
    },
    null,
    2
  )
);

fs.writeFileSync(
  path.join(backendDir, ".env.example"),
  `
PORT=5000
JWT_SECRET=sua_chave_super_secreta_mude_isso
JWT_EXPIRES_IN=8h
CORS_ORIGIN=http://localhost:5173,https://intranet.empresa.com
NODEMAILER_HOST=smtp.gmail.com
NODEMAILER_PORT=587
NODEMAILER_USER=seu_email@empresa.com
NODEMAILER_PASS=sua_senha_app
DB_PATH=./database.db
ADMIN_EMAIL=admin@alpha.com  # Email do admin pra receber pedidos de recuperação
`
);

// =================================================================
// 2. server.js (Atualizado com todas as rotas e /status)
// =================================================================
fs.writeFileSync(
  path.join(backendDir, "server.js"),
  `
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import winston from "winston";
import { open } from "sqlite";
import sqlite3 from "sqlite3";

dotenv.config();

// Logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.File({ filename: 'error.log', level: 'error' }), new winston.transports.Console()],
});

const app = express();
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use(limiter);
app.use(helmet());
app.use(express.json({ limit: '10mb' }));
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') || ['*'] }));

// Importação das ROTAS FINAIS
import authRoutes from "./routes/auth.js";
import usuariosRoutes from "./routes/usuarios.js";
import medicosRoutes from "./routes/medicos.js";
import plantoesRoutes from "./routes/plantoes.js";
import especialidadesRoutes from "./routes/especialidades.js";
import statusRoutes from "./routes/status.js";

// Uso das ROTAS FINAIS
app.use("/auth", authRoutes);
app.use("/usuarios", usuariosRoutes);
app.use("/medicos", medicosRoutes);
app.use("/plantoes", plantoesRoutes);
app.use("/especialidades", especialidadesRoutes);
app.use("/status", statusRoutes);

// 404 e error handler global
app.use((req, res) => res.status(404).json({ error: "Rota não encontrada" }));
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({ error: "Erro interno do servidor" });
});

app.listen(process.env.PORT || 5000, () =>
  console.log("✅ Backend robusto v2 rodando na porta " + (process.env.PORT || 5000))
);
`
);

// =================================================================
// 3. db/init.js (Estrutura N:N Finalizada)
// =================================================================
fs.writeFileSync(
  path.join(backendDir, "db/init.js"),
  `
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import fs from "fs";
import path from "path";

const DB_PATH = path.join(process.cwd(), process.env.DB_PATH || "database.db");

async function init() {
  const db = await open({ filename: DB_PATH, driver: sqlite3.Database });

  await db.exec(\`
    -- Tabela de Usuários (com username e email opcional)
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

    -- Tabela de Especialidades (Nova)
    CREATE TABLE IF NOT EXISTS especialidades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT UNIQUE NOT NULL,
      descricao TEXT,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
      atualizado_em DATETIME
    );

    -- Tabela de Médicos (Atualizada: removida especialidade)
    CREATE TABLE IF NOT EXISTS medicos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      crm TEXT UNIQUE NOT NULL,
      observacoes TEXT,
      ativo INTEGER DEFAULT 1,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
      atualizado_em DATETIME
    );

    -- Tabela de Ligação N:N Médico <-> Especialidade (Nova)
    CREATE TABLE IF NOT EXISTS medico_especialidade (
      medico_id INTEGER NOT NULL,
      especialidade_id INTEGER NOT NULL,
      is_primaria INTEGER DEFAULT 0,
      PRIMARY KEY (medico_id, especialidade_id),
      FOREIGN KEY (medico_id) REFERENCES medicos(id) ON DELETE CASCADE,
      FOREIGN KEY (especialidade_id) REFERENCES especialidades(id) ON DELETE CASCADE
    );
    
    -- Tabela de Plantões (Atualizada)
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
    
    -- Tabela de Log de Ações (Mantida)
    CREATE TABLE IF NOT EXISTS log_plantoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plantao_id INTEGER,
      acao TEXT,
      usuario_id INTEGER,
      data_hora DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Índices
    CREATE INDEX IF NOT EXISTS idx_usuarios_username ON usuarios(username);
    CREATE INDEX IF NOT EXISTS idx_medicos_crm ON medicos(crm);
    CREATE INDEX IF NOT EXISTS idx_plantoes_data_medico ON plantoes(data, medico_id);
    
    -- Views de Relatório (Adaptada para N:N)
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

    -- Views de Resumo Diário (Adaptada para N:N)
    CREATE VIEW IF NOT EXISTS view_resumo_diario AS
    SELECT 
      p.data, 
      m.nome AS medico, 
      GROUP_CONCAT(e.nome, ', ') AS especialidades, 
      COUNT(p.id) AS total_plantoes
    FROM plantoes p
    INNER JOIN medicos m ON m.id = p.medico_id
    LEFT JOIN medico_especialidade me ON m.id = me.medico_id
    LEFT JOIN especialidades e ON me.especialidade_id = e.id
    GROUP BY p.data, m.id;

    -- Triggers (Mantidos)
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
  \`);

  console.log("✅ DB inicializado: Estrutura final com N:N (Médico<->Especialidade) e Usuários por username!");
  await db.close();
}

init().catch(console.error);
`
);

// =================================================================
// 4. db/seed.js (Seed adaptado para N:N)
// =================================================================
fs.writeFileSync(
  path.join(backendDir, "db/seed.js"),
  `
import { open } from "sqlite";
import sqlite3 from "sqlite3";
import bcrypt from "bcrypt";

async function seed() {
  const db = await open({ filename: "./database.db", driver: sqlite3.Database });
  
  // Hash de senha
  const hash = await bcrypt.hash("admin123", 12);
  
  // 1. Admin com username e email
  await db.run("INSERT OR IGNORE INTO usuarios (username, email, senha, tipo) VALUES (?, ?, ?, ?)",
    ["admin", "admin@alpha.com", hash, "admin"]);

  // 2. Especialidades
  const especialidades = [
    { nome: "Cardiologia", descricao: "Doenças do coração" }, 
    { nome: "Clínica Geral", descricao: "Atendimento primário" }, 
    { nome: "Pediatria", descricao: "Saúde infantil" }, 
    { nome: "Ortopedia", descricao: "Sistema músculo-esquelético" }
  ];

  const ids = {};
  for (const esp of especialidades) {
    let result = await db.run("INSERT OR IGNORE INTO especialidades (nome, descricao) VALUES (?, ?)",
      [esp.nome, esp.descricao]);
      
    let id = result.lastID;
    if (!id) {
        // Se já existir (IGNORE), busca o ID
        const existing = await db.get("SELECT id FROM especialidades WHERE nome = ?", [esp.nome]);
        id = existing.id;
    }
    ids[esp.nome] = id;
  }

  // 3. Médicos e Ligação N:N
  const medicosData = [
    { nome: "Dr. Ana C.", crm: "CRM1000", especialidadePrimaria: "Cardiologia", especialidadesSecundarias: ["Clínica Geral"] },
    { nome: "Dr. Beto S.", crm: "CRM2000", especialidadePrimaria: "Pediatria", especialidadesSecundarias: [] },
    { nome: "Dr. Carlos D.", crm: "CRM3000", especialidadePrimaria: "Clínica Geral", especialidadesSecundarias: ["Ortopedia"] },
  ];

  for (const medico of medicosData) {
    let medResult = await db.run(
      "INSERT OR IGNORE INTO medicos (nome, crm, observacoes) VALUES (?, ?, ?)",
      [medico.nome, medico.crm, "Seed data"]
    );
    
    let medicoId = medResult.lastID;

    if (!medicoId) {
        // Se já existir, busca o ID
        const existing = await db.get("SELECT id FROM medicos WHERE crm = ?", [medico.crm]);
        medicoId = existing.id;
    }
    
    // Limpa vínculos antigos antes de inserir (útil para re-seed)
    await db.run("DELETE FROM medico_especialidade WHERE medico_id = ?", [medicoId]);

    // Insere especialidade Primária
    await db.run(
        "INSERT INTO medico_especialidade (medico_id, especialidade_id, is_primaria) VALUES (?, ?, ?)",
        [medicoId, ids[medico.especialidadePrimaria], 1]
    );

    // Insere especialidades Secundárias
    for (const secEsp of medico.especialidadesSecundarias) {
        await db.run(
            "INSERT INTO medico_especialidade (medico_id, especialidade_id, is_primaria) VALUES (?, ?, ?)",
            [medicoId, ids[secEsp], 0]
        );
    }
  }

  console.log("✅ Seed finalizado: Estrutura N:N populada e Admin criado!");
  db.close();
}

seed().catch(console.error);
`
);

// =================================================================
// 5. utils/emailService.js, utils/migrate.js, middleware/validation.js (Mantidos)
// O conteúdo fornecido no prompt para esses arquivos é mantido.
// =================================================================
fs.writeFileSync(
  path.join(backendDir, "utils/emailService.js"),
  `
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const transporter = nodemailer.createTransporter({
  host: process.env.NODEMAILER_HOST,
  port: process.env.NODEMAILER_PORT,
  secure: false,
  auth: {
    user: process.env.NODEMAILER_USER,
    pass: process.env.NODEMAILER_PASS,
  },
});

export async function sendRecoveryToAdmin(username, token) {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@alpha.com";
  const mailOptions = {
    from: process.env.NODEMAILER_USER,
    to: adminEmail,
    subject: "Pedido de Recuperação de Senha - Alpha Médica",
    html: \`<p>Usuário <strong>\${username}</strong> pediu reset de senha.</p><p>Token: <strong>\${token}</strong> (válido 1h).</p><p>Aprove/reset via painel admin.</p>\`,
  };
  return transporter.sendMail(mailOptions);
}
`
);

fs.writeFileSync(
  path.join(backendDir, "utils/migrate.js"),
  `
import { open } from "sqlite";
import sqlite3 from "sqlite3";

async function migrate(usuariosData, medicosData, plantoesData) {
  const db = await open({ filename: "./database.db", driver: sqlite3.Database });
  
  console.log("⚠️ A migração v2 foi simplificada e não suporta migração de N:N. Recomenda-se usar init/seed.");
  
  // Usuarios: usa username em vez de email
  for (const u of usuariosData) {
    await db.run("INSERT OR IGNORE INTO usuarios (username, senha, tipo) VALUES (?, ?, ?)",
      [u.username || u.usuario, u.senha, u.role || u.tipo || 'usuario']);
  }

  // Medicos (Esta migração não trata o N:N)
  for (const m of medicosData) {
    await db.run("INSERT OR IGNORE INTO medicos (nome, crm, observacoes) VALUES (?, ?, ?)",
      [m.nome, m.crm, m.observacao || '']);
  }

  // Plantoes (igual, mapeia medico por nome/CRM)
  for (const p of plantoesData) {
    const medico = await db.get("SELECT id FROM medicos WHERE crm = ? OR nome LIKE ?", [p.crm, \`%\${p.medico}%\`]);
    if (medico) {
      await db.run("INSERT OR IGNORE INTO plantoes (medico_id, data, hora_inicio, status) VALUES (?, ?, ?, ?)",
        [medico.id, p.data, p.hora || '08:00', 'Agendado']);
    }
  }

  console.log("✅ Migração v2: Usuários com username! (N:N não migrado)");
  db.close();
}

// Export pra uso em rota
export { migrate };
`
);

fs.writeFileSync(
  path.join(backendDir, "middleware/validation.js"),
  `
import Joi from "joi";

export const schemas = {
  usuario: Joi.object({
    username: Joi.string().min(3).max(20).pattern(/^[a-zA-Z0-9_-]+$/).required().messages({'string.pattern.base': 'Username só letras, números, - e _'}),
    senha: Joi.string().min(6).required(),
    tipo: Joi.string().valid('admin', 'suporte', 'usuario').default('usuario'),
    email: Joi.string().email().allow('').optional(),  // Opcional
  }),
  medico: Joi.object({
    nome: Joi.string().min(3).required(),
    crm: Joi.string().pattern(/^[0-9]{4,7}$/).required(),
    observacoes: Joi.string().allow('').optional(),
    ativo: Joi.boolean().optional(),
    especialidades: Joi.array().min(1).required().items(Joi.object({
        id: Joi.number().integer().required(),
        is_primaria: Joi.boolean().required()
    })).message('Deve conter uma lista válida de especialidades com ID e is_primaria.'),
  }),
  plantao: Joi.object({
    medico_id: Joi.number().integer().required(),
    data: Joi.date().iso().required(),
    hora_inicio: Joi.string().pattern(/^[0-9]{2}:[0-9]{2}$/).required(),
    hora_fim: Joi.string().pattern(/^[0-9]{2}:[0-9]{2}$/).required(),
    status: Joi.string().valid('Agendado', 'Confirmado', 'Cancelado', 'Realizado').default('Agendado'),
    observacoes: Joi.string().allow('').optional(),
  }),
  especialidade: Joi.object({
    nome: Joi.string().min(2).required(),
    descricao: Joi.string().allow('').optional(),
  }),
};

export function validate(schema) {
  return (req, res, next) => {
    // Remove campos não obrigatórios do body para validar apenas o que é enviado
    const validationSchema = schema.unknown(false); 
    const { error } = validationSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    next();
  };
}
`
);

// =================================================================
// 6. routes/auth.js (Mantido o código de JWT, com alteração do perfil para tipo)
// =================================================================
fs.writeFileSync(
  path.join(backendDir, "routes/auth.js"),
  `
import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { open } from "sqlite";
import sqlite3 from "sqlite3";
import dotenv from "dotenv";
import { sendRecoveryToAdmin } from "../utils/emailService.js";

dotenv.config();
const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "chave-super-secreta";
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || "8h";

async function getDb() {
  return open({ filename: process.env.DB_PATH || "./database.db", driver: sqlite3.Database });
}

function gerarToken(usuario) {
  const payload = {
    id: usuario.id,
    username: usuario.username,
    tipo: usuario.tipo // Usando 'tipo' em vez de 'perfil' para ser consistente com DB
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: EXPIRES_IN });
}

// ================================================================
// 🔑 LOGIN
// ================================================================
router.post("/login", async (req, res) => {
  const { username, senha } = req.body;
  const db = await getDb();
  try {
    const user = await db.get("SELECT * FROM usuarios WHERE username = ?", [username.toLowerCase()]);
    if (!user) return res.status(400).json({ error: "Usuário não encontrado" });

    const match = await bcrypt.compare(senha, user.senha);
    if (!match) return res.status(400).json({ error: "Senha incorreta" });

    const token = gerarToken(user);
    await db.run("UPDATE usuarios SET primeiro_login = 0, atualizado_em = datetime('now') WHERE id = ?", [user.id]);
    res.json({ user: { id: user.id, username: user.username, tipo: user.tipo }, token });
  } catch (err) {
    console.error("❌ Erro no login:", err.message);
    res.status(500).json({ error: "Erro no login" });
  } finally {
    db.close();
  }
});

// ================================================================
// 🔒 MIDDLEWARE — Autenticação (autenticarToken)
// ================================================================
export function autenticarToken(req, res, next) {
  const header = req.headers["authorization"];
  const token = header && header.split(" ")[1];

  if (!token) {
    return res.status(401).json({ erro: "Token não fornecido" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ erro: "Token inválido ou expirado" });
    }
    req.user = user; // payload decodificado: {id, username, tipo}
    next();
  });
}

// ================================================================
// 🔒 MIDDLEWARE — Permissões por perfil (autorizarPerfis)
// ================================================================
export function autorizarPerfis(...perfisPermitidos) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ erro: "Não autenticado" });
    
    // Usa req.user.tipo em vez de req.user.perfil
    if (!perfisPermitidos.includes(req.user.tipo)) { 
      return res.status(403).json({ erro: "Acesso negado para seu perfil" });
    }
    next();
  };
}

// ================================================================
// ✅ TESTE RÁPIDO — /auth/check
// ================================================================
router.get("/check", autenticarToken, (req, res) => {
  res.json({
    msg: "Token válido",
    usuario: req.user
  });
});

// ================================================================
// 🔄 RECUPERAÇÃO E RESET DE SENHA (pro admin)
// ================================================================
router.post("/recuperar-senha", async (req, res) => {
  // Lógica de recuperação (Envia email para o Admin)
  const { username } = req.body;
  const db = await getDb();
  try {
    const user = await db.get("SELECT id, tipo FROM usuarios WHERE username = ?", [username.toLowerCase()]);
    if (!user) return res.status(404).json({ error: "Username não encontrado" });

    const token = jwt.sign({ id: user.id, action: "recover" }, JWT_SECRET, { expiresIn: "1h" });
    await sendRecoveryToAdmin(username, token);
    res.json({ msg: "Pedido enviado pro admin - aguarde aprovação" });
  } catch (err) {
    console.error("❌ Erro no pedido de recuperação:", err.message);
    res.status(500).json({ error: "Erro no pedido de recuperação" });
  } finally {
    db.close();
  }
});

router.post("/reset-senha/:token", async (req, res) => { 
  // Lógica de reset (Chamado pelo Admin)
  const { senha } = req.body;
  const { token } = req.params;
  const db = await getDb();
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.action !== "recover") return res.status(400).json({ error: "Token inválido" });

    const hash = await bcrypt.hash(senha, 12);
    await db.run("UPDATE usuarios SET senha = ? WHERE id = ?", [hash, decoded.id]);
    res.json({ msg: "Senha resetada pelo admin" });
  } catch (err) {
    res.status(400).json({ error: "Token expirado ou inválido" });
  } finally {
    db.close();
  }
});

export default router;
`
);

// =================================================================
// 7. routes/usuarios.js (Versão Final com async/await e bcrypt)
// =================================================================
fs.writeFileSync(
  path.join(backendDir, "routes/usuarios.js"),
  `
import express from "express";
import { open } from "sqlite";
import sqlite3 from "sqlite3";
import bcrypt from "bcrypt";
import { autenticarToken, autorizarPerfis } from "./auth.js"; // Importa utilitários do auth
import { schemas, validate } from "../middleware/validation.js";

const router = express.Router();
const SALT_ROUNDS = 10;

async function getDb() {
  return open({ filename: "./database.db", driver: sqlite3.Database });
}

// ==================================================
// 👥 GET - Listar todos os usuários (admin/suporte)
// ==================================================
router.get("/", autenticarToken, autorizarPerfis("admin", "suporte"), async (req, res) => {
  try {
    const db = await getDb();
    const users = await db.all(\`
      SELECT id, username, email, tipo, criado_em, atualizado_em
      FROM usuarios
      ORDER BY criado_em DESC
    \`);
    res.status(200).json(users);
  } catch (err) {
    console.error("❌ Erro ao listar usuários:", err.message);
    res.status(500).json({ error: "Erro ao listar usuários" });
  }
});

// ==================================================
// ➕ POST - Criar novo usuário (apenas admin)
// ==================================================
router.post("/", autenticarToken, autorizarPerfis("admin"), validate(schemas.usuario), async (req, res) => {
  try {
    const { username, email, senha, tipo } = req.body;

    const db = await getDb();

    // Verifica duplicidade de username
    const existente = await db.get("SELECT id FROM usuarios WHERE username = ?", [username.toLowerCase()]);
    if (existente) {
      return res.status(409).json({ error: "Username já cadastrado" });
    }

    // 🔒 Hash da senha
    const senhaHashed = await bcrypt.hash(senha, SALT_ROUNDS);

    await db.run(
      \`
      INSERT INTO usuarios (username, email, senha, tipo, criado_em)
      VALUES (?, ?, ?, ?, datetime('now'))
      \`,
      [username.toLowerCase(), email || null, senhaHashed, tipo]
    );

    res.status(201).json({ msg: "Usuário criado com sucesso" });
  } catch (err) {
    console.error("❌ Erro ao criar usuário:", err.message);
    res.status(500).json({ error: "Erro ao criar usuário" });
  }
});

// ==================================================
// ✏️ PUT - Atualizar usuário (apenas admin)
// ==================================================
router.put("/:id", autenticarToken, autorizarPerfis("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const { tipo, senha, email } = req.body; // Username não é atualizável

    if (!id) return res.status(400).json({ error: "ID não informado" });

    const db = await getDb();

    const campos = [];
    const valores = [];

    if (tipo) { campos.push("tipo = ?"); valores.push(tipo); }
    if (email !== undefined) { campos.push("email = ?"); valores.push(email || null); }

    if (senha) {
      const novaSenhaHashed = await bcrypt.hash(senha, SALT_ROUNDS);
      campos.push("senha = ?");
      valores.push(novaSenhaHashed);
    }

    if (campos.length === 0) {
      return res.status(400).json({ error: "Nenhum campo informado para atualização" });
    }

    campos.push("atualizado_em = datetime('now')");
    valores.push(id);

    const sql = \`UPDATE usuarios SET \${campos.join(", ")} WHERE id = ?\`;
    const result = await db.run(sql, valores);

    if (result.changes === 0) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    res.status(200).json({ msg: "Usuário atualizado com sucesso" });
  } catch (err) {
    console.error("❌ Erro ao atualizar usuário:", err.message);
    res.status(500).json({ error: "Erro ao atualizar usuário" });
  }
});

// ==================================================
// ❌ DELETE - Excluir usuário (apenas admin)
// ==================================================
router.delete("/:id", autenticarToken, autorizarPerfis("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDb();

    const result = await db.run("DELETE FROM usuarios WHERE id = ?", [id]);

    if (result.changes === 0) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    res.status(200).json({ msg: "Usuário excluído com sucesso" });
  } catch (err) {
    console.error("❌ Erro ao excluir usuário:", err.message);
    res.status(500).json({ error: "Erro ao excluir usuário" });
  }
});

export default router;
`
);

// =================================================================
// 8. routes/medicos.js (Versão Final com async/await e N:N)
// =================================================================
// Usando a versão que você validou.
fs.writeFileSync(
  path.join(backendDir, "routes/medicos.js"),
  `
import express from "express";
import { open } from "sqlite";
import sqlite3 from "sqlite3";
import { autenticarToken, autorizarPerfis } from "./auth.js";
import { schemas, validate } from "../middleware/validation.js";

const router = express.Router();

// 🧩 Conexão com o banco
async function getDb() {
  return open({ filename: "./database.db", driver: sqlite3.Database });
}

/**
 * ✅ GET - Lista todos os médicos com suas especialidades
 */
router.get("/", autenticarToken, async (req, res) => {
  try {
    const db = await getDb();
    const sql = \`
      SELECT 
        m.id,
        m.nome,
        m.crm,
        m.ativo,
        m.criado_em,
        m.observacoes,
        GROUP_CONCAT(
          e.nome || CASE WHEN me.is_primaria = 1 THEN ' (Primária)' ELSE '' END, ', '
        ) AS especialidades
      FROM medicos m
      LEFT JOIN medico_especialidade me ON m.id = me.medico_id
      LEFT JOIN especialidades e ON me.especialidade_id = e.id
      GROUP BY m.id
      ORDER BY m.nome ASC;
    \`;
    const medicos = await db.all(sql);
    res.json(medicos);
  } catch (err) {
    console.error("❌ Erro ao listar médicos:", err.message);
    res.status(500).json({ error: "Erro ao listar médicos" });
  }
});

/**
 * 🔍 GET /:id - Retorna um médico com todas as especialidades detalhadas
 */
router.get("/:id", autenticarToken, async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDb();

    const sql = \`
      SELECT 
        m.id, m.nome, m.crm, m.ativo, m.criado_em, m.observacoes, m.atualizado_em,
        e.id AS especialidade_id,
        e.nome AS especialidade_nome,
        me.is_primaria
      FROM medicos m
      LEFT JOIN medico_especialidade me ON m.id = me.medico_id
      LEFT JOIN especialidades e ON me.especialidade_id = e.id
      WHERE m.id = ?
    \`;

    const rows = await db.all(sql, [id]);
    if (rows.length === 0)
      return res.status(404).json({ error: "Médico não encontrado" });

    const medico = {
      id: rows[0].id,
      nome: rows[0].nome,
      crm: rows[0].crm,
      ativo: rows[0].ativo === 1,
      criado_em: rows[0].criado_em,
      atualizado_em: rows[0].atualizado_em,
      observacoes: rows[0].observacoes,
      especialidades: rows
        .filter((r) => r.especialidade_id)
        .map((r) => ({
          id: r.especialidade_id,
          nome: r.especialidade_nome,
          is_primaria: r.is_primaria === 1,
        })),
    };

    res.json(medico);
  } catch (err) {
    console.error("❌ Erro ao buscar médico:", err.message);
    res.status(500).json({ error: "Erro ao buscar médico" });
  }
});

/**
 * ➕ POST - Cadastra novo médico com especialidades
 */
router.post("/", autenticarToken, autorizarPerfis("admin"), validate(schemas.medico), async (req, res) => {
  const { nome, crm, observacoes, especialidades } = req.body;

  const primarias = especialidades.filter((e) => e.is_primaria);
  if (primarias.length !== 1)
    return res.status(400).json({ error: "Deve haver exatamente uma especialidade primária." });

  const db = await getDb();
  try {
    await db.run("BEGIN TRANSACTION;");

    // Verifica CRM duplicado antes de tudo
    const crmExistente = await db.get("SELECT id FROM medicos WHERE crm = ?", [crm]);
    if (crmExistente) {
      throw new Error("CRM já cadastrado.");
    }

    const { lastID } = await db.run(
      \`INSERT INTO medicos (nome, crm, observacoes, criado_em) VALUES (?, ?, ?, datetime('now'))\`,
      [nome, crm, observacoes || null]
    );

    for (const esp of especialidades) {
      await db.run(
        \`INSERT INTO medico_especialidade (medico_id, especialidade_id, is_primaria)
         VALUES (?, ?, ?)\`,
        [lastID, esp.id, esp.is_primaria ? 1 : 0]
      );
    }

    await db.run("COMMIT;");
    res.status(201).json({ id: lastID, nome, crm, especialidades });
  } catch (err) {
    await db.run("ROLLBACK;");
    console.error("❌ Erro ao cadastrar médico:", err.message);
    res.status(500).json({ error: err.message.includes("CRM já cadastrado") ? err.message : "Erro ao cadastrar médico" });
  }
});

/**
 * ✏️ PUT - Atualiza médico e especialidades
 */
router.put("/:id", autenticarToken, autorizarPerfis("admin"), async (req, res) => {
  const { id } = req.params;
  const { nome, crm, observacoes, ativo, especialidades } = req.body;

  if (!id) return res.status(400).json({ error: "ID não informado" });

  const db = await getDb();
  try {
    await db.run("BEGIN TRANSACTION;");

    const campos = [];
    const valores = [];

    if (nome) { campos.push("nome = ?"); valores.push(nome); }
    if (crm) { campos.push("crm = ?"); valores.push(crm); }
    if (observacoes !== undefined) { campos.push("observacoes = ?"); valores.push(observacoes || null); }
    if (ativo !== undefined) { campos.push("ativo = ?"); valores.push(ativo ? 1 : 0); }

    // 1. Atualizar dados do médico
    if (campos.length > 0) {
      campos.push("atualizado_em = datetime('now')");
      valores.push(id);
      const result = await db.run(\`UPDATE medicos SET \${campos.join(", ")} WHERE id = ?\`, valores);
      if (result.changes === 0) {
        throw new Error("Médico não encontrado para atualização.");
      }
    }

    // 2. Atualizar especialidades (se houver)
    if (Array.isArray(especialidades)) {
      const primarias = especialidades.filter((e) => e.is_primaria);
      if (primarias.length !== 1)
        throw new Error("Deve haver exatamente uma especialidade primária.");

      // Remove todas as ligações existentes
      await db.run("DELETE FROM medico_especialidade WHERE medico_id = ?", [id]);
      
      // Insere as novas
      for (const esp of especialidades) {
        await db.run(
          \`INSERT INTO medico_especialidade (medico_id, especialidade_id, is_primaria)
           VALUES (?, ?, ?)\`,
          [id, esp.id, esp.is_primaria ? 1 : 0]
        );
      }
    }

    await db.run("COMMIT;");
    res.json({ sucesso: true, id });
  } catch (err) {
    await db.run("ROLLBACK;");
    console.error("❌ Erro ao atualizar médico:", err.message);
    res.status(500).json({ error: err.message || "Erro ao atualizar médico" });
  }
});

/**
 * ❌ DELETE - Remove médico e vínculos
 */
router.delete("/:id", autenticarToken, autorizarPerfis("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDb();

    // A Foreign Key em plantoes (ON DELETE RESTRICT) vai evitar exclusão se houver plantão.
    // A Foreign Key em medico_especialidade (ON DELETE CASCADE) é tratada pela remoção de medicos.

    await db.run("BEGIN TRANSACTION;");
    // Remove ligações N:N
    await db.run("DELETE FROM medico_especialidade WHERE medico_id = ?", [id]); 
    
    // Remove o médico
    const result = await db.run("DELETE FROM medicos WHERE id = ?", [id]);
    await db.run("COMMIT;");

    if (result.changes === 0) {
      return res.status(404).json({ error: "Médico não encontrado" });
    }

    res.json({ sucesso: true });
  } catch (err) {
    await db.run("ROLLBACK;");
    console.error("❌ Erro ao excluir médico:", err.message);
    if (err.message.includes("SQLITE_CONSTRAINT")) {
      return res.status(409).json({ error: "Não é possível excluir: O médico possui plantões registrados." });
    }
    res.status(500).json({ error: "Erro ao excluir médico" });
  }
});

export default router;
`
);

// =================================================================
// 9. routes/plantoes.js (Versão Final com async/await e N:N)
// =================================================================
// A versão de plantões não usava async/await, então vamos forçar a conversão e aplicar a segurança.
fs.writeFileSync(
  path.join(backendDir, "routes/plantoes.js"),
  `
import express from "express";
import { open } from "sqlite";
import sqlite3 from "sqlite3";
import { autenticarToken, autorizarPerfis } from "./auth.js";
import { schemas, validate } from "../middleware/validation.js";

const router = express.Router();

async function getDb() {
  return open({ filename: "./database.db", driver: sqlite3.Database });
}

/**
 * ✅ GET - Lista todos os plantões com informações completas do médico
 */
router.get("/", autenticarToken, async (req, res) => {
  try {
    const db = await getDb();
    const sql = \`
      SELECT 
        p.id,
        p.data,
        p.hora_inicio,
        p.hora_fim,
        p.status,
        m.nome AS medico_nome,
        m.crm,
        GROUP_CONCAT(e.nome, ', ') AS especialidades
      FROM plantoes p
      LEFT JOIN medicos m ON p.medico_id = m.id
      LEFT JOIN medico_especialidade me ON m.id = me.medico_id
      LEFT JOIN especialidades e ON me.especialidade_id = e.id
      GROUP BY p.id
      ORDER BY p.data DESC, p.hora_inicio ASC;
    \`;

    const rows = await db.all(sql);
    res.json(rows);
  } catch (err) {
    console.error("❌ Erro ao listar plantões:", err.message);
    res.status(500).json({ error: "Erro ao listar plantões" });
  }
});

/**
 * 🔍 GET /filtro - Filtro de plantões por data, médico ou especialidade
 */
router.get("/filtro", autenticarToken, async (req, res) => {
  const { data, medico_id, especialidade_id } = req.query;

  let sql = \`
    SELECT 
      p.id,
      p.data,
      p.hora_inicio,
      p.hora_fim,
      m.nome AS medico_nome,
      p.status,
      GROUP_CONCAT(e.nome, ', ') AS especialidades
    FROM plantoes p
    LEFT JOIN medicos m ON p.medico_id = m.id
    LEFT JOIN medico_especialidade me ON m.id = me.medico_id
    LEFT JOIN especialidades e ON me.especialidade_id = e.id
    WHERE 1=1
  \`;
  const params = [];

  if (data) {
    sql += " AND p.data = ?";
    params.push(data);
  }
  if (medico_id) {
    sql += " AND p.medico_id = ?";
    params.push(medico_id);
  }
  if (especialidade_id) {
    sql += " AND e.id = ?";
    params.push(especialidade_id);
  }

  sql += " GROUP BY p.id ORDER BY p.data DESC;";

  try {
    const db = await getDb();
    const rows = await db.all(sql, params);
    res.json(rows);
  } catch (err) {
    console.error("❌ Erro no filtro de plantões:", err.message);
    res.status(500).json({ error: "Erro ao aplicar filtro" });
  }
});

/**
 * ➕ POST - Cria novo plantão
 */
router.post("/", autenticarToken, autorizarPerfis("admin", "suporte"), validate(schemas.plantao), async (req, res) => {
  const { medico_id, data, hora_inicio, hora_fim, status, observacoes } = req.body;
  const criado_por = req.user.id; // ID do usuário logado

  try {
    const db = await getDb();
    const result = await db.run(
      \`
      INSERT INTO plantoes (medico_id, data, hora_inicio, hora_fim, status, observacoes, criado_em, criado_por)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'), ?)
      \`,
      [medico_id, data, hora_inicio, hora_fim, status || "Agendado", observacoes || null, criado_por]
    );

    res.status(201).json({
      id: result.lastID,
      medico_id,
      data,
      hora_inicio,
      hora_fim,
      status: status || "Agendado",
    });
  } catch (err) {
    console.error("❌ Erro ao criar plantão:", err.message);
    res.status(500).json({ error: "Erro ao criar plantão" });
  }
});

/**
 * ✏️ PUT - Atualiza plantão
 */
router.put("/:id", autenticarToken, autorizarPerfis("admin", "suporte"), async (req, res) => {
  const { id } = req.params;
  const { medico_id, data, hora_inicio, hora_fim, status, observacoes } = req.body;

  const campos = [];
  const valores = [];

  if (medico_id) { campos.push("medico_id = ?"); valores.push(medico_id); }
  if (data) { campos.push("data = ?"); valores.push(data); }
  if (hora_inicio) { campos.push("hora_inicio = ?"); valores.push(hora_inicio); }
  if (hora_fim) { campos.push("hora_fim = ?"); valores.push(hora_fim); }
  if (status) { campos.push("status = ?"); valores.push(status); }
  if (observacoes !== undefined) { campos.push("observacoes = ?"); valores.push(observacoes || null); } 

  if (campos.length === 0) {
    return res.status(400).json({ error: "Nenhum campo informado para atualização" });
  }

  campos.push("atualizado_em = datetime('now')");
  valores.push(id);

  try {
    const db = await getDb();
    const result = await db.run(
      \`UPDATE plantoes SET \${campos.join(", ")} WHERE id=?\`,
      valores
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: "Plantão não encontrado" });
    }

    res.json({ sucesso: true });
  } catch (err) {
    console.error("❌ Erro ao atualizar plantão:", err.message);
    res.status(500).json({ error: "Erro ao atualizar plantão" });
  }
});

/**
 * ❌ DELETE - Remove plantão
 */
router.delete("/:id", autenticarToken, autorizarPerfis("admin", "suporte"), async (req, res) => {
  const { id } = req.params;
  try {
    const db = await getDb();
    const result = await db.run("DELETE FROM plantoes WHERE id=?", [id]);

    if (result.changes === 0) {
      return res.status(404).json({ error: "Plantão não encontrado" });
    }

    res.json({ sucesso: true });
  } catch (err) {
    console.error("❌ Erro ao excluir plantão:", err.message);
    res.status(500).json({ error: "Erro ao excluir plantão" });
  }
});

/**
 * 📊 POST /relatorio - Gera relatório de plantões por intervalo de datas
 */
router.post("/relatorio", autenticarToken, autorizarPerfis("admin", "suporte"), async (req, res) => {
  const { dataInicio, dataFim } = req.body;

  const sql = \`
    SELECT 
      m.nome AS medico,
      GROUP_CONCAT(e.nome, ', ') AS especialidades,
      p.data,
      p.hora_inicio,
      p.hora_fim,
      p.status
    FROM plantoes p
    LEFT JOIN medicos m ON p.medico_id = m.id
    LEFT JOIN medico_especialidade me ON m.id = me.medico_id
    LEFT JOIN especialidades e ON me.especialidade_id = e.id
    WHERE p.data BETWEEN ? AND ?
    GROUP BY p.id
    ORDER BY p.data ASC, p.hora_inicio ASC;
  \`;

  try {
    const db = await getDb();
    const rows = await db.all(sql, [dataInicio || "1900-01-01", dataFim || "2999-12-31"]);

    res.json({
      periodo: { de: dataInicio, ate: dataFim },
      total: rows.length,
      registros: rows,
    });
  } catch (err) {
    console.error("❌ Erro ao gerar relatório:", err.message);
    res.status(500).json({ error: "Erro ao gerar relatório" });
  }
});

export default router;
`
);

// =================================================================
// 10. routes/especialidades.js (Nova Rota Final)
// =================================================================
fs.writeFileSync(
  path.join(backendDir, "routes/especialidades.js"),
  `
// routes/especialidades.js
import express from "express";
import { open } from "sqlite";
import sqlite3 from "sqlite3";
import { autenticarToken, autorizarPerfis } from "./auth.js";
import { schemas, validate } from "../middleware/validation.js";

const router = express.Router();

async function getDb() {
  return open({ filename: "./database.db", driver: sqlite3.Database });
}

/**
 * ✅ GET - Lista todas as especialidades
 */
router.get("/", autenticarToken, async (req, res) => {
  try {
    const db = await getDb();
    const especialidades = await db.all(
      \`SELECT id, nome, descricao, criado_em FROM especialidades ORDER BY nome ASC\`
    );
    res.json(especialidades);
  } catch (err) {
    console.error("❌ Erro ao listar especialidades:", err.message);
    res.status(500).json({ error: "Erro ao listar especialidades" });
  }
});

/**
 * ➕ POST - Cria nova especialidade
 */
router.post("/", autenticarToken, autorizarPerfis("admin"), validate(schemas.especialidade), async (req, res) => {
  try {
    const { nome, descricao } = req.body;

    const db = await getDb();

    const existente = await db.get("SELECT id FROM especialidades WHERE nome = ?", [nome]);
    if (existente) {
      return res.status(409).json({ error: "Especialidade já cadastrada" });
    }

    const result = await db.run(
      \`INSERT INTO especialidades (nome, descricao, criado_em) VALUES (?, ?, datetime('now'))\`,
      [nome, descricao || null]
    );

    res.status(201).json({ id: result.lastID, nome, descricao });
  } catch (err) {
    console.error("❌ Erro ao criar especialidade:", err.message);
    res.status(500).json({ error: "Erro ao criar especialidade" });
  }
});

/**
 * ✏️ PUT - Atualiza especialidade
 */
router.put("/:id", autenticarToken, autorizarPerfis("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, descricao } = req.body;

    if (!id) return res.status(400).json({ error: "ID não informado" });

    const db = await getDb();
    
    const campos = [];
    const valores = [];

    if (nome) { campos.push("nome = ?"); valores.push(nome); }
    if (descricao !== undefined) { campos.push("descricao = ?"); valores.push(descricao || null); } 

    if (campos.length === 0) {
      return res.status(400).json({ error: "Nenhum campo informado para atualização" });
    }
    
    campos.push("atualizado_em = datetime('now')");
    valores.push(id);

    const result = await db.run(
      \`UPDATE especialidades SET \${campos.join(", ")} WHERE id = ?\`,
      valores
    );

    if (result.changes === 0) {
        return res.status(404).json({ error: "Especialidade não encontrada" });
    }

    res.status(200).json({ msg: "Especialidade atualizada com sucesso" });
  } catch (err) {
    console.error("❌ Erro ao atualizar especialidade:", err.message);
    res.status(500).json({ error: "Erro ao atualizar especialidade" });
  }
});

/**
 * ❌ DELETE - Excluir especialidade
 */
router.delete("/:id", autenticarToken, autorizarPerfis("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDb();

    // A FOREIGN KEY CASCADE em medico_especialidade garante a remoção de vínculos
    const result = await db.run("DELETE FROM especialidades WHERE id = ?", [id]);

    if (result.changes === 0) {
        return res.status(404).json({ error: "Especialidade não encontrada" });
    }
    
    res.status(200).json({ msg: "Especialidade excluída com sucesso" });
  } catch (err) {
    console.error("❌ Erro ao excluir especialidade:", err.message);
    res.status(500).json({ error: "Erro ao excluir especialidade. Verifique se está em uso." });
  }
});

export default router;
`
);

// =================================================================
// 11. routes/status.js (Nova Rota Final)
// =================================================================
fs.writeFileSync(
  path.join(backendDir, "routes/status.js"),
  `
import express from "express";
import { open } from "sqlite";
import sqlite3 from "sqlite3";

const router = express.Router();

async function getDb() {
  return open({ filename: "./database.db", driver: sqlite3.Database });
}

/**
 * 💚 GET / - Health Check
 * Verifica se o servidor está rodando e se a conexão com o banco de dados está OK.
 */
router.get("/", async (req, res) => {
  let dbConnection = null;
  
  try {
    const status = {
      api: "OK",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: "TESTANDO..."
    };

    // Tenta conectar e consultar o banco de dados
    dbConnection = await getDb();
    await dbConnection.get("SELECT 1 AS status"); 

    status.database = "OK";
    
    res.status(200).json(status);

  } catch (err) {
    console.error("❌ Erro no Health Check do Banco de Dados:", err.message);
    
    res.status(503).json({ 
      api: "OK", 
      database: "ERRO", 
      error_message: "Não foi possível conectar ou consultar o banco de dados." 
    });

  }
});

export default router;
`
);


console.log("✅ Backend v2 gerado: Username + senha pros users, email só admin pra recuperação!");