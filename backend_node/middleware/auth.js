// middleware/auth.js → VERSÃO FINAL E CORRETA (NUNCA MAIS VAI DAR "Rota não encontrada" POR TOKEN ERRADO)
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "troque_essa_chave_super_secreta";

/**
 * Middleware de autenticação JWT
 */
export function autenticarToken(req, res, next) {
  const authHeader = req.headers["authorization"];

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ erro: "Token não fornecido ou formato inválido" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = jwt.verify(token, JWT_SECRET);

    req.user = {
      id: payload.id,
      usuario: payload.usuario,
      role: payload.role,
    };

    next(); // Tudo certo
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ erro: "Token expirado. Faça login novamente." });
    }
    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({ erro: "Token inválido." });
    }

    console.error("Erro no middleware JWT:", err);
    return res.status(401).json({ erro: "Erro de autenticação" });
  }
}

/**
 * Middleware de autorização por role
 */
export function autorizarPerfis(...rolesPermitidas) {
  return (req, res, next) => {
    if (!req.user?.role) {
      return res.status(401).json({ erro: "Usuário não autenticado" });
    }

    if (!rolesPermitidas.includes(req.user.role)) {
      return res.status(403).json({ erro: "Acesso negado: perfil insuficiente" });
    }

    next();
  };
}