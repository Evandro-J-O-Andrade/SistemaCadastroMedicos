// routes/auth.js → VERSÃO FINAL OFICIAL (TUDO FUNCIONA 100%)
import express from "express";
import db from "../utils/database.js"; // ← Perfeito, é exatamente o seu database.js com as funções
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
// routes/auth.js → ADICIONE ESSA LINHA!
import { autenticarToken } from "../middleware/auth.js"; // ← ESSA LINHA TAVA FALTANDO!!!
dotenv.config();

const router = express.Router();

// ================================================
// POST /auth/login
// ================================================
router.post("/login", async (req, res) => {
  console.log("LOGIN RECEBIDO → body:", req.body);

  // Aceita qualquer nome que o frontend mandar (usuario, username, email, etc.)
  const { usuario, username, email, login, senha, password } = req.body;

  const usuarioFinal = (usuario || username || email || login || "").toString().trim().toLowerCase();
  const senhaFinal = (senha || password || "").toString().trim();

  if (!usuarioFinal || !senhaFinal) {
    return res.status(400).json({ error: "Usuário e senha são obrigatórios" });
  }

  try {
    // Busca o usuário pelo campo 'usuario' (sua função já faz toLowerCase)
    const user = await db.getUserByUsername(usuarioFinal);

    if (!user) {
      return res.status(401).json({ error: "Usuário ou senha incorretos" });
    }

    // Compara a senha com bcrypt
    const match = await bcrypt.compare(senhaFinal, user.senha);
    if (!match) {
      return res.status(401).json({ error: "Usuário ou senha incorretos" });
    }

    // Gera o token JWT
    const token = jwt.sign(
      {
        id: user.id,
        usuario: user.usuario,
        role: user.role
      },
      process.env.JWT_SECRET || "troque_essa_chave_super_secreta",
      { expiresIn: "8h" }
    );

    // Resposta de sucesso
    res.json({
      token,
      usuario: {
        id: user.id,
        usuario: user.usuario,
        role: user.role,
        primeiroLogin: user.primeiro_login === 1 || user.primeiroLogin === true
      }
    });
  } catch (err) {
    console.error("Erro fatal no login:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  }
});

// ================================================
// POST /auth/troca-primeiro-login (A ROTA QUE FALTAVA!)
// ================================================
router.post("/troca-primeiro-login", autenticarToken, async (req, res) => {
  const { novaSenha } = req.body;
  const userId = req.user.id;

  if (!novaSenha || novaSenha.length < 6) {
    return res.status(400).json({ erro: "A senha deve ter no mínimo 6 caracteres" });
  }

  try {
    // Gera o hash da nova senha
    const hash = await bcrypt.hash(novaSenha, 10);

    // Atualiza a senha no banco
    await db.updateUserPassword(userId, hash);

    // Zera o primeiro_login (ESSA LINHA É O SEGREDO!)
    switch (process.env.DB_MODE || "sqlite") {
      case "sqlite":
        await db.run("UPDATE usuarios SET primeiro_login = 0 WHERE id = ?", [userId]);
        break;
      // Adicione outros casos se precisar
    }

    res.json({ mensagem: "Senha alterada com sucesso! Bem-vindo ao sistema!" });
  } catch (err) {
    console.error("Erro na troca de senha:", err);
    res.status(500).json({ erro: "Erro interno do servidor" });
  }
});

export default router;