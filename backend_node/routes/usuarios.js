import express from "express";
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
    const sql = `UPDATE usuarios SET ${campos.join(", ")} WHERE id = ?`;
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
