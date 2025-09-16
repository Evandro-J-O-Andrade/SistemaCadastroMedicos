// src/api/enviarEmail.js
import emailjs from "emailjs-com";

// Importa as variáveis do .env
export const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
export const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
export const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

// Função para enviar email
export const enviarEmail = async (usuario) => {
  try {
    await emailjs.send(SERVICE_ID, TEMPLATE_ID, { usuario }, PUBLIC_KEY);
    return { status: "success", message: "Email enviado com sucesso!" };
  } catch (err) {
    return { status: "error", message: err.message || err };
  }
};

// Para serverless (Netlify Functions)
export async function handler(event, context) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ message: "Método inválido" }) };
  }

  try {
    const { usuario } = JSON.parse(event.body);
    const result = await enviarEmail(usuario);
    return { statusCode: 200, body: JSON.stringify(result) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ status: "error", message: err.message }) };
  }
}
