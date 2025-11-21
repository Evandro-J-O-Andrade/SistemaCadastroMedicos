// routes/plantoes.js (CORRIGIDO)
import express from "express";
import { autenticarToken, autorizarPerfis } from "../middleware/auth.js";
import { schemas, validate } from "../middleware/validation.js";
import { logRequest } from "../middleware/logRequest.js";
import db from "../utils/database.js";

const router = express.Router();
router.use(logRequest);

/** LISTAR PLANTÕES */
router.get("/", autenticarToken, async (req, res) => {
    try {
        // Manter o SQL de GET, pois ele já retorna CRM e ID do médico corretamente
        const sql = `       SELECT p.id, p.data, p.hora_inicio, p.hora_fim, p.status, m.nome AS medico_nome, m.crm,
        GROUP_CONCAT(e.nome, ', ') AS especialidades
      FROM plantoes p
      LEFT JOIN medicos m ON p.medico_id = m.id
      LEFT JOIN medico_especialidade me ON m.id = me.medico_id
      LEFT JOIN especialidades e ON me.especialidade_id = e.id
      GROUP BY p.id
      ORDER BY p.data DESC, p.hora_inicio ASC
    `;
        const rows = await db.all(sql);
        res.json(rows);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Erro listar plantoes" });
    }
});

/** FILTRAR PLANTÕES */
router.get("/filtro", autenticarToken, async (req, res) => {
    const { data, medico_id, especialidade_id } = req.query;
    try {
        let sql = `       SELECT p.id, p.data, p.hora_inicio, p.hora_fim, m.nome AS medico_nome, p.status,
        GROUP_CONCAT(e.nome, ', ') AS especialidades
      FROM plantoes p
      LEFT JOIN medicos m ON p.medico_id = m.id
      LEFT JOIN medico_especialidade me ON m.id = me.medico_id
      LEFT JOIN especialidades e ON me.especialidade_id = e.id
      WHERE 1=1
    `;
        const params = [];
        if (data) { sql += " AND p.data = ?"; params.push(data); }
        if (medico_id) { sql += " AND p.medico_id = ?"; params.push(medico_id); }
        if (especialidade_id) { sql += " AND e.id = ?"; params.push(especialidade_id); }
        sql += " GROUP BY p.id ORDER BY p.data DESC";
        const rows = await db.all(sql, params);
        res.json(rows);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Erro filtro" });
    }
});

/** CRIAR PLANTÃO (verifica conflito <12h) */
router.post("/", autenticarToken, autorizarPerfis("admin", "suporte"), validate(schemas.plantao), async (req, res) => {
    // CORREÇÃO CRÍTICA: Assume que o Front-end envia 'crm' e corrige 'observacoes' para 'observacao'
    const { crm, medico_id: medico_id_body, data, hora_inicio, hora_fim, status, observacao } = req.body;
    const criado_por = req.user.id;

    let medico_id = medico_id_body; // Prioriza o ID se enviado

    try {
        // LÓGICA DE TRADUÇÃO: Busca o ID do médico a partir do CRM (se fornecido)
        if (crm) {
            const medico = await db.get("SELECT id FROM medicos WHERE crm = ?", [crm.toUpperCase()]);
            if (!medico) return res.status(404).json({ error: "CRM do médico não encontrado" });
            medico_id = medico.id;
        }

        if (!medico_id) {
             return res.status(400).json({ error: "ID do médico ou CRM obrigatório para criação" });
        }
        
        // 1. Verifica conflito de horário
        const conflict = await db.get(
            "SELECT id FROM plantoes WHERE medico_id = ? AND data = ? AND (hora_inicio < ? AND hora_fim > ?)",
            [medico_id, data, hora_fim, hora_inicio]
        );
        if (conflict) return res.status(409).json({ error: "Conflito de plantão para esse médico nesse horário" });


        // 2. Insere o Plantão
        // CORREÇÃO: Coluna 'observacao' (singular) e 'medico_id' (traduzido do CRM)
        const r = await db.run(
              "INSERT INTO plantoes (medico_id, data, hora_inicio, hora_fim, status, observacao, criado_em, criado_por) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), ?)",
              [medico_id, data, hora_inicio, hora_fim, status || "Agendado", observacao || null, criado_por]
        );
        res.status(201).json({ id: r.lastID });


    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Erro criar plantao" });
    }
});

/** ATUALIZAR PLANTÃO */
router.put("/:id", autenticarToken, autorizarPerfis("admin", "suporte"), async (req, res) => {
    const { id } = req.params;
    // CORREÇÃO: Usa 'observacao' (singular) e recebe 'crm' opcional
    const { crm, medico_id: medico_id_body, data, hora_inicio, hora_fim, status, observacao } = req.body;
    
    let medico_id = medico_id_body;

    try {
        // LÓGICA DE TRADUÇÃO: Busca o ID do médico a partir do CRM (se fornecido)
        if (crm) {
            const medico = await db.get("SELECT id FROM medicos WHERE crm = ?", [crm.toUpperCase()]);
            if (!medico) return res.status(404).json({ error: "CRM do médico não encontrado" });
            medico_id = medico.id;
        }

        const campos = [];
        const valores = [];
        
        // Inclui o ID do médico (se foi enviado ou traduzido do CRM)
        if (medico_id) { campos.push("medico_id = ?"); valores.push(medico_id); }
        if (data) { campos.push("data = ?"); valores.push(data); }
        if (hora_inicio) { campos.push("hora_inicio = ?"); valores.push(hora_inicio); }
        if (hora_fim) { campos.push("hora_fim = ?"); valores.push(hora_fim); }
        if (status) { campos.push("status = ?"); valores.push(status); }
        
        // CORREÇÃO: Mudar campo 'observacoes' para 'observacao'
        if (observacao !== undefined) { campos.push("observacao = ?"); valores.push(observacao || null); }

        if (!campos.length) return res.status(400).json({ error: "Nenhum campo informado" });


        campos.push("atualizado_em = datetime('now')");
        valores.push(id);

        const r = await db.run(`UPDATE plantoes SET ${campos.join(", ")} WHERE id = ?`, valores);
        if (r.changes === 0) return res.status(404).json({ error: "Plantão não encontrado" });

        res.json({ sucesso: true });


    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Erro atualizar" });
    }
});

/** EXCLUIR PLANTÃO */
router.delete("/:id", autenticarToken, autorizarPerfis("admin", "suporte"), async (req, res) => {
    const { id } = req.params;
    try {
        const r = await db.run("DELETE FROM plantoes WHERE id = ?", [id]);
        if (r.changes === 0) return res.status(404).json({ error: "Plantão não encontrado" });
        res.json({ sucesso: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Erro excluir" });
    }
});

/** RELATÓRIO POR PERÍODO */
// Manter esta rota, ela não precisa de alterações
router.post("/relatorio", autenticarToken, autorizarPerfis("admin", "suporte"), async (req, res) => {
    const { dataInicio, dataFim } = req.body;
    try {
        const rows = await db.all(`       SELECT m.nome AS medico, GROUP_CONCAT(e.nome, ', ') AS especialidades, p.data, p.hora_inicio, p.hora_fim, p.status
      FROM plantoes p
      LEFT JOIN medicos m ON p.medico_id = m.id
      LEFT JOIN medico_especialidade me ON m.id = me.medico_id
      LEFT JOIN especialidades e ON me.especialidade_id = e.id
      WHERE p.data BETWEEN ? AND ?
      GROUP BY p.id
      ORDER BY p.data ASC, p.hora_inicio ASC
    `, [dataInicio || "1900-01-01", dataFim || "2999-12-31"]);


        res.json({ periodo: { de: dataInicio, ate: dataFim }, total: rows.length, registros: rows });


    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Erro relatorio" });
    }
});

export default router;