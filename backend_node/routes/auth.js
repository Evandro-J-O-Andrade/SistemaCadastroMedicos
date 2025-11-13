// --- routes/auth.js ---
import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import db from "../db/database.js";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

// 🔑 Chave secreta do JWT (usa variável .env)
const JWT_SECRET = process.env.JWT_SECRET || "chave-super-secreta";

// ⏰ Tempo de expiração padrão (8h)
const EXPIRES_IN = process.env.JWT_EXPIRES || "8h";

/* ================================================
   🔐 FUNÇÃO AUXILIAR — Gerar Token JWT
================================================ */
function gerarToken(usuario) {
  const payload = {
    id: usuario.id,
    nome: usuario.nome,   // CORRIGIDO: usa 'nome' do DB
    perfil: usuario.tipo  // CORRIGIDO: usa 'tipo' do DB
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: EXPIRES_IN });
}

/* ================================================
🚪 LOGIN — /auth/login
================================================ */
router.post("/login", (req, res) => {
  const { nome: login_identifier, senha } = req.body;

  if (!login_identifier || !senha) {
    return res.status(400).json({ erro: "Login (Nome) e senha são obrigatórios" });
  }

  db.get("SELECT * FROM usuarios WHERE nome = ?", [login_identifier], async (err, usuario) => {
    if (err) {
      console.error("❌ Erro no banco:", err);
      return res.status(500).json({ erro: "Erro interno ao buscar usuário" });
    }

    if (!usuario) {
      return res.status(404).json({ erro: "Usuário não encontrado" });
    }

    const senhaCorreta = await bcrypt.compare(senha, usuario.senha);
    if (!senhaCorreta) {
      return res.status(401).json({ erro: "Senha incorreta" });
    }

    const token = gerarToken(usuario);
    res.json({
      msg: "Login realizado com sucesso!",
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        perfil: usuario.tipo
      }
    });
  });
});

/* ================================================
   🧱 MIDDLEWARE — Verifica Token JWT
================================================ */
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
    req.user = user;
    next();
  });
}

/* ================================================
   🔒 MIDDLEWARE — Permissões por perfil
================================================ */
export function autorizarPerfis(...perfisPermitidos) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ erro: "Não autenticado" });
    if (!perfisPermitidos.includes(req.user.perfil)) {
      return res.status(403).json({ erro: "Acesso negado para seu perfil" });
    }
    next();
  };
}

/* ================================================
   ✅ TESTE RÁPIDO — /auth/check
================================================ */
router.get("/check", autenticarToken, (req, res) => {
  res.json({
    msg: "Token válido",
    usuario: req.user
  });
});

/* ================================================
   🚪 LOGOUT — apenas simbólico (frontend apaga token)
================================================ */
router.post("/logout", (req, res) => {
  res.json({ msg: "Logout realizado. Remova o token do armazenamento local." });
});

export default router;
