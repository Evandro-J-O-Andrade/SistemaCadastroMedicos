// backend/gestaoMedica.js
const db = require('./db'); // conexão PostgreSQL

// =============================
// MÉDICOS
// =============================
async function criarMedico(nome, crm) {
    const query = 'INSERT INTO medicos (nome, crm) VALUES ($1, $2) RETURNING *';
    const res = await db.query(query, [nome, crm]);
    return res.rows[0];
}

async function listarMedicos() {
    const query = 'SELECT * FROM medicos ORDER BY nome';
    const res = await db.query(query);
    return res.rows;
}

async function buscarMedicoPorId(id_medico) {
    const query = 'SELECT * FROM medicos WHERE id_medico = $1';
    const res = await db.query(query, [id_medico]);
    return res.rows[0];
}

async function pesquisarMedicos({ nome, crm }) {
    let query = 'SELECT * FROM medicos WHERE 1=1';
    const params = [];
    let idx = 1;

    if (nome) {
        query += ` AND nome ILIKE $${idx++}`;
        params.push(`%${nome}%`);
    }
    if (crm) {
        query += ` AND crm = $${idx++}`;
        params.push(crm);
    }

    const res = await db.query(query, params);
    return res.rows;
}

// =============================
// ESPECIALIDADES
// =============================
async function criarEspecialidade(nome) {
    const query = 'INSERT INTO especialidades (nome) VALUES ($1) RETURNING *';
    const res = await db.query(query, [nome]);
    return res.rows[0];
}

async function listarEspecialidades() {
    const query = 'SELECT * FROM especialidades ORDER BY nome';
    const res = await db.query(query);
    return res.rows;
}

// =============================
// PLANTÕES
// =============================
async function criarPlantao(data, periodo) {
    const query = 'INSERT INTO plantoes (data, periodo) VALUES ($1, $2) RETURNING *';
    const res = await db.query(query, [data, periodo]);
    return res.rows[0];
}

async function listarPlantoes() {
    const query = 'SELECT * FROM plantoes ORDER BY data, periodo';
    const res = await db.query(query);
    return res.rows;
}

// =============================
// ATENDIMENTOS
// =============================
async function criarAtendimento(id_plantao, id_medico, id_especialidade, tipo, quantidade, observacao = null) {
    const query = `INSERT INTO atendimentos 
                   (id_plantao, id_medico, id_especialidade, tipo, quantidade, observacao)
                   VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`;
    const res = await db.query(query, [id_plantao, id_medico, id_especialidade, tipo, quantidade, observacao]);
    return res.rows[0];
}

async function listarAtendimentosPorPlantao(id_plantao) {
    const query = `
        SELECT a.*, m.nome AS medico, e.nome AS especialidade
        FROM atendimentos a
        JOIN medicos m ON a.id_medico = m.id_medico
        JOIN especialidades e ON a.id_especialidade = e.id_especialidade
        WHERE id_plantao = $1
        ORDER BY m.nome`;
    const res = await db.query(query, [id_plantao]);
    return res.rows;
}

// =============================
// RELATÓRIOS
// =============================
async function relatorioConsolidadoPlantao() {
    const query = 'SELECT * FROM consolidado_plantao ORDER BY data, id_plantao, funcao';
    const res = await db.query(query);
    return res.rows;
}

async function relatorioConsolidadoData() {
    const query = 'SELECT * FROM consolidado_data ORDER BY ano, mes, dia, funcao';
    const res = await db.query(query);
    return res.rows;
}

async function relatorioAtendimentos({ id_medico = null, id_especialidade = null, data_inicio = null, data_fim = null }) {
    let query = `
        SELECT a.*, p.data, p.periodo, m.nome AS medico, e.nome AS especialidade
        FROM atendimentos a
        JOIN plantoes p ON a.id_plantao = p.id_plantao
        JOIN medicos m ON a.id_medico = m.id_medico
        JOIN especialidades e ON a.id_especialidade = e.id_especialidade
        WHERE 1=1`;
    
    const params = [];
    let idx = 1;

    if (id_medico) {
        query += ` AND a.id_medico = $${idx++}`;
        params.push(id_medico);
    }
    if (id_especialidade) {
        query += ` AND a.id_especialidade = $${idx++}`;
        params.push(id_especialidade);
    }
    if (data_inicio) {
        query += ` AND p.data >= $${idx++}`;
        params.push(data_inicio);
    }
    if (data_fim) {
        query += ` AND p.data <= $${idx++}`;
        params.push(data_fim);
    }

    query += ' ORDER BY p.data, p.periodo, m.nome';
    const res = await db.query(query, params);
    return res.rows;
}

// =============================
// EXPORTAÇÃO
// =============================
module.exports = {
  listarMedicos,
  criarMedico,
  pesquisarMedicos,
  listarEspecialidades,
  criarEspecialidade,
  listarPlantoes,
  criarPlantao,
  listarAtendimentosPorPlantao,
  criarAtendimento,
  relatorioConsolidadoPlantao,
  relatorioConsolidadoData,
  relatorioAtendimentos
};
