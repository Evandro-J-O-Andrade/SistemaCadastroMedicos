// --- Importações principais ---
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import winston from "winston";

// --- Importações das rotas do sistema ---
// Assumindo que as rotas estão na pasta ./routes/
import authRoutes from "./routes/auth.js";
import usuariosRoutes from "./routes/usuarios.js";
import medicosRoutes from "./routes/medicos.js";
import plantoesRoutes from "./routes/plantoes.js";

// --- Importação da conexão com o banco SQLite ---
import db from "./db/database.js";

// --- Configuração inicial ---
dotenv.config();
const app = express();

// --- Logger com Winston (pra logs de erros e acessos) ---
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({ format: winston.format.simple() })
  ]
});

// --- Middleware de Segurança e Limites ---
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Máx 100 requests por IP
  message: { erro: "Muitos requests – tente em 15 min" }
});
app.use(limiter);
app.use(helmet()); // Headers de segurança (CSP, etc.)
app.use(express.json({ limit: '10mb' })); // Limite pra bodies grandes
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') || ["*"] })); // Suporte múltiplos origins

// --- Rota raiz (teste rápido do servidor) ---
app.get("/", (req, res) => {
  logger.info(`Acesso à raiz: ${req.ip}`);
  res.json({ ok: true, msg: "API ativa 🚀 – Intranet de Atendimentos Consolidados" });
});

// --- Health Check com Ping no DB (pra monitorar se tá vivo) ---
app.get("/health", (req, res) => {
  // O db.get é assíncrono, mas vamos encapsular para garantir que a resposta seja enviada.
  db.get("SELECT 1 as ping", (err, row) => {
    if (err) {
      logger.error("Health check falhou (DB indisponível):", err);
      return res.status(500).json({ status: "ERROR", erro: "DB indisponível" });
    }
    
    // Logamos apenas se for sucesso, o 404 handler cuida dos erros.
    // logger.info("Health check OK"); 
    res.json({ status: "OK", timestamp: new Date().toISOString(), db_ping: row.ping });
  });
});

// --- Rotas principais ---
// CORREÇÃO CRÍTICA: Use '/' para prefixos de rota, NÃO './'
app.use("/auth", authRoutes); 
app.use("/usuarios", usuariosRoutes);
app.use("/medicos", medicosRoutes);
app.use("/plantoes", plantoesRoutes);

// --- ROTA DE TESTE DO BANCO DE DADOS (mantida) ---
app.get("/db-test", (req, res) => {
  logger.info("Teste de DB iniciado");
  db.serialize(() => {
    // Implementação de teste... (mantido do original)
    db.run(
        `CREATE TABLE IF NOT EXISTS usuarios_testes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nome TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL
        )`);

    db.run(
      `INSERT INTO usuarios_testes (nome, email) VALUES (?, ?)`,
      ["Usuário de Teste", "teste@example.com"],
      (err) => {
        if (err) logger.error("Erro no INSERT teste:", err);
      }
    );

    db.all(`SELECT * FROM usuarios_testes`, (err, rows) => {
      if (err) {
        logger.error("❌ Erro ao acessar o banco:", err);
        return res.status(500).json({ erro: "Falha ao acessar o banco de dados" });
      }

      logger.info(`Teste DB OK: ${rows.length} registros`);
      res.json({
        status: "ok",
        mensagem: "Banco de dados SQLite funcionando! 💾",
        total_usuarios: rows.length,
        usuarios: rows,
      });
    });
  });
});

// --- Rota de Migração (mantida) ---
app.post("/migrate", async (req, res) => {
  const { usuarios, medicos, plantoes } = req.body; 
  logger.info("Migração iniciada");
  try {
    // Aqui deveria estar a lógica de migração real...
    // Apenas um placeholder simples:
    if (usuarios && usuarios.length > 0) {
      usuarios.forEach(u => {
        db.run("INSERT OR IGNORE INTO usuarios (nome, email, senha) VALUES (?, ?, ?)",
          [u.nome, u.email || 'sem-email@temp.com', u.senha]); // Usando 'nome'
      });
    }
    logger.info("Migração concluída");
    res.json({ msg: "Dados migrados com sucesso! Total: usuários=" + (usuarios?.length || 0) });
  } catch (err) {
    logger.error("Erro na migração:", err);
    res.status(500).json({ erro: "Falha na migração" });
  }
});

// --- 404 Handler --- (MUITO IMPORTANTE: Deve vir DEPOIS de todas as rotas)
app.use((req, res) => {
  logger.warn(`Rota não encontrada: ${req.method} ${req.path} de ${req.ip}`);
  res.status(404).json({ erro: "Rota não encontrada na API de Atendimentos" });
});

// --- Error Handler Global (captura erros em qualquer rota) ---
app.use((err, req, res, next) => {
  logger.error(`Erro global: ${err.message} em ${req.path} – Stack: ${err.stack}`);
  res.status(500).json({ erro: "Erro interno no servidor – verifique logs" });
});

// --- Inicialização do servidor ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  logger.info(`✅ Servidor rodando na porta ${PORT} – Pronto pra cadastro de plantões diários!`);
  console.log(`✅ Servidor rodando na porta ${PORT} – Acesse /health pra testar DB`);
});