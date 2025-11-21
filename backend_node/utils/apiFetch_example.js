// utils/apiFetch_example.js
// Exemplo de helper para o frontend. Copie/ajuste para seu src/api/* no front.
export const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

export async function apiFetch(endpoint, options = {}, timeoutMs = 10000) {
  const url = `${API_URL}${endpoint}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  options.signal = controller.signal;
  options.headers = options.headers || {};
  if (!options.headers["Content-Type"] && !(options.body instanceof FormData)) {
    options.headers["Content-Type"] = "application/json";
  }
  // envia token se existir no localStorage
  const token = (typeof window !== 'undefined') ? (localStorage.getItem('token') || null) : null;
  if (token) options.headers.Authorization = `Bearer ${token}`;

  try {
    const res = await fetch(url, options);
    clearTimeout(timeout);
    if (!res.ok) {
      const text = await res.text().catch(() => null);
      let json = null;
      try { json = text ? JSON.parse(text) : null; } catch(e){}
      const message = (json && (json.error || json.message)) || res.statusText || 'Erro HTTP';
      throw new Error(`HTTP ${res.status}: ${message}`);
    }
    if (res.status === 204) return null;
    const data = await res.json().catch(() => null);
    return data;
  } catch (err) {
    if (err.name === "AbortError") throw new Error("Timeout de requisição");
    throw err;
  }
}
