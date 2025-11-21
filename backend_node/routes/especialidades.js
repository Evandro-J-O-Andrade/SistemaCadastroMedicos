// routes/especialidades.js
import express from "express";
import { autenticarToken, autorizarPerfis } from "../middleware/auth.js";
import { schemas, validate } from "../middleware/validation.js";
import db from "../utils/database.js";

const router = express.Router();

/** LISTAR ESPECIALIDADES */
router.get("/", autenticarToken, async (req, res) => {
try {
const rows = await db.all(
"SELECT id, nome, descricao, criado_em FROM especialidades ORDER BY nome ASC"
);
res.json(rows);
} catch (e) {
console.error(e);
res.status(500).json({ error: "Erro ao listar especialidades" });
}
});

/** CRIAR ESPECIALIDADE */
router.post(
"/",
autenticarToken,
autorizarPerfis("admin"),
validate(schemas.especialidade),
async (req, res) => {
const { nome, descricao } = req.body;


try {
  const exists = await db.get("SELECT id FROM especialidades WHERE nome = ?", [nome]);
  if (exists) return res.status(409).json({ error: "Especialidade já cadastrada" });

  const r = await db.run(
    "INSERT INTO especialidades (nome, descricao, criado_em) VALUES (?, ?, datetime('now'))",
    [nome, descricao || null]
  );

  res.status(201).json({ id: r.lastID, nome });
} catch (e) {
  console.error(e);
  res.status(500).json({ error: "Erro ao criar especialidade" });
}


}
);

/** ATUALIZAR ESPECIALIDADE */
router.put("/:id", autenticarToken, autorizarPerfis("admin"), async (req, res) => {
const { id } = req.params;
const { nome, descricao } = req.body;

try {
const campos = [];
const valores = [];
if (nome) { campos.push("nome = ?"); valores.push(nome); }
if (descricao !== undefined) { campos.push("descricao = ?"); valores.push(descricao || null); }
if (!campos.length) return res.status(400).json({ error: "Nenhum campo informado" });


campos.push("atualizado_em = datetime('now')");
valores.push(id);

const r = await db.run(`UPDATE especialidades SET ${campos.join(", ")} WHERE id = ?`, valores);
if (r.changes === 0) return res.status(404).json({ error: "Especialidade não encontrada" });

res.json({ msg: "Atualizado com sucesso" });


} catch (e) {
console.error(e);
res.status(500).json({ error: "Erro ao atualizar especialidade" });
}
});

/** EXCLUIR ESPECIALIDADE */
router.delete("/:id", autenticarToken, autorizarPerfis("admin"), async (req, res) => {
const { id } = req.params;

try {
const vinculo = await db.get(
"SELECT 1 FROM medico_especialidade WHERE especialidade_id = ?",
[id]
);
if (vinculo) return res.status(409).json({ error: "Não é possível excluir: possui médicos vinculados" });

const r = await db.run("DELETE FROM especialidades WHERE id = ?", [id]);
if (r.changes === 0) return res.status(404).json({ error: "Especialidade não encontrada" });

res.json({ msg: "Excluído com sucesso" });


} catch (e) {
console.error(e);
res.status(500).json({ error: "Erro ao excluir especialidade" });
}
});

export default router;
