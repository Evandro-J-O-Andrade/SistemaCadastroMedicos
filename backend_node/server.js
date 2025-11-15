import express from "express";
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
