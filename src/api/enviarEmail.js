import emailjs from "emailjs-com";
import { SERVICE_ID, TEMPLATE_ID, PUBLIC_KEY } from "./emailConfig.js";

export const enviarEmail = async (usuario) => {
  try {
    await emailjs.send(SERVICE_ID, TEMPLATE_ID, { usuario }, PUBLIC_KEY);
    return { status: "success", message: "Email enviado com sucesso!" };
  } catch (err) {
    return { status: "error", message: err.message || err };
  }
};

// Para funções serverless no Netlify, exporte um handler padrão
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
