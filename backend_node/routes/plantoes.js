// routes/plantoes.js
import express from "express";
import db from "../db/database.js";
// 🚨 Importações de Segurança
import { autenticarToken, autorizarPerfis } from "./auth.js"; 

const router = express.Router();

/**
 * ✅ GET - Lista todos os plantões com informações completas do médico
 */
// 🔒 Protegido: Apenas usuários logados podem visualizar
router.get("/", autenticarToken, (req, res) => {
  const sql = `
    SELECT 
      p.id,
      p.data,
      p.hora_inicio,
      p.hora_fim,
      p.status,
      m.nome AS medico_nome,
      m.crm,
      GROUP_CONCAT(e.nome, ', ') AS especialidades
    FROM plantoes p
    LEFT JOIN medicos m ON p.medico_id = m.id
    LEFT JOIN medico_especialidade me ON m.id = me.medico_id
    LEFT JOIN especialidades e ON me.especialidade_id = e.id
    GROUP BY p.id
    ORDER BY p.data DESC, p.hora_inicio ASC;
  `;

  db.all(sql, (err, rows) => {
    if (err) {
      console.error("❌ Erro ao listar plantões:", err.message);
      return res.status(500).json({ error: "Erro ao listar plantões" });
    }
    res.json(rows);
  });
});

/**
 * 🔍 GET /filtro - Filtro de plantões por data, médico ou especialidade
 */
// 🔒 Protegido: Apenas usuários logados podem filtrar
router.get("/filtro", autenticarToken, (req, res) => {
  const { data, medico_id, especialidade_id } = req.query;

  let sql = `
    SELECT 
      p.id,
      p.data,
      p.hora_inicio,
      p.hora_fim,
      m.nome AS medico_nome,
      GROUP_CONCAT(e.nome, ', ') AS especialidades
    FROM plantoes p
    LEFT JOIN medicos m ON p.medico_id = m.id
    LEFT JOIN medico_especialidade me ON m.id = me.medico_id
    LEFT JOIN especialidades e ON me.especialidade_id = e.id
    WHERE 1=1
  `;
  const params = [];

  if (data) {
    sql += " AND p.data = ?";
    params.push(data);
  }
  if (medico_id) {
    sql += " AND p.medico_id = ?";
    params.push(medico_id);
  }
  if (especialidade_id) {
    // A condição de filtro precisa ser feita na tabela de especialidades, que está sendo agrupada
    sql += " AND me.especialidade_id = ?"; // Corrigido para filtrar na tabela de ligação
    params.push(especialidade_id);
  }

  sql += " GROUP BY p.id ORDER BY p.data DESC;";

  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error("❌ Erro no filtro de plantões:", err.message);
      return res.status(500).json({ error: "Erro ao aplicar filtro" });
    }
    res.json(rows);
  });
});

/**
 * ➕ POST - Cria novo plantão
 */
// 🔒 Protegido: Apenas Admin e Suporte podem criar
router.post("/", autenticarToken, autorizarPerfis("admin", "suporte"), (req, res) => {
  const { medico_id, data, hora_inicio, hora_fim, status, observacoes } = req.body;

  if (!medico_id || !data || !hora_inicio || !hora_fim) {
    return res.status(400).json({ error: "Campos obrigatórios faltando" });
  }

  db.run(
    `
      INSERT INTO plantoes (medico_id, data, hora_inicio, hora_fim, status, observacoes, criado_em)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `,
    [medico_id, data, hora_inicio, hora_fim, status || "Agendado", observacoes || null],
    function (err) {
      if (err) {
        console.error("❌ Erro ao criar plantão:", err.message);
        return res.status(500).json({ error: "Erro ao criar plantão" });
      }

      res.status(201).json({
        id: this.lastID,
        medico_id,
        data,
        hora_inicio,
        hora_fim,
        status: status || "Agendado",
      });
    }
  );
});

/**
 * ✏️ PUT - Atualiza plantão
 */
// 🔒 Protegido: Apenas Admin e Suporte podem atualizar
router.put("/:id", autenticarToken, autorizarPerfis("admin", "suporte"), (req, res) => {
  const { id } = req.params;
  const { medico_id, data, hora_inicio, hora_fim, status, observacoes } = req.body;
  
  // Lógica de atualização dinâmica (melhoria)
  const campos = [];
  const valores = [];

  if (medico_id) { campos.push("medico_id = ?"); valores.push(medico_id); }
  if (data) { campos.push("data = ?"); valores.push(data); }
  if (hora_inicio) { campos.push("hora_inicio = ?"); valores.push(hora_inicio); }
  if (hora_fim) { campos.push("hora_fim = ?"); valores.push(hora_fim); }
  if (status) { campos.push("status = ?"); valores.push(status); }
  // O null deve ser aceito caso queiram limpar a observação
  if (observacoes !== undefined) { campos.push("observacoes = ?"); valores.push(observacoes || null); } 
  
  if (campos.length === 0) {
    return res.status(400).json({ error: "Nenhum campo informado para atualização" });
  }

  campos.push("atualizado_em = datetime('now')");
  valores.push(id);

  db.run(
    `UPDATE plantoes SET ${campos.join(", ")} WHERE id=?`,
    valores,
    function (err) {
      if (err) {
        console.error("❌ Erro ao atualizar plantão:", err.message);
        return res.status(500).json({ error: "Erro ao atualizar plantão" });
      }
      if (this.changes === 0) {
          return res.status(404).json({ error: "Plantão não encontrado" });
      }
      res.json({ sucesso: true, id });
    }
  );
});

/**
 * ❌ DELETE - Remove plantão
 */
// 🔒 Protegido: Apenas Admin e Suporte podem deletar
router.delete("/:id", autenticarToken, autorizarPerfis("admin", "suporte"), (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM plantoes WHERE id=?", [id], function (err) {
    if (err) {
      console.error("❌ Erro ao excluir plantão:", err.message);
      return res.status(500).json({ error: "Erro ao excluir plantão" });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: "Plantão não encontrado" });
    }
    res.json({ sucesso: true });
  });
});

/**
 * 📊 POST /relatorio - Gera relatório de plantões por intervalo de datas
 */
// 🔒 Protegido: Apenas Admin e Suporte podem gerar relatório
router.post("/relatorio", autenticarToken, autorizarPerfis("admin", "suporte"), (req, res) => {
  const { dataInicio, dataFim } = req.body;

  const sql = `
    SELECT 
      m.nome AS medico,
      GROUP_CONCAT(e.nome, ', ') AS especialidades,
      p.data,
      p.hora_inicio,
      p.hora_fim,
      p.status
    FROM plantoes p
    LEFT JOIN medicos m ON p.medico_id = m.id
    LEFT JOIN medico_especialidade me ON m.id = me.medico_id
    LEFT JOIN especialidades e ON me.especialidade_id = e.id
    WHERE p.data BETWEEN ? AND ?
    GROUP BY p.id
    ORDER BY p.data ASC, p.hora_inicio ASC;
  `;

  // Uso de valores padrão para caso não sejam passados, buscando todos os registros
  db.all(sql, [dataInicio || "1900-01-01", dataFim || "2999-12-31"], (err, rows) => {
    if (err) {
      console.error("❌ Erro ao gerar relatório:", err.message);
      return res.status(500).json({ error: "Erro ao gerar relatório" });
    }

    res.json({
      periodo: { de: dataInicio, ate: dataFim },
      total: rows.length,
      registros: rows,
    });
  });
});

export default router;