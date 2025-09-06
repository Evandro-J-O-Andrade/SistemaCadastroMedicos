const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const gestao = require('./gestaoMedica'); // agora require funciona

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ROTAS MÉDICOS
app.get('/medicos', async (req, res) => {
    const medicos = await gestao.listarMedicos();
    res.json(medicos);
});

app.post('/medicos', async (req, res) => {
    const { nome, crm } = req.body;
    const medico = await gestao.criarMedico(nome, crm);
    res.json(medico);
});

app.get('/medicos/pesquisa', async (req, res) => {
    const { nome, crm } = req.query;
    const medicos = await gestao.pesquisarMedicos({ nome, crm });
    res.json(medicos);
});

// ROTAS ESPECIALIDADES
app.get('/especialidades', async (req, res) => {
    const especialidades = await gestao.listarEspecialidades();
    res.json(especialidades);
});

app.post('/especialidades', async (req, res) => {
    const { nome } = req.body;
    const esp = await gestao.criarEspecialidade(nome);
    res.json(esp);
});

// ROTAS PLANTÕES
app.get('/plantoes', async (req, res) => {
    const plantoes = await gestao.listarPlantoes();
    res.json(plantoes);
});

app.post('/plantoes', async (req, res) => {
    const { data, periodo } = req.body;
    const plantao = await gestao.criarPlantao(data, periodo);
    res.json(plantao);
});

// ROTAS ATENDIMENTOS
app.get('/atendimentos/:idPlantao', async (req, res) => {
    const atendimentos = await gestao.listarAtendimentosPorPlantao(req.params.idPlantao);
    res.json(atendimentos);
});

app.post('/atendimentos', async (req, res) => {
    const { id_plantao, id_medico, id_especialidade, tipo, quantidade, observacao } = req.body;
    const atendimento = await gestao.criarAtendimento(id_plantao, id_medico, id_especialidade, tipo, quantidade, observacao);
    res.json(atendimento);
});

// ROTAS RELATÓRIOS
app.get('/relatorio/plantao', async (req, res) => {
    const rel = await gestao.relatorioConsolidadoPlantao();
    res.json(rel);
});

app.get('/relatorio/data', async (req, res) => {
    const rel = await gestao.relatorioConsolidadoData();
    res.json(rel);
});

app.get('/relatorio/atendimentos', async (req, res) => {
    const { id_medico, id_especialidade, data_inicio, data_fim } = req.query;
    const rel = await gestao.relatorioAtendimentos({ id_medico, id_especialidade, data_inicio, data_fim });
    res.json(rel);
});

// INICIAR SERVIDOR
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
/*Teste*/ 