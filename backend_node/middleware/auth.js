import jwt from "jsonwebtoken";
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
