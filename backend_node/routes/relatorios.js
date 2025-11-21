// routes/relatorios.js
import express from "express";
import { autenticarToken, autorizarPerfis } from "../middleware/auth.js";
import db from "../utils/database.js";

const router = express.Router();

/** GET /relatorio/plantao */
router.get("/plantao", autenticarToken, autorizarPerfis("admin", "suporte", "usuario"), async (req, res) => {
try {
const rows = await db.all("SELECT * FROM vw_relatorio_atendimentos ORDER BY plantao_data DESC");
res.json(rows);
} catch (e) {
console.error(e);
res.status(500).json({ error: "Erro gerar relatório" });
}
});

/** GET /relatorio/data */
router.get("/data", autenticarToken, autorizarPerfis("admin", "suporte", "usuario"), async (req, res) => {
try {
const rows = await db.all(`       SELECT plantao_data AS data, COUNT(*) AS total
      FROM vw_relatorio_atendimentos
      GROUP BY plantao_data
      ORDER BY plantao_data DESC
    `);
res.json(rows);
} catch (e) {
console.error(e);
res.status(500).json({ error: "Erro gerar relatório por data" });
}
});

/** GET /relatorio/atendimentos */
router.get("/atendimentos", autenticarToken, autorizarPerfis("admin", "suporte", "usuario"), async (req, res) => {
const { id_medico, id_especialidade, data_inicio, data_fim } = req.query;
try {
const rows = await db.all(
`SELECT * FROM vw_relatorio_atendimentos
       WHERE (? IS NULL OR medico_id = ?)
         AND (? IS NULL OR (especialidades LIKE '%'||?||'%'))
         AND (? IS NULL OR date(plantao_data) >= date(?))
         AND (? IS NULL OR date(plantao_data) <= date(?))`,
[
id_medico || null, id_medico || null,
id_especialidade || null, id_especialidade || null,
data_inicio || null, data_inicio || null,
data_fim || null, data_fim || null
]
);
res.json(rows);
} catch (e) {
console.error(e);
res.status(500).json({ error: "Erro gerar relatório filtrado" });
}
});

export default router;
