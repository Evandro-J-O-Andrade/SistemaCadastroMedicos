// src/api.js
const API_URL = "http://localhost:3000"; // ou a URL do seu backend

// ============================
// MÉDICOS
// ============================
export async function listarMedicos() {
  const res = await fetch(`${API_URL}/medicos`);
  return await res.json();
}

export async function criarMedico(nome, crm) {
  const res = await fetch(`${API_URL}/medicos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nome, crm }),
  });
  return await res.json();
}

export async function pesquisarMedicos({ nome, crm }) {
  const params = new URLSearchParams();
  if (nome) params.append("nome", nome);
  if (crm) params.append("crm", crm);

  const res = await fetch(`${API_URL}/medicos/pesquisa?${params.toString()}`);
  return await res.json();
}

// ============================
// ESPECIALIDADES
// ============================
export async function listarEspecialidades() {
  const res = await fetch(`${API_URL}/especialidades`);
  return await res.json();
}

export async function criarEspecialidade(nome) {
  const res = await fetch(`${API_URL}/especialidades`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nome }),
  });
  return await res.json();
}

// ============================
// PLANTÕES
// ============================
export async function listarPlantoes() {
  const res = await fetch(`${API_URL}/plantoes`);
  return await res.json();
}

export async function criarPlantao(data, periodo) {
  const res = await fetch(`${API_URL}/plantoes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data, periodo }),
  });
  return await res.json();
}

// ============================
// ATENDIMENTOS
// ============================
export async function listarAtendimentosPorPlantao(idPlantao) {
  const res = await fetch(`${API_URL}/atendimentos/${idPlantao}`);
  return await res.json();
}

export async function criarAtendimento(atendimento) {
  const res = await fetch(`${API_URL}/atendimentos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(atendimento),
  });
  return await res.json();
}

// ============================
// RELATÓRIOS
// ============================
export async function relatorioConsolidadoPlantao() {
  const res = await fetch(`${API_URL}/relatorio/plantao`);
  return await res.json();
}

export async function relatorioConsolidadoData() {
  const res = await fetch(`${API_URL}/relatorio/data`);
  return await res.json();
}

export async function relatorioAtendimentos({ id_medico, id_especialidade, data_inicio, data_fim }) {
  const params = new URLSearchParams();
  if (id_medico) params.append("id_medico", id_medico);
  if (id_especialidade) params.append("id_especialidade", id_especialidade);
  if (data_inicio) params.append("data_inicio", data_inicio);
  if (data_fim) params.append("data_fim", data_fim);

  const res = await fetch(`${API_URL}/relatorio/atendimentos?${params.toString()}`);
  return await res.json();
}
