/**
 * API HÍBRIDA – LocalStorage + Node/SQLite + Supabase
 * Funciona automaticamente conforme o ambiente.
 */

console.log("🔧 API.JS CARREGADO – Detectando ambiente...");

const hostname = window.location.hostname;

// ===============================
// 🔵 1) BACKEND LOCAL (Node + SQLite)
// ===============================
const BACKEND_NODE = "http://localhost:5000";

// ===============================
// 🟣 2) SUPABASE (desativado por padrão)
// Ligue colocando SUPABASE_ATIVO=true
// ===============================
const SUPABASE_ATIVO = false; // deixe false até configurarmos
const SUPABASE_URL = "https://SEU-PROJETO.supabase.co";
const SUPABASE_API = "SEU-KEY-AQUI"; // depois colocamos seguro

// ===============================
// 🟢 3) LOCAL STORAGE (Netlify)
// ===============================
const usandoNetlify = hostname.includes("netlify.app");
const usandoLocalhost = hostname === "localhost";

// ===============================
// 🔧 SELETOR INTELIGENTE
// ===============================
function getAmbiente() {
 if (SUPABASE_ATIVO) return "supabase";
 if (usandoLocalhost) return "node";
 if (usandoNetlify) return "localstorage";
 return "node"; // fallback
}

const AMBIENTE = getAmbiente();
console.log("🌍 AMBIENTE DETECTADO:", AMBIENTE);

// ==================================================================================
// 🔥 FUNÇÕES LOCALSTORAGE (NETLIFY)
// ==================================================================================
const LocalDB = {
 listar: (tabela) => JSON.parse(localStorage.getItem(tabela) || "[]"),
salvar: (tabela, dados) =>
 localStorage.setItem(tabela, JSON.stringify(dados)),
};

// ==================================================================================
// 🌐 SUPABASE – MODEL FUTURO
// ==================================================================================
async function supabaseGET(tabela) {
 const res = await fetch(`${SUPABASE_URL}/rest/v1/${tabela}`, {
 headers: { apikey: SUPABASE_API, Authorization: `Bearer ${SUPABASE_API}` },
 });
 return res.json();
}

// ==================================================================================
// 🔵 NODE – CHAMADAS PADRÃO SQLite
// ==================================================================================
async function nodeGET(url) {
 // Adiciona o cabeçalho de autenticação se houver token (assumindo que o token está no localStorage do browser)
 const token = localStorage.getItem("token");
 const headers = token ? { Authorization: `Bearer ${token}` } : {};
 const res = await fetch(BACKEND_NODE + url, { headers });
 // Lida com o erro 401 ou 403 aqui se necessário
 if (!res.ok && (res.status === 401 || res.status === 403)) {
 console.error("Erro de autenticação/autorização na API. Redirecionar para login.");
 // Em um App React, você faria um redirecionamento ou logout aqui
 }
 return res.json();
}

async function nodePOST(url, data) {
 // Adiciona o cabeçalho de autenticação se houver token
 const token = localStorage.getItem("token");
const headers = { 
 "Content-Type": "application/json",
 ...(token && { Authorization: `Bearer ${token}` })
 };

 const res = await fetch(BACKEND_NODE + url, {
 method: "POST",
 headers: headers,
 body: JSON.stringify(data),
});
 
// Lida com o erro 401 ou 403
if (!res.ok && (res.status === 401 || res.status === 403)) {
 console.error("Erro de autenticação/autorização na API. Redirecionar para login.");
 // Em um App React, você faria um redirecionamento ou logout aqui
 }
 
 return res.json();
}

// ==================================================================================
// 🟦 API FINAL — UNIFICADA
// ==================================================================================

export async function listarMedicos() {
 if (AMBIENTE === "localstorage")
 return LocalDB.listar("medicos");

 if (AMBIENTE === "supabase")
 return supabaseGET("medicos");

 return nodeGET("/medicos");
}

export async function criarMedico(dados) {
 if (AMBIENTE === "localstorage") {
 // Lembrete: O Front-end deve garantir que dados contenha 'observacao' (singular)
 const medicos = LocalDB.listar("medicos");
 medicos.push({ id: Date.now(), ...dados });
 LocalDB.salvar("medicos", medicos);
 return { status: "ok" };
 }

 if (AMBIENTE === "supabase")
 return console.log("⚠ Supabase POST ainda não configurado");
// Envia o payload 'dados' para o Back-end
 return nodePOST("/medicos", dados);
}

export async function listarEspecialidades() {
 if (AMBIENTE === "localstorage")
 return LocalDB.listar("especialidades");

 if (AMBIENTE === "supabase")
return supabaseGET("especialidades");

 return nodeGET("/especialidades");
}

export async function criarEspecialidade(dados) {
 if (AMBIENTE === "localstorage") {
 const esp = LocalDB.listar("especialidades");
esp.push({ id: Date.now(), ...dados });
 LocalDB.salvar("especialidades", esp);
 return { status: "ok" };
 }

 return nodePOST("/especialidades", dados);
}

export async function listarPlantoes() {
 if (AMBIENTE === "localstorage")
 return LocalDB.listar("plantoes");

 return nodeGET("/plantoes");
}

export async function criarPlantao(dados) {
 if (AMBIENTE === "localstorage") {
 // Lembrete: O Front-end deve garantir que dados contenha 'observacao' (singular) e 'crm' ou 'medico_id'
 const plantoes = LocalDB.listar("plantoes");
 plantoes.push({ id: Date.now(), ...dados });
 LocalDB.salvar("plantoes", plantoes);
 return { status: "ok" };
 }

 // Envia o payload 'dados' para o Back-end
 return nodePOST("/plantoes", dados);
}

export async function listarAtendimentosPorPlantao(idPlantao) {
 if (AMBIENTE === "localstorage") {
 const at = LocalDB.listar("atendimentos");
 return at.filter((a) => a.plantao_id === idPlantao);
}

 return nodeGET(`/atendimentos/${idPlantao}`);
}

export async function criarAtendimento(atendimento) {
 if (AMBIENTE === "localstorage") {
 const at = LocalDB.listar("atendimentos");
 at.push({ id: Date.now(), ...atendimento });
 LocalDB.salvar("atendimentos", at);
 return { status: "ok" };
}

 return nodePOST("/atendimentos", atendimento);
}

// RELATÓRIOS
export async function relatorioConsolidadoPlantao() {
 return nodeGET("/relatorio/plantao");
}

export async function relatorioConsolidadoData() {
 return nodeGET("/relatorio/data");
}

export async function relatorioAtendimentos(params) {
 const qs = new URLSearchParams(params);
return nodeGET(`/relatorio/atendimentos?${qs.toString()}`);
}