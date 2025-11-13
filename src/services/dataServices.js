// =========================================================
// 🔹 Camada de serviço principal — integração com backend Node
// =========================================================

import api from "./api.js"; // usa axios com baseURL configurada
import dayjs from "dayjs";
import "dayjs/locale/pt-br";
dayjs.locale("pt-br");

// =========================================================
// 🔹 MÉDICOS
// =========================================================

// Buscar todos os médicos
export async function fetchMedicos() {
  try {
    const res = await api.get("/medicos");
    return res.data || [];
  } catch (err) {
    console.error("❌ Erro ao buscar médicos:", err);
    return [];
  }
}

// Cadastrar novo médico
export async function saveMedico(medico) {
  try {
    const res = await api.post("/medicos", medico);
    return res.data;
  } catch (err) {
    console.error("❌ Erro ao salvar médico:", err);
    return null;
  }
}

// Atualizar médico existente
export async function updateMedico(id, medico) {
  try {
    const res = await api.put(`/medicos/${id}`, medico);
    return res.data;
  } catch (err) {
    console.error("❌ Erro ao atualizar médico:", err);
    return null;
  }
}

// Excluir médico
export async function deleteMedico(id) {
  try {
    const res = await api.delete(`/medicos/${id}`);
    return res.data;
  } catch (err) {
    console.error("❌ Erro ao excluir médico:", err);
    return null;
  }
}

// =========================================================
// 🔹 PLANTÕES
// =========================================================

// Buscar todos os plantões
export async function fetchPlantoes() {
  try {
    const res = await api.get("/plantoes");
    return res.data || [];
  } catch (err) {
    console.error("❌ Erro ao buscar plantões:", err);
    return [];
  }
}

// Criar novo plantão
export async function savePlantao(plantao) {
  try {
    const res = await api.post("/plantoes", plantao);
    return res.data;
  } catch (err) {
    console.error("❌ Erro ao salvar plantão:", err);
    return null;
  }
}

// Atualizar plantão
export async function updatePlantao(id, plantao) {
  try {
    const res = await api.put(`/plantoes/${id}`, plantao);
    return res.data;
  } catch (err) {
    console.error("❌ Erro ao atualizar plantão:", err);
    return null;
  }
}

// Excluir plantão
export async function deletePlantao(id) {
  try {
    const res = await api.delete(`/plantoes/${id}`);
    return res.data;
  } catch (err) {
    console.error("❌ Erro ao excluir plantão:", err);
    return null;
  }
}

// =========================================================
// 🔹 USUÁRIOS
// =========================================================

// Buscar todos os usuários
export async function fetchUsuarios() {
  try {
    const res = await api.get("/usuarios");
    return res.data || [];
  } catch (err) {
    console.error("❌ Erro ao buscar usuários:", err);
    return [];
  }
}

// Cadastrar novo usuário
export async function saveUsuario(usuario) {
  try {
    const res = await api.post("/usuarios", usuario);
    return res.data;
  } catch (err) {
    console.error("❌ Erro ao salvar usuário:", err);
    return null;
  }
}

// =========================================================
// 🔹 AUTENTICAÇÃO
// =========================================================

// Login
export async function login(email, senha) {
  try {
    const res = await api.post("/auth/login", { email, senha });
    return res.data;
  } catch (err) {
    console.error("❌ Erro no login:", err);
    return null;
  }
}

// Registro
export async function register(usuario) {
  try {
    const res = await api.post("/auth/register", usuario);
    return res.data;
  } catch (err) {
    console.error("❌ Erro no registro:", err);
    return null;
  }
}

// =========================================================
// 🔹 RELATÓRIO / CONSOLIDAÇÃO
// =========================================================

export async function getDadosConsolidados(filtros = {}) {
  try {
    const res = await api.post("/plantoes/relatorio", filtros);
    return res.data || [];
  } catch (err) {
    console.error("❌ Erro ao gerar relatório:", err);
    return [];
  }
}

// =========================================================
// 🔹 DEBUG DEV
// =========================================================

export const debugAPI = async () => {
  try {
    const res = await api.get("/");
    console.log("🌐 Backend status:", res.data);
  } catch (err) {
    console.error("⚠️ Backend offline:", err.message);
  }
};
