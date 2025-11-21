const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

/**
 * Helper geral de requisição à API
 * @param {string} endpoint - Endpoint da API (ex: "/usuarios")
 * @param {object} options - Configurações do fetch
 * @param {number} timeoutMs - Timeout opcional em milissegundos (default 10s)
 */
async function apiFetch(endpoint, options = {}, timeoutMs = 10000) {
  const token = localStorage.getItem("token");

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error("A requisição demorou demais e foi abortada.");
    }
    throw new Error(err.message || "Erro ao conectar com a API.");
  } finally {
    clearTimeout(timeout);
  }

  // Logout automático em 401
  if (response.status === 401) {
    localStorage.clear();
    window.location.href = "/login";
    return;
  }

  // Lida com respostas não JSON ou vazias
  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  // Erros HTTP
  if (!response.ok) {
    throw new Error(data?.message || `Erro ${response.status}: ${response.statusText}`);
  }

  return data;
}

export default apiFetch;
