// routes/especialidades.js
import express from "express";
import { open } from "sqlite";
import sqlite3 from "sqlite3";
import { autenticarToken, autorizarPerfis } from "./auth.js"; // Ajuste o caminho conforme necessário

const router = express.Router();

// 🧩 Conexão com o banco (Repete o padrão async/await)
async function getDb() {
  return open({ filename: "./database.db", driver: sqlite3.Database });
}

/**
 * ✅ GET - Lista todas as especialidades
 */
// 🔒 Protegido: Apenas usuários logados podem listar (necessário para formulários)
router.get("/", autenticarToken, async (req, res) => {
  try {
    const db = await getDb();
    const especialidades = await db.all(
      `SELECT id, nome, descricao, criado_em FROM especialidades ORDER BY nome ASC`
    );
    res.json(especialidades);
  } catch (err) {
    console.error("❌ Erro ao listar especialidades:", err.message);
    res.status(500).json({ error: "Erro ao listar especialidades" });
  }
});

/**
 * ➕ POST - Cria nova especialidade
 */
// 🔒 Protegido: Apenas Admin pode criar
router.post("/", autenticarToken, autorizarPerfis("admin"), async (req, res) => {
  try {
    const { nome, descricao } = req.body;

    if (!nome) {
      return res.status(400).json({ error: "Nome da especialidade é obrigatório" });
    }

    const db = await getDb();

    // Verifica unicidade
    const existente = await db.get("SELECT id FROM especialidades WHERE nome = ?", [nome]);
    if (existente) {
      return res.status(409).json({ error: "Especialidade já cadastrada" });
    }

    const result = await db.run(
      `INSERT INTO especialidades (nome, descricao, criado_em) VALUES (?, ?, datetime('now'))`,
      [nome, descricao || null]
    );

    res.status(201).json({ id: result.lastID, nome, descricao });
  } catch (err) {
    console.error("❌ Erro ao criar especialidade:", err.message);
    res.status(500).json({ error: "Erro ao criar especialidade" });
  }
});

/**
 * ✏️ PUT - Atualiza especialidade
 */
// 🔒 Protegido: Apenas Admin pode atualizar
router.put("/:id", autenticarToken, autorizarPerfis("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, descricao } = req.body;

    if (!id) return res.status(400).json({ error: "ID não informado" });

    const db = await getDb();
    
    // Constrói a query dinamicamente
    const campos = [];
    const valores = [];

    if (nome) { campos.push("nome = ?"); valores.push(nome); }
    if (descricao !== undefined) { campos.push("descricao = ?"); valores.push(descricao || null); } 

    if (campos.length === 0) {
      return res.status(400).json({ error: "Nenhum campo informado para atualização" });
    }
    
    campos.push("atualizado_em = datetime('now')");
    valores.push(id);

    const result = await db.run(
      `UPDATE especialidades SET ${campos.join(", ")} WHERE id = ?`,
      valores
    );

    if (result.changes === 0) {
        return res.status(404).json({ error: "Especialidade não encontrada" });
    }

    res.status(200).json({ msg: "Especialidade atualizada com sucesso" });
  } catch (err) {
    console.error("❌ Erro ao atualizar especialidade:", err.message);
    res.status(500).json({ error: "Erro ao atualizar especialidade" });
  }
});

/**
 * ❌ DELETE - Excluir especialidade
 */
// 🔒 Protegido: Apenas Admin pode excluir
router.delete("/:id", autenticarToken, autorizarPerfis("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDb();

    const result = await db.run("DELETE FROM especialidades WHERE id = ?", [id]);

    if (result.changes === 0) {
        return res.status(404).json({ error: "Especialidade não encontrada" });
    }
    
    res.status(200).json({ msg: "Especialidade excluída com sucesso" });
  } catch (err) {
    console.error("❌ Erro ao excluir especialidade:", err.message);
    res.status(500).json({ error: "Erro ao excluir especialidade. Verifique se está em uso." });
  }
});

export default router;