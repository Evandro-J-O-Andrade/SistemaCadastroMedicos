import express from "express";
import { open } from "sqlite";
import sqlite3 from "sqlite3";
import { autenticarToken, autorizarPerfis } from "../middleware/auth.js";
import { schemas, validate } from "../middleware/validation.js";
import dotenv from "dotenv";
dotenv.config();

const router = express.Router();
const DB_FILE = process.env.DB_PATH || "./db/database.db";

router.get("/", autenticarToken, async (req, res) => {
  const db = await open({ filename: DB_FILE, driver: sqlite3.Database });
  try {
    const rows = await db.all("SELECT id, nome, descricao, criado_em FROM especialidades ORDER BY nome ASC");
    res.json(rows);
  } catch (e) { console.error(e); res.status(500).json({ error: "Erro listar" }); } finally { db.close(); }
});

router.post("/", autenticarToken, autorizarPerfis("admin"), validate(schemas.especialidade), async (req, res) => {
  const { nome, descricao } = req.body;
  const db = await open({ filename: DB_FILE, driver: sqlite3.Database });
  try {
    const exists = await db.get("SELECT id FROM especialidades WHERE nome = ?", [nome]);
    if (exists) return res.status(409).json({ error: "Especialidade já cadastrada" });
    const r = await db.run("INSERT INTO especialidades (nome, descricao, criado_em) VALUES (?, ?, datetime('now'))", [nome, descricao || null]);
    res.status(201).json({ id: r.lastID, nome });
  } catch (e) { console.error(e); res.status(500).json({ error: "Erro criar" }); } finally { db.close(); }
});

router.put("/:id", autenticarToken, autorizarPerfis("admin"), async (req, res) => {
  const { id } = req.params;
  const { nome, descricao } = req.body;
  const db = await open({ filename: DB_FILE, driver: sqlite3.Database });
  try {
    const campos = []; const valores = [];
    if (nome) { campos.push("nome = ?"); valores.push(nome); }
    if (descricao !== undefined) { campos.push("descricao = ?"); valores.push(descricao || null); }
    if (campos.length === 0) return res.status(400).json({ error: "Nenhum campo" });
    campos.push("atualizado_em = datetime('now')"); valores.push(id);
    const r = await db.run(`UPDATE especialidades SET ${campos.join(", ")} WHERE id = ?`, valores);
    if (r.changes === 0) return res.status(404).json({ error: "Não encontrado" });
    res.json({ msg: "Atualizado" });
  } catch (e) { console.error(e); res.status(500).json({ error: "Erro atualizar" }); } finally { db.close(); }
});

router.delete("/:id", autenticarToken, autorizarPerfis("admin"), async (req, res) => {
  const { id } = req.params;
  const db = await open({ filename: DB_FILE, driver: sqlite3.Database });
  try {
    const r = await db.run("DELETE FROM especialidades WHERE id = ?", [id]);
    if (r.changes === 0) return res.status(404).json({ error: "Não encontrado" });
    res.json({ msg: "Excluído" });
  } catch (e) { console.error(e); res.status(500).json({ error: "Erro excluir" }); } finally { db.close(); }
});

export default router;
