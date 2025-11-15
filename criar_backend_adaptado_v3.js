// criar_backend_adaptado_v3.js — VERSÃO COMPLETA (tudo em 1 arquivo)
// Gera todo o backend dentro de backend_node (DB em backend_node/db/database.db).
// Rodar: node criar_backend_adaptado_v3.js

import fs from "fs";
import path from "path";

const root = process.cwd();
const backendDir = path.join(root, "backend_node");

// cria pastas
const folders = ["db", "routes", "utils", "middleware", "logs"];
folders.forEach((f) => fs.mkdirSync(path.join(backendDir, f), { recursive: true }));

/* --------------------------
 package.json
---------------------------*/
fs.writeFileSync(
  path.join(backendDir, "package.json"),
  JSON.stringify(
    {
      name: "backend_node_v3",
      version: "3.0.0",
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
        joi: "^17.13.3",
        winston: "^3.13.0",
        "express-rate-limit": "^7.1.5",
        nodemailer: "^6.9.13",
      },
      devDependencies: { nodemon: "^3.0.2" },
    },
    null,
    2
  )
);

/* --------------------------
 .env (exemplo)
---------------------------*/
fs.writeFileSync(
  path.join(backendDir, ".env"),
  `PORT=5000
JWT_SECRET=troque_essa_chave_super_secreta
DB_PATH=./db/database.db
JWT_EXPIRES_IN=8h
CORS_ORIGIN=http://localhost:5173
NODEMAILER_HOST=smtp.gmail.com
NODEMAILER_PORT=587
NODEMAILER_USER=seu_email@empresa.com
NODEMAILER_PASS=sua_senha_app
ADMIN_EMAIL=admin@alpha.com
`
);

/* --------------------------
 server.js
---------------------------*/
fs.writeFileSync(
  path.join(backendDir, "server.js"),
  `import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import winston from "winston";

dotenv.config();

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    new winston.transports.File({ filename: "logs/error.log", level: "error" }),
    new winston.transports.File({ filename: "logs/combined.log" }),
    new winston.transports.Console(),
  ],
});

const app = express();
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));
app.use(helmet());
app.use(express.json({ limit: "20mb" }));
app.use(cors({ origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : "*" }));

// rotas
import authRoutes from "./routes/auth.js";
import usuariosRoutes from "./routes/usuarios.js";
import medicosRoutes from "./routes/medicos.js";
import plantoesRoutes from "./routes/plantoes.js";
import especialidadesRoutes from "./routes/especialidades.js";
import atendimentosRoutes from "./routes/atendimentos.js";
import relatoriosRoutes from "./routes/relatorios.js";
import statusRoutes from "./routes/status.js";

app.use("/auth", authRoutes);
app.use("/usuarios", usuariosRoutes);
app.use("/medicos", medicosRoutes);
app.use("/plantoes", plantoesRoutes);
app.use("/especialidades", especialidadesRoutes);
app.use("/atendimentos", atendimentosRoutes);
app.use("/relatorio", relatoriosRoutes);
app.use("/status", statusRoutes);

// 404
app.use((req, res) => res.status(404).json({ error: "Rota não encontrada" }));

// error handler
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({ error: "Erro interno do servidor" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('✅ Backend V3 rodando na porta', PORT);
});
`
);

/* --------------------------
 utils/database.js
---------------------------*/
fs.writeFileSync(
  path.join(backendDir, "utils", "database.js"),
  `import sqlite3 from "sqlite3";
import dotenv from "dotenv";
import path from "path";
dotenv.config();

const DB_FILE = path.resolve(process.env.DB_PATH || "./db/database.db");
const db = new sqlite3.Database(DB_FILE);

export default {
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve(this);
      });
    });
  },
  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },
  close() {
    return new Promise((resolve) => db.close(resolve));
  }
};
`
);

/* --------------------------
 db/init.js (cria DB dentro de backend_node/db)
---------------------------*/
fs.writeFileSync(
  path.join(backendDir, "db", "init.js"),
  `import sqlite3 from "sqlite3";
import { open } from "sqlite";
import path from "path";
import fs from "fs";

const DB_FILE = path.join(process.cwd(), process.env.DB_PATH || "./db/database.db");
const DB_DIR = path.dirname(DB_FILE);
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

async function init() {
  const db = await open({ filename: DB_FILE, driver: sqlite3.Database });

  await db.exec(\`
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
\`);
  console.log("✅ DB inicializado em", DB_FILE);
  await db.close();
}

init().catch((e) => console.error("Erro init DB:", e));
`
);

/* --------------------------
 db/seed.js
---------------------------*/
fs.writeFileSync(
  path.join(backendDir, "db", "seed.js"),
  `import { open } from "sqlite";
import sqlite3 from "sqlite3";
import bcrypt from "bcrypt";

const DB_FILE = process.env.DB_PATH || "./db/database.db";

async function seed() {
  const db = await open({ filename: DB_FILE, driver: sqlite3.Database });
  const SALT = 12;

  // admin
  const adminPass = await bcrypt.hash("admin123", SALT);
  await db.run("INSERT OR IGNORE INTO usuarios (username, email, senha, tipo, criado_em) VALUES (?, ?, ?, ?, datetime('now'))", [
    "admin",
    "admin@alpha.com",
    adminPass,
    "admin",
  ]);

  // especialidades
  const especialidades = [
    { nome: "Cardiologia", descricao: "Doenças do coração" },
    { nome: "Clínica Geral", descricao: "Atendimento primário" },
    { nome: "Pediatria", descricao: "Saúde infantil" },
    { nome: "Ortopedia", descricao: "Sistema músculo-esquelético" }
  ];

  const ids = {};
  for (const e of especialidades) {
    const r = await db.run("INSERT OR IGNORE INTO especialidades (nome, descricao, criado_em) VALUES (?, ?, datetime('now'))", [e.nome, e.descricao]);
    let id = r.lastID;
    if (!id) {
      const ex = await db.get("SELECT id FROM especialidades WHERE nome = ?", [e.nome]);
      id = ex.id;
    }
    ids[e.nome] = id;
  }

  // medicos
  const medicos = [
    { nome: "Dr. Ana C.", crm: "CRM1000", prim: "Cardiologia", secs: ["Clínica Geral"] },
    { nome: "Dr. Beto S.", crm: "CRM2000", prim: "Pediatria", secs: [] },
    { nome: "Dr. Carlos D.", crm: "CRM3000", prim: "Clínica Geral", secs: ["Ortopedia"] }
  ];

  for (const m of medicos) {
    const r = await db.run("INSERT OR IGNORE INTO medicos (nome, crm, observacoes, criado_em) VALUES (?, ?, ?, datetime('now'))", [m.nome, m.crm, "seed"]);
    let medId = r.lastID;
    if (!medId) {
      const ex = await db.get("SELECT id FROM medicos WHERE crm = ?", [m.crm]);
      medId = ex.id;
    }
    await db.run("DELETE FROM medico_especialidade WHERE medico_id = ?", [medId]);
    await db.run("INSERT OR IGNORE INTO medico_especialidade (medico_id, especialidade_id, is_primaria) VALUES (?, ?, 1)", [medId, ids[m.prim]]);
    for (const s of m.secs) {
      await db.run("INSERT OR IGNORE INTO medico_especialidade (medico_id, especialidade_id, is_primaria) VALUES (?, ?, 0)", [medId, ids[s]]);
    }
  }

  console.log("✅ Seed finalizado");
  await db.close();
}

seed().catch((e) => console.error("Erro seed:", e));
`
);

/* --------------------------
 utils/emailService.js
---------------------------*/
fs.writeFileSync(
  path.join(backendDir, "utils", "emailService.js"),
  `import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.NODEMAILER_HOST,
  port: process.env.NODEMAILER_PORT,
  secure: false,
  auth: {
    user: process.env.NODEMAILER_USER,
    pass: process.env.NODEMAILER_PASS,
  },
});

export async function sendRecoveryToAdmin(username, token) {
  const admin = process.env.ADMIN_EMAIL;
  const info = {
    from: process.env.NODEMAILER_USER,
    to: admin,
    subject: "Pedido de recuperação de senha",
    html: \`<p>Usuário <strong>\${username}</strong> solicitou recuperação.</p><p>Token: <strong>\${token}</strong></p>\`,
  };
  return transporter.sendMail(info);
}
`
);

/* --------------------------
 utils/migrate.js
---------------------------*/
fs.writeFileSync(
  path.join(backendDir, "utils", "migrate.js"),
  `import { open } from "sqlite";
import sqlite3 from "sqlite3";
import fs from "fs";
import path from "path";

const DB_FILE = process.env.DB_PATH || "./db/database.db";

async function main() {
  console.log("⚠️ Migrate helper: use db/init.js + db/seed.js para setup inicial.");
}

main().catch(console.error);
`
);

/* --------------------------
 middleware/logRequest.js (auditoria)
---------------------------*/
fs.writeFileSync(
  path.join(backendDir, "middleware", "logRequest.js"),
  `import { open } from "sqlite";
import sqlite3 from "sqlite3";
import dotenv from "dotenv";
dotenv.config();

const DB_FILE = process.env.DB_PATH || "./db/database.db";

export async function logRequest(req, res, next) {
  try {
    const db = await open({ filename: DB_FILE, driver: sqlite3.Database });
    const user = req.user ? req.user.username : null;
    await db.run(
      "INSERT INTO audit_logs (rota, metodo, usuario, ip, payload, resultado) VALUES (?, ?, ?, ?, ?, ?)",
      [req.path, req.method, user, req.ip, JSON.stringify(req.body || {}), null]
    );
    await db.close();
  } catch (e) {
    // não bloquear requisição se falhar log
    console.error("Erro audit log:", e.message);
  } finally {
    next();
  }
}
`
);

/* --------------------------
 middleware/auth.js (JWT + roles)
---------------------------*/
fs.writeFileSync(
  path.join(backendDir, "middleware", "auth.js"),
  `import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "troque_essa_chave";

export function autenticarToken(req, res, next) {
  const header = req.headers["authorization"];
  const token = header && header.split(" ")[1];
  if (!token) return res.status(401).json({ erro: "Token não fornecido" });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ erro: "Token inválido" });
    req.user = user;
    next();
  });
}

export function autorizarPerfis(...perfisPermitidos) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ erro: "Não autenticado" });
    if (!perfisPermitidos.includes(req.user.tipo)) return res.status(403).json({ erro: "Acesso negado" });
    next();
  };
}
`
);

/* --------------------------
 middleware/validation.js (reuso)
---------------------------*/
fs.writeFileSync(
  path.join(backendDir, "middleware", "validation.js"),
  `import Joi from "joi";

export const schemas = {
  usuario: Joi.object({
    username: Joi.string().min(3).max(30).pattern(/^[a-zA-Z0-9_-]+$/).required(),
    senha: Joi.string().min(6).required(),
    tipo: Joi.string().valid("admin", "suporte", "usuario").default("usuario"),
    email: Joi.string().email().allow("").optional(),
  }),
  medico: Joi.object({
    nome: Joi.string().min(3).required(),
    crm: Joi.string().pattern(/^[A-Za-z0-9-]{3,20}$/).required(),
    observacoes: Joi.string().allow("").optional(),
    ativo: Joi.boolean().optional(),
    especialidades: Joi.array().min(1).items(
      Joi.object({ id: Joi.number().integer().required(), is_primaria: Joi.boolean().required() })
    ).required()
  }),
  plantao: Joi.object({
    medico_id: Joi.number().integer().required(),
    data: Joi.date().iso().required(),
    hora_inicio: Joi.string().pattern(/^[0-9]{2}:[0-9]{2}$/).required(),
    hora_fim: Joi.string().pattern(/^[0-9]{2}:[0-9]{2}$/).required(),
    status: Joi.string().valid("Agendado", "Confirmado", "Cancelado", "Realizado").default("Agendado"),
    observacoes: Joi.string().allow("").optional()
  }),
  especialidade: Joi.object({
    nome: Joi.string().min(2).required(),
    descricao: Joi.string().allow("").optional(),
  })
};

export function validate(schema) {
  return (req, res, next) => {
    const { error } = schema.unknown(false).validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    next();
  };
}
`
);

/* --------------------------
 routes/auth.js
---------------------------*/
fs.writeFileSync(
  path.join(backendDir, "routes", "auth.js"),
  `import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { open } from "sqlite";
import sqlite3 from "sqlite3";
import dotenv from "dotenv";
import { sendRecoveryToAdmin } from "../utils/emailService.js";

dotenv.config();
const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "troque_essa_chave";
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || "8h";
const DB_FILE = process.env.DB_PATH || "./db/database.db";

function gerarToken(usuario) {
  return jwt.sign({ id: usuario.id, username: usuario.username, tipo: usuario.tipo }, JWT_SECRET, { expiresIn: EXPIRES_IN });
}

router.post("/login", async (req, res) => {
  const { username, senha } = req.body;
  const db = await open({ filename: DB_FILE, driver: sqlite3.Database });
  try {
    const user = await db.get("SELECT * FROM usuarios WHERE username = ?", [username.toLowerCase()]);
    if (!user) return res.status(400).json({ error: "Usuário não encontrado" });
    const match = await bcrypt.compare(senha, user.senha);
    if (!match) return res.status(400).json({ error: "Senha incorreta" });
    const token = gerarToken(user);
    await db.run("UPDATE usuarios SET primeiro_login = 0, atualizado_em = datetime('now') WHERE id = ?", [user.id]);
    res.json({ user: { id: user.id, username: user.username, tipo: user.tipo }, token });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro no login" });
  } finally {
    db.close();
  }
});

router.get("/check", (req, res) => {
  const header = req.headers["authorization"];
  const token = header && header.split(" ")[1];
  if (!token) return res.status(401).json({ erro: "Token não fornecido" });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ erro: "Token inválido" });
    res.json({ ok: true, usuario: user });
  });
});

// recuperar senha (gera token e envia pro admin)
router.post("/recuperar-senha", async (req, res) => {
  const { username } = req.body;
  const db = await open({ filename: DB_FILE, driver: sqlite3.Database });
  try {
    const user = await db.get("SELECT id FROM usuarios WHERE username = ?", [username.toLowerCase()]);
    if (!user) return res.status(404).json({ error: "Username não encontrado" });
    const token = jwt.sign({ id: user.id, action: "recover" }, JWT_SECRET, { expiresIn: "1h" });
    await sendRecoveryToAdmin(username, token);
    res.json({ msg: "Pedido enviado ao admin" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro na recuperação" });
  } finally {
    db.close();
  }
});

// reset senha (admin usa token)
router.post("/reset-senha/:token", async (req, res) => {
  const { senha } = req.body;
  const { token } = req.params;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.action !== "recover") return res.status(400).json({ error: "Token inválido" });
    const db = await open({ filename: DB_FILE, driver: sqlite3.Database });
    const hash = await bcrypt.hash(senha, 12);
    await db.run("UPDATE usuarios SET senha = ?, atualizado_em = datetime('now') WHERE id = ?", [hash, decoded.id]);
    await db.close();
    res.json({ msg: "Senha resetada" });
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: "Token inválido ou expirado" });
  }
});

export default router;
`
);

/* --------------------------
 routes/usuarios.js
---------------------------*/
fs.writeFileSync(
  path.join(backendDir, "routes", "usuarios.js"),
  `import express from "express";
import { open } from "sqlite";
import sqlite3 from "sqlite3";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import { autenticarToken, autorizarPerfis } from "../middleware/auth.js";
import { schemas, validate } from "../middleware/validation.js";

dotenv.config();
const router = express.Router();
const DB_FILE = process.env.DB_PATH || "./db/database.db";
const SALT_ROUNDS = 10;

router.get("/", autenticarToken, autorizarPerfis("admin", "suporte"), async (req, res) => {
  const db = await open({ filename: DB_FILE, driver: sqlite3.Database });
  try {
    const users = await db.all("SELECT id, username, email, tipo, criado_em, atualizado_em FROM usuarios ORDER BY criado_em DESC");
    res.json(users);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao listar usuários" });
  } finally { db.close(); }
});

router.post("/", autenticarToken, autorizarPerfis("admin"), validate(schemas.usuario), async (req, res) => {
  const { username, email, senha, tipo } = req.body;
  const db = await open({ filename: DB_FILE, driver: sqlite3.Database });
  try {
    const exist = await db.get("SELECT id FROM usuarios WHERE username = ?", [username.toLowerCase()]);
    if (exist) return res.status(409).json({ error: "Username já cadastrado" });
    const hash = await bcrypt.hash(senha, SALT_ROUNDS);
    await db.run("INSERT INTO usuarios (username, email, senha, tipo, criado_em) VALUES (?, ?, ?, ?, datetime('now'))", [username.toLowerCase(), email || null, hash, tipo]);
    res.status(201).json({ msg: "Usuário criado" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao criar usuário" });
  } finally { db.close(); }
});

router.put("/:id", autenticarToken, autorizarPerfis("admin"), async (req, res) => {
  const { id } = req.params;
  const { tipo, senha, email } = req.body;
  const db = await open({ filename: DB_FILE, driver: sqlite3.Database });
  try {
    const campos = []; const valores = [];
    if (tipo) { campos.push("tipo = ?"); valores.push(tipo); }
    if (email !== undefined) { campos.push("email = ?"); valores.push(email || null); }
    if (senha) { const hash = await bcrypt.hash(senha, SALT_ROUNDS); campos.push("senha = ?"); valores.push(hash); }
    if (campos.length === 0) return res.status(400).json({ error: "Nenhum campo para atualizar" });
    campos.push("atualizado_em = datetime('now')"); valores.push(id);
    const sql = \`UPDATE usuarios SET \${campos.join(", ")} WHERE id = ?\`;
    const result = await db.run(sql, valores);
    if (result.changes === 0) return res.status(404).json({ error: "Usuário não encontrado" });
    res.json({ msg: "Atualizado" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao atualizar usuário" });
  } finally { db.close(); }
});

router.delete("/:id", autenticarToken, autorizarPerfis("admin"), async (req, res) => {
  const { id } = req.params;
  const db = await open({ filename: DB_FILE, driver: sqlite3.Database });
  try {
    const result = await db.run("DELETE FROM usuarios WHERE id = ?", [id]);
    if (result.changes === 0) return res.status(404).json({ error: "Usuário não encontrado" });
    res.json({ msg: "Excluído" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao excluir" });
  } finally { db.close(); }
});

export default router;
`
);

/* --------------------------
 routes/medicos.js
---------------------------*/
fs.writeFileSync(
  path.join(backendDir, "routes", "medicos.js"),
  `import express from "express";
import { open } from "sqlite";
import sqlite3 from "sqlite3";
import { autenticarToken, autorizarPerfis } from "../middleware/auth.js";
import { schemas, validate } from "../middleware/validation.js";
import dotenv from "dotenv";
dotenv.config();

const router = express.Router();
const DB_FILE = process.env.DB_PATH || "./db/database.db";

/** LIST */
router.get("/", autenticarToken, async (req, res) => {
  const db = await open({ filename: DB_FILE, driver: sqlite3.Database });
  try {
    const sql = \`
      SELECT m.id, m.nome, m.crm, m.ativo, m.criado_em, m.observacoes,
        GROUP_CONCAT(e.nome || CASE WHEN me.is_primaria = 1 THEN ' (Primária)' ELSE '' END, ', ') AS especialidades
      FROM medicos m
      LEFT JOIN medico_especialidade me ON m.id = me.medico_id
      LEFT JOIN especialidades e ON me.especialidade_id = e.id
      GROUP BY m.id ORDER BY m.nome ASC
    \`;
    const rows = await db.all(sql);
    res.json(rows);
  } catch (e) {
    console.error(e); res.status(500).json({ error: "Erro ao listar médicos" });
  } finally { db.close(); }
});

/** GET by id */
router.get("/:id", autenticarToken, async (req, res) => {
  const { id } = req.params; const db = await open({ filename: DB_FILE, driver: sqlite3.Database });
  try {
    const rows = await db.all(\`
      SELECT m.id,m.nome,m.crm,m.ativo,m.criado_em,m.observacoes,m.atualizado_em,
             e.id AS especialidade_id, e.nome AS especialidade_nome, me.is_primaria
      FROM medicos m
      LEFT JOIN medico_especialidade me ON m.id = me.medico_id
      LEFT JOIN especialidades e ON me.especialidade_id = e.id
      WHERE m.id = ?\`, [id]);
    if (rows.length === 0) return res.status(404).json({ error: "Médico não encontrado" });
    const medico = {
      id: rows[0].id, nome: rows[0].nome, crm: rows[0].crm, ativo: rows[0].ativo === 1,
      criado_em: rows[0].criado_em, atualizado_em: rows[0].atualizado_em, observacoes: rows[0].observacoes,
      especialidades: rows.filter(r => r.especialidade_id).map(r => ({ id: r.especialidade_id, nome: r.especialidade_nome, is_primaria: r.is_primaria === 1 }))
    };
    res.json(medico);
  } catch (e) { console.error(e); res.status(500).json({ error: "Erro ao buscar médico" }); } finally { db.close(); }
});

/** SEARCH (medicos/pesquisa) */
router.get("/pesquisa", autenticarToken, async (req, res) => {
  const { nome, crm } = req.query;
  const db = await open({ filename: DB_FILE, driver: sqlite3.Database });
  try {
    const rows = await db.all(
      \`SELECT * FROM medicos WHERE (? IS NULL OR nome LIKE '%'||?||'%') AND (? IS NULL OR crm LIKE '%'||?||'%')\`,
      [nome || null, nome || null, crm || null, crm || null]
    );
    res.json(rows);
  } catch (e) { console.error(e); res.status(500).json({ error: "Erro na pesquisa" }); } finally { db.close(); }
});

/** CREATE */
router.post("/", autenticarToken, autorizarPerfis("admin"), validate(schemas.medico), async (req, res) => {
  const { nome, crm, observacoes, especialidades } = req.body;
  if (!Array.isArray(especialidades) || especialidades.length === 0) return res.status(400).json({ error: "Especialidades obrigatórias" });
  const prim = especialidades.filter(e => e.is_primaria);
  if (prim.length !== 1) return res.status(400).json({ error: "Deve ter exatamente 1 especialidade primária" });

  const db = await open({ filename: DB_FILE, driver: sqlite3.Database });
  try {
    await db.run("BEGIN TRANSACTION");
    const exists = await db.get("SELECT id FROM medicos WHERE crm = ?", [crm]);
    if (exists) { await db.run("ROLLBACK"); return res.status(409).json({ error: "CRM já cadastrado" }); }
    const r = await db.run("INSERT INTO medicos (nome, crm, observacoes, criado_em) VALUES (?, ?, ?, datetime('now'))", [nome, crm, observacoes || null]);
    const id = r.lastID;
    for (const esp of especialidades) {
      await db.run("INSERT INTO medico_especialidade (medico_id, especialidade_id, is_primaria) VALUES (?, ?, ?)", [id, esp.id, esp.is_primaria ? 1 : 0]);
    }
    await db.run("COMMIT");
    res.status(201).json({ id, nome, crm });
  } catch (e) {
    await db.run("ROLLBACK");
    console.error(e); res.status(500).json({ error: "Erro ao cadastrar médico" });
  } finally { db.close(); }
});

/** UPDATE */
router.put("/:id", autenticarToken, autorizarPerfis("admin"), async (req, res) => {
  const { id } = req.params;
  const { nome, crm, observacoes, ativo, especialidades } = req.body;
  const db = await open({ filename: DB_FILE, driver: sqlite3.Database });
  try {
    await db.run("BEGIN TRANSACTION");
    const campos = []; const valores = [];
    if (nome) { campos.push("nome = ?"); valores.push(nome); }
    if (crm) { campos.push("crm = ?"); valores.push(crm); }
    if (observacoes !== undefined) { campos.push("observacoes = ?"); valores.push(observacoes || null); }
    if (ativo !== undefined) { campos.push("ativo = ?"); valores.push(ativo ? 1 : 0); }
    if (campos.length > 0) {
      campos.push("atualizado_em = datetime('now')"); valores.push(id);
      const r = await db.run(\`UPDATE medicos SET \${campos.join(", ")} WHERE id = ?\`, valores);
      if (r.changes === 0) throw new Error("Médico não encontrado");
    }
    if (Array.isArray(especialidades)) {
      const prim = especialidades.filter(e => e.is_primaria);
      if (prim.length !== 1) throw new Error("Deve ter 1 especialidade primária");
      await db.run("DELETE FROM medico_especialidade WHERE medico_id = ?", [id]);
      for (const esp of especialidades) {
        await db.run("INSERT INTO medico_especialidade (medico_id, especialidade_id, is_primaria) VALUES (?, ?, ?)", [id, esp.id, esp.is_primaria ? 1 : 0]);
      }
    }
    await db.run("COMMIT");
    res.json({ sucesso: true });
  } catch (e) {
    await db.run("ROLLBACK");
    console.error(e); res.status(500).json({ error: e.message || "Erro ao atualizar" });
  } finally { db.close(); }
});

/** DELETE */
router.delete("/:id", autenticarToken, autorizarPerfis("admin"), async (req, res) => {
  const { id } = req.params; const db = await open({ filename: DB_FILE, driver: sqlite3.Database });
  try {
    await db.run("BEGIN TRANSACTION");
    await db.run("DELETE FROM medico_especialidade WHERE medico_id = ?", [id]);
    const r = await db.run("DELETE FROM medicos WHERE id = ?", [id]);
    await db.run("COMMIT");
    if (r.changes === 0) return res.status(404).json({ error: "Médico não encontrado" });
    res.json({ sucesso: true });
  } catch (e) {
    await db.run("ROLLBACK");
    console.error(e);
    if (e.message && e.message.includes("SQLITE_CONSTRAINT")) return res.status(409).json({ error: "Não é possível excluir: possui plantões" });
    res.status(500).json({ error: "Erro ao excluir" });
  } finally { db.close(); }
});

export default router;
`
);

/* --------------------------
 routes/plantoes.js
---------------------------*/
fs.writeFileSync(
  path.join(backendDir, "routes", "plantoes.js"),
  `import express from "express";
import { open } from "sqlite";
import sqlite3 from "sqlite3";
import { autenticarToken, autorizarPerfis } from "../middleware/auth.js";
import { schemas, validate } from "../middleware/validation.js";
import dotenv from "dotenv";
dotenv.config();

const router = express.Router();
const DB_FILE = process.env.DB_PATH || "./db/database.db";

/** list */
router.get("/", autenticarToken, async (req, res) => {
  const db = await open({ filename: DB_FILE, driver: sqlite3.Database });
  try {
    const sql = \`
      SELECT p.id, p.data, p.hora_inicio, p.hora_fim, p.status, m.nome AS medico_nome, m.crm,
        GROUP_CONCAT(e.nome, ', ') AS especialidades
      FROM plantoes p
      LEFT JOIN medicos m ON p.medico_id = m.id
      LEFT JOIN medico_especialidade me ON m.id = me.medico_id
      LEFT JOIN especialidades e ON me.especialidade_id = e.id
      GROUP BY p.id
      ORDER BY p.data DESC, p.hora_inicio ASC
    \`;
    const rows = await db.all(sql);
    res.json(rows);
  } catch (e) { console.error(e); res.status(500).json({ error: "Erro listar plantoes" }); } finally { db.close(); }
});

/** filtro */
router.get("/filtro", autenticarToken, async (req, res) => {
  const { data, medico_id, especialidade_id } = req.query;
  const db = await open({ filename: DB_FILE, driver: sqlite3.Database });
  try {
    let sql = \`
      SELECT p.id, p.data, p.hora_inicio, p.hora_fim, m.nome AS medico_nome, p.status,
        GROUP_CONCAT(e.nome, ', ') AS especialidades
      FROM plantoes p
      LEFT JOIN medicos m ON p.medico_id = m.id
      LEFT JOIN medico_especialidade me ON m.id = me.medico_id
      LEFT JOIN especialidades e ON me.especialidade_id = e.id
      WHERE 1=1
    \`;
    const params = [];
    if (data) { sql += " AND p.data = ?"; params.push(data); }
    if (medico_id) { sql += " AND p.medico_id = ?"; params.push(medico_id); }
    if (especialidade_id) { sql += " AND e.id = ?"; params.push(especialidade_id); }
    sql += " GROUP BY p.id ORDER BY p.data DESC";
    const rows = await db.all(sql, params);
    res.json(rows);
  } catch (e) { console.error(e); res.status(500).json({ error: "Erro filtro" }); } finally { db.close(); }
});

/** create - evita conflito < 12h */
router.post("/", autenticarToken, autorizarPerfis("admin", "suporte"), validate(schemas.plantao), async (req, res) => {
  const { medico_id, data, hora_inicio, hora_fim, status, observacoes } = req.body;
  const criado_por = req.user.id;
  const db = await open({ filename: DB_FILE, driver: sqlite3.Database });
  try {
    // verifica conflito: mesmo medico, mesma data, interseção de horários
    const conflict = await db.get(
      "SELECT id FROM plantoes WHERE medico_id = ? AND data = ? AND (hora_inicio < ? AND hora_fim > ?)",
      [medico_id, data, hora_fim, hora_inicio]
    );
    if (conflict) return res.status(409).json({ error: "Conflito de plantão para esse médico nesse horário" });

    const r = await db.run(
      "INSERT INTO plantoes (medico_id, data, hora_inicio, hora_fim, status, observacoes, criado_em, criado_por) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), ?)",
      [medico_id, data, hora_inicio, hora_fim, status || "Agendado", observacoes || null, criado_por]
    );
    res.status(201).json({ id: r.lastID });
  } catch (e) { console.error(e); res.status(500).json({ error: "Erro criar plantao" }); } finally { db.close(); }
});

/** update */
router.put("/:id", autenticarToken, autorizarPerfis("admin", "suporte"), async (req, res) => {
  const { id } = req.params;
  const { medico_id, data, hora_inicio, hora_fim, status, observacoes } = req.body;
  const db = await open({ filename: DB_FILE, driver: sqlite3.Database });
  try {
    const campos = []; const valores = [];
    if (medico_id) { campos.push("medico_id = ?"); valores.push(medico_id); }
    if (data) { campos.push("data = ?"); valores.push(data); }
    if (hora_inicio) { campos.push("hora_inicio = ?"); valores.push(hora_inicio); }
    if (hora_fim) { campos.push("hora_fim = ?"); valores.push(hora_fim); }
    if (status) { campos.push("status = ?"); valores.push(status); }
    if (observacoes !== undefined) { campos.push("observacoes = ?"); valores.push(observacoes || null); }
    if (campos.length === 0) return res.status(400).json({ error: "Nenhum campo informado" });
    campos.push("atualizado_em = datetime('now')"); valores.push(id);
    const r = await db.run(\`UPDATE plantoes SET \${campos.join(", ")} WHERE id = ?\`, valores);
    if (r.changes === 0) return res.status(404).json({ error: "Plantão não encontrado" });
    res.json({ sucesso: true });
  } catch (e) { console.error(e); res.status(500).json({ error: "Erro atualizar" }); } finally { db.close(); }
});

/** delete */
router.delete("/:id", autenticarToken, autorizarPerfis("admin", "suporte"), async (req, res) => {
  const { id } = req.params; const db = await open({ filename: DB_FILE, driver: sqlite3.Database });
  try {
    const r = await db.run("DELETE FROM plantoes WHERE id = ?", [id]);
    if (r.changes === 0) return res.status(404).json({ error: "Plantão não encontrado" });
    res.json({ sucesso: true });
  } catch (e) { console.error(e); res.status(500).json({ error: "Erro excluir" }); } finally { db.close(); }
});

/** relatorio por periodo */
router.post("/relatorio", autenticarToken, autorizarPerfis("admin", "suporte"), async (req, res) => {
  const { dataInicio, dataFim } = req.body;
  const db = await open({ filename: DB_FILE, driver: sqlite3.Database });
  try {
    const rows = await db.all(\`
      SELECT m.nome AS medico, GROUP_CONCAT(e.nome, ', ') AS especialidades, p.data, p.hora_inicio, p.hora_fim, p.status
      FROM plantoes p
      LEFT JOIN medicos m ON p.medico_id = m.id
      LEFT JOIN medico_especialidade me ON m.id = me.medico_id
      LEFT JOIN especialidades e ON me.especialidade_id = e.id
      WHERE p.data BETWEEN ? AND ?
      GROUP BY p.id
      ORDER BY p.data ASC, p.hora_inicio ASC
    \`, [dataInicio || "1900-01-01", dataFim || "2999-12-31"]);
    res.json({ periodo: { de: dataInicio, ate: dataFim }, total: rows.length, registros: rows });
  } catch (e) { console.error(e); res.status(500).json({ error: "Erro relatorio" }); } finally { db.close(); }
});

export default router;
`
);

/* --------------------------
 routes/especialidades.js
---------------------------*/
fs.writeFileSync(
  path.join(backendDir, "routes", "especialidades.js"),
  `import express from "express";
import { open } from "sqlite";
import sqlite3 from "sqlite3";
import { autenticarToken, autorizarPerfis } from "../middleware/auth.js";
import { schemas, validate } from "../middleware/validation.js";
import dotenv from "dotenv";
dotenv.config();

const router = express.Router();
const DB_FILE = process.env.DB_PATH || "./db/database.db";

router.get("/", autenticarToken, async (req, res) => {
  const db = await open({ filename: DB_FILE, driver: sqlite3.Database });
  try {
    const rows = await db.all("SELECT id, nome, descricao, criado_em FROM especialidades ORDER BY nome ASC");
    res.json(rows);
  } catch (e) { console.error(e); res.status(500).json({ error: "Erro listar" }); } finally { db.close(); }
});

router.post("/", autenticarToken, autorizarPerfis("admin"), validate(schemas.especialidade), async (req, res) => {
  const { nome, descricao } = req.body;
  const db = await open({ filename: DB_FILE, driver: sqlite3.Database });
  try {
    const exists = await db.get("SELECT id FROM especialidades WHERE nome = ?", [nome]);
    if (exists) return res.status(409).json({ error: "Especialidade já cadastrada" });
    const r = await db.run("INSERT INTO especialidades (nome, descricao, criado_em) VALUES (?, ?, datetime('now'))", [nome, descricao || null]);
    res.status(201).json({ id: r.lastID, nome });
  } catch (e) { console.error(e); res.status(500).json({ error: "Erro criar" }); } finally { db.close(); }
});

router.put("/:id", autenticarToken, autorizarPerfis("admin"), async (req, res) => {
  const { id } = req.params;
  const { nome, descricao } = req.body;
  const db = await open({ filename: DB_FILE, driver: sqlite3.Database });
  try {
    const campos = []; const valores = [];
    if (nome) { campos.push("nome = ?"); valores.push(nome); }
    if (descricao !== undefined) { campos.push("descricao = ?"); valores.push(descricao || null); }
    if (campos.length === 0) return res.status(400).json({ error: "Nenhum campo" });
    campos.push("atualizado_em = datetime('now')"); valores.push(id);
    const r = await db.run(\`UPDATE especialidades SET \${campos.join(", ")} WHERE id = ?\`, valores);
    if (r.changes === 0) return res.status(404).json({ error: "Não encontrado" });
    res.json({ msg: "Atualizado" });
  } catch (e) { console.error(e); res.status(500).json({ error: "Erro atualizar" }); } finally { db.close(); }
});

router.delete("/:id", autenticarToken, autorizarPerfis("admin"), async (req, res) => {
  const { id } = req.params;
  const db = await open({ filename: DB_FILE, driver: sqlite3.Database });
  try {
    const r = await db.run("DELETE FROM especialidades WHERE id = ?", [id]);
    if (r.changes === 0) return res.status(404).json({ error: "Não encontrado" });
    res.json({ msg: "Excluído" });
  } catch (e) { console.error(e); res.status(500).json({ error: "Erro excluir" }); } finally { db.close(); }
});

export default router;
`
);

/* --------------------------
 routes/atendimentos.js
---------------------------*/
fs.writeFileSync(
  path.join(backendDir, "routes", "atendimentos.js"),
  `import express from "express";
import { open } from "sqlite";
import sqlite3 from "sqlite3";
import { autenticarToken, autorizarPerfis } from "../middleware/auth.js";
import dotenv from "dotenv";
dotenv.config();

const router = express.Router();
const DB_FILE = process.env.DB_PATH || "./db/database.db";

/**
 * GET /atendimentos/:plantao_id
 * Lista atendimentos por plantao
 */
router.get("/:plantao_id", autenticarToken, async (req, res) => {
  const { plantao_id } = req.params;
  const db = await open({ filename: DB_FILE, driver: sqlite3.Database });
  try {
    const rows = await db.all("SELECT * FROM atendimentos WHERE plantao_id = ? ORDER BY criado_em DESC", [plantao_id]);
    res.json(rows);
  } catch (e) { console.error(e); res.status(500).json({ error: "Erro listar atendimentos" }); } finally { db.close(); }
});

/**
 * POST /atendimentos
 * Cria um atendimento
 */
router.post("/", autenticarToken, autorizarPerfis("admin", "suporte"), async (req, res) => {
  const { plantao_id, paciente_nome, procedimento, hora, obs } = req.body;
  if (!plantao_id || !paciente_nome || !hora) return res.status(400).json({ error: "Campos obrigatórios ausentes" });
  const db = await open({ filename: DB_FILE, driver: sqlite3.Database });
  try {
    const r = await db.run("INSERT INTO atendimentos (plantao_id, paciente_nome, procedimento, hora, obs, criado_em) VALUES (?, ?, ?, ?, ?, datetime('now'))", [plantao_id, paciente_nome, procedimento || null, hora, obs || null]);
    res.status(201).json({ id: r.lastID });
  } catch (e) { console.error(e); res.status(500).json({ error: "Erro criar atendimento" }); } finally { db.close(); }
});

/**
 * PUT /atendimentos/:id
 * Atualiza atendimento (opcional)
 */
router.put("/:id", autenticarToken, autorizarPerfis("admin", "suporte"), async (req, res) => {
  const { id } = req.params;
  const { paciente_nome, procedimento, hora, obs } = req.body;
  const db = await open({ filename: DB_FILE, driver: sqlite3.Database });
  try {
    const campos = []; const vals = [];
    if (paciente_nome) { campos.push("paciente_nome = ?"); vals.push(paciente_nome); }
    if (procedimento !== undefined) { campos.push("procedimento = ?"); vals.push(procedimento); }
    if (hora) { campos.push("hora = ?"); vals.push(hora); }
    if (obs !== undefined) { campos.push("obs = ?"); vals.push(obs); }
    if (campos.length === 0) return res.status(400).json({ error: "Nenhum campo" });
    vals.push(id);
    const r = await db.run(\`UPDATE atendimentos SET \${campos.join(", ")} WHERE id = ?\`, vals);
    if (r.changes === 0) return res.status(404).json({ error: "Atendimento não encontrado" });
    res.json({ msg: "Atualizado" });
  } catch (e) { console.error(e); res.status(500).json({ error: "Erro atualizar atendimento" }); } finally { db.close(); }
});

export default router;
`
);

/* --------------------------
 routes/relatorios.js
---------------------------*/
fs.writeFileSync(
  path.join(backendDir, "routes", "relatorios.js"),
  `import express from "express";
import { open } from "sqlite";
import sqlite3 from "sqlite3";
import dotenv from "dotenv";
dotenv.config();

const router = express.Router();
const DB_FILE = process.env.DB_PATH || "./db/database.db";

/**
 * GET /relatorio/plantao
 * Retorna todos os registros da view de atendimentos (paginação opcional)
 */
router.get("/plantao", async (req, res) => {
  const db = await open({ filename: DB_FILE, driver: sqlite3.Database });
  try {
    const rows = await db.all("SELECT * FROM vw_relatorio_atendimentos ORDER BY plantao_data DESC");
    res.json(rows);
  } catch (e) { console.error(e); res.status(500).json({ error: "Erro gerar relatório" }); } finally { db.close(); }
});

/**
 * GET /relatorio/data
 * Resumo por data dos atendimentos
 */
router.get("/data", async (req, res) => {
  const db = await open({ filename: DB_FILE, driver: sqlite3.Database });
  try {
    const rows = await db.all("SELECT plantao_data AS data, COUNT(*) AS total FROM vw_relatorio_atendimentos GROUP BY plantao_data ORDER BY plantao_data DESC");
    res.json(rows);
  } catch (e) { console.error(e); res.status(500).json({ error: "Erro gerar relatório por data" }); } finally { db.close(); }
});

/**
 * GET /relatorio/atendimentos
 * Filtra atendimentos por médico, especialidade e período
 */
router.get("/atendimentos", async (req, res) => {
  const { id_medico, id_especialidade, data_inicio, data_fim } = req.query;
  const db = await open({ filename: DB_FILE, driver: sqlite3.Database });
  try {
    const rows = await db.all(
      \`SELECT * FROM vw_relatorio_atendimentos
       WHERE (? IS NULL OR medico_id = ?)
         AND (? IS NULL OR (especialidades LIKE '%'||?||'%'))
         AND (? IS NULL OR date(plantao_data) >= date(?))
         AND (? IS NULL OR date(plantao_data) <= date(?))\`,
      [id_medico || null, id_medico || null, id_especialidade || null, id_especialidade || null, data_inicio || null, data_inicio || null, data_fim || null, data_fim || null]
    );
    res.json(rows);
  } catch (e) { console.error(e); res.status(500).json({ error: "Erro gerar relatório filtrado" }); } finally { db.close(); }
});

export default router;
`
);

/* --------------------------
 routes/status.js
---------------------------*/
fs.writeFileSync(
  path.join(backendDir, "routes", "status.js"),
  `import express from "express";
import { open } from "sqlite";
import sqlite3 from "sqlite3";
const router = express.Router();
const DB_FILE = process.env.DB_PATH || "./db/database.db";

router.get("/", async (req, res) => {
  try {
    const db = await open({ filename: DB_FILE, driver: sqlite3.Database });
    await db.get("SELECT 1 as ok");
    const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table'");
    res.json({ api: "OK", database: "OK", tables: tables.map(t => t.name), timestamp: new Date().toISOString() });
    db.close();
  } catch (e) {
    console.error("Status error:", e);
    res.status(503).json({ api: "OK", database: "ERRO", error: e.message });
  }
});

export default router;
`
);

/* --------------------------
 mensagem final
---------------------------*/
console.log("✅ criar_backend_adaptado_v3.js executado: todos os arquivos foram gravados em /backend_node");
console.log("Agora execute:");
console.log("  cd backend_node");
console.log("  npm install");
console.log("  npm run init-db");
console.log("  npm run seed");
console.log("  npm run dev");
