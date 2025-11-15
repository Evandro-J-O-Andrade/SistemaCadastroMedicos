import express from "express";
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
