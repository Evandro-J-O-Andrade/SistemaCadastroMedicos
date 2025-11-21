console.log("📌 SERVER EXECUTANDO EM:", process.cwd());
console.log("📌 ARQUIVO SERVER.JS:", import.meta.url);

import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import winston from "winston";
import { logRequest } from "./middleware/logRequest.js";

dotenv.config();

// LOGGER
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: "logs/error.log", level: "error" }),
    new winston.transports.File({ filename: "logs/combined.log" }),
    new winston.transports.Console()
  ]
});

const app = express();

// RATE LIMIT
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 400
}));

// HELMET (compatível com React + CORS)
app.use(helmet({
  crossOriginResourcePolicy: false,
  crossOriginEmbedderPolicy: false
}));

// BODY PARSER
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true }));

// CORS CONFIG
const corsOrigin = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",")
  : ["*"];

app.use(cors({
  origin: corsOrigin,
  credentials: true
}));

// AUDITORIA
app.use(logRequest);

// ROTAS
import authRoutes from "./routes/auth.js";
import usuariosRoutes from "./routes/usuarios.js";
import medicosRoutes from "./routes/medicos.js";
import plantoesRoutes from "./routes/plantoes.js";
import especialidadesRoutes from "./routes/especialidades.js";
import atendimentosRoutes from "./routes/atendimentos.js";
import relatoriosRoutes from "./routes/relatorios.js";
import statusRoutes from "./routes/status.js";

//import { router as authRoutes } from "./routes/auth.js"; 
// app.use("/", loginRouter); // ❌ REMOVIDO: Conflitava com /auth

app.use("/auth", authRoutes);
app.use("/usuarios", usuariosRoutes);
app.use("/medicos", medicosRoutes);
app.use("/plantoes", plantoesRoutes);
app.use("/especialidades", especialidadesRoutes);
app.use("/atendimentos", atendimentosRoutes);
app.use("/relatorio", relatoriosRoutes);
app.use("/status", statusRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ error: "Rota não encontrada" });
});

// ERROS
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({ error: "Erro interno do servidor" });
});

// START
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Backend V3 rodando na porta ${PORT}`);
});