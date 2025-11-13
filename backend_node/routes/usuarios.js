// 📁 routes/usuarios.js
import express from "express";
import { open } from "sqlite";
import sqlite3 from "sqlite3";
import bcrypt from "bcrypt";
import { autenticarToken, autorizarPerfis } from "../routes/auth.js";

const router = express.Router();
const SALT_ROUNDS = 10;

// ==================================================
// 🔌 Conexão com o banco de dados SQLite
// ==================================================
async function getDb() {
  return open({ filename: "./database.db", driver: sqlite3.Database });
}

// ==================================================
// 👥 GET - Listar todos os usuários (admin/suporte)
// ==================================================
router.get("/", autenticarToken, autorizarPerfis("admin", "suporte"), async (req, res) => {
  try {
    const db = await getDb();
    const users = await db.all(`
      SELECT id, nome, email, tipo, criado_em, atualizado_em
      FROM usuarios
      ORDER BY criado_em DESC
    `);
    res.status(200).json(users);
  } catch (err) {
    console.error("❌ Erro ao listar usuários:", err.message);
    res.status(500).json({ error: "Erro ao listar usuários" });
  }
});

// ==================================================
// ➕ POST - Criar novo usuário (apenas admin)
// ==================================================
router.post("/", autenticarToken, autorizarPerfis("admin"), async (req, res) => {
  try {
    const { nome, email, senha, tipo } = req.body;

    if (!nome || !email || !senha || !tipo) {
      return res.status(400).json({ error: "Campos obrigatórios faltando" });
    }

    const db = await getDb();

    // Verifica duplicidade de e-mail
    const existente = await db.get("SELECT id FROM usuarios WHERE email = ?", [email]);
    if (existente) {
      return res.status(409).json({ error: "E-mail já cadastrado" });
    }

    // 🔒 Hash da senha
    const senhaHashed = await bcrypt.hash(senha, SALT_ROUNDS);

    await db.run(
      `
      INSERT INTO usuarios (nome, email, senha, tipo, criado_em)
      VALUES (?, ?, ?, ?, datetime('now'))
      `,
      [nome, email, senhaHashed, tipo]
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
    const { nome, email, tipo, senha } = req.body;

    if (!id) return res.status(400).json({ error: "ID não informado" });

    const db = await getDb();

    const existente = await db.get("SELECT id FROM usuarios WHERE id = ?", [id]);
    if (!existente) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    const campos = [];
    const valores = [];

    if (nome) { campos.push("nome = ?"); valores.push(nome); }
    if (email) { campos.push("email = ?"); valores.push(email); }
    if (tipo) { campos.push("tipo = ?"); valores.push(tipo); }

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

    const sql = `UPDATE usuarios SET ${campos.join(", ")} WHERE id = ?`;
    await db.run(sql, valores);

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

    const existente = await db.get("SELECT id FROM usuarios WHERE id = ?", [id]);
    if (!existente) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    await db.run("DELETE FROM usuarios WHERE id = ?", [id]);
    res.status(200).json({ msg: "Usuário excluído com sucesso" });
  } catch (err) {
    console.error("❌ Erro ao excluir usuário:", err.message);
    res.status(500).json({ error: "Erro ao excluir usuário" });
  }
});

export default router;
