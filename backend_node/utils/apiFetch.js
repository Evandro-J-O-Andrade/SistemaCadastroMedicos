// Helper simples para chamadas internas (node -> node) caso precise
import fetch from "node-fetch";
import { API_CONFIG } from "./apiConfig.js";

export async function apiFetchInternal(path, opts = {}) {
  const url = (process.env.INTERNAL_API_BASE || API_CONFIG.API_URL) + path;
  const res = await fetch(url, opts);
  const text = await res.text();
  try { return JSON.parse(text); } catch { return text; }
}
