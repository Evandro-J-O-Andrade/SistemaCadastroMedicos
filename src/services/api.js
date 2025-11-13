// ============================
// 🌐 CONFIGURAÇÃO GERAL
// ============================
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
const DEBUG = process.env.NODE_ENV !== "production"; // Ativa logs em modo dev

// ============================
// ⚙️ HELPER DE REQUISIÇÃO
// ============================

async function apiFetch(endpoint, options = {}, timeoutMs = 10000) {
  const url = `${API_URL}${endpoint}`;

  // 🕒 Timeout de segurança (10s padrão)
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  options.signal = controller.signal;

  try {
    const res = await fetch(url, options);
    clearTimeout(timeout);

    if (!res.ok) {
      let message = `Erro HTTP ${res.status} (${res.statusText})`;
      try {
        const errorBody = await res.json();
        if (errorBody?.message) message = errorBody.message;
      } catch {
        // corpo não é JSON, ignora
      }
      throw new Error(`❌ Falha em ${endpoint}: ${message}`);
    }

    // Resposta vazia
    if (res.status === 204) return null;

    // Tenta parsear o JSON de resposta
    const data = await res.json().catch(() => {
      throw new Error(`⚠️ Resposta inválida (não JSON) em ${endpoint}`);
    });

    if (DEBUG) console.log(`✅ [API] ${endpoint}`, data);
    return data;

  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error(`⏳ Timeout de requisição em ${endpoint}`);
    }
    console.error(`🚨 Erro na requisição: ${endpoint}`, err);
    throw err;
  }
}

// ============================
// 🔧 UTILITÁRIOS CRUD GENÉRICOS
// ============================
function apiRequest(endpoint, method, data = null) {
  const options = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (data) options.body = JSON.stringify(data);
  return apiFetch(endpoint, options);
}

// ============================
// 👤 USUÁRIOS
// ============================
export const listarUsuarios = () => apiFetch("/usuarios");
export const criarUsuario = (dadosUsuario) => apiRequest("/usuarios", "POST", dadosUsuario);

// ============================
// 🩺 MÉDICOS
// ============================
export const listarMedicos = () => apiFetch("/medicos");
export const criarMedico = (dadosMedico) => apiRequest("/medicos", "POST", dadosMedico);

export async function pesquisarMedicos({ nome, crm }) {
  const params = new URLSearchParams();
  if (nome) params.append("nome", nome);
  if (crm) params.append("crm", crm);
  return apiFetch(`/medicos/pesquisa?${params.toString()}`);
}

// ============================
// 💊 ESPECIALIDADES
// ============================
export const listarEspecialidades = () => apiFetch("/especialidades");
export const criarEspecialidade = (nome) => apiRequest("/especialidades", "POST", { nome });

// ============================
// 🕓 PLANTÕES
// ============================
export const listarPlantoes = () => apiFetch("/plantoes");
export const criarPlantao = (dadosPlantao) => apiRequest("/plantoes", "POST", dadosPlantao);

// ============================
// 📋 ATENDIMENTOS
// ============================
export const listarAtendimentosPorPlantao = (idPlantao) =>
  apiFetch(`/atendimentos/${idPlantao}`);

export const criarAtendimento = (atendimento) =>
  apiRequest("/atendimentos", "POST", atendimento);

// ============================
// 📊 RELATÓRIOS
// ============================
export const relatorioConsolidadoPlantao = () => apiFetch("/relatorio/plantao");
export const relatorioConsolidadoData = () => apiFetch("/relatorio/data");

export async function relatorioAtendimentos({ id_medico, id_especialidade, data_inicio, data_fim }) {
  const params = new URLSearchParams();
  if (id_medico) params.append("id_medico", id_medico);
  if (id_especialidade) params.append("id_especialidade", id_especialidade);
  if (data_inicio) params.append("data_inicio", data_inicio);
  if (data_fim) params.append("data_fim", data_fim);
  return apiFetch(`/relatorio/atendimentos?${params.toString()}`);
}

// ============================
// 🔍 FILTROS
// ============================
export async function filtrarPlantoes({ id_medico, id_especialidade, data }) {
  const params = new URLSearchParams();
  if (id_medico) params.append("id_medico", id_medico);
  if (id_especialidade) params.append("id_especialidade", id_especialidade);
  if (data) params.append("data", data);
  return apiFetch(`/plantoes/filtro?${params.toString()}`);
}
