import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.NODEMAILER_HOST,
  port: Number(process.env.NODEMAILER_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.NODEMAILER_USER,
    pass: process.env.NODEMAILER_PASS
  }
});

// envia para o admin (pedido de recuperação)
export async function sendRecoveryToAdmin(username, token) {
  const admin = process.env.ADMIN_EMAIL;
  const info = {
    from: process.env.NODEMAILER_USER,
    to: admin,
    subject: "Pedido de recuperação de senha - Sistema",
    html: `
      <p>Usuário <strong>${username}</strong> solicitou recuperação de senha.</p>
      <p>Token: <code>${token}</code></p>
      <p>Use o endpoint <strong>POST /auth/reset-senha/:token</strong> para resetar a senha (admin).</p>
    `
  };
  return transporter.sendMail(info);
}

// função utilitária: enviar senha temporária pro usuário (opcional)
export async function sendTempPasswordToUser(email, novoPass) {
  if (!email) return null;
  const info = {
    from: process.env.NODEMAILER_USER,
    to: email,
    subject: "Sua nova senha temporária",
    html: `
      <p>Sua senha temporária é: <strong>${novoPass}</strong></p>
      <p>Ao logar, troque sua senha imediatamente.</p>
    `
  };
  return transporter.sendMail(info);
}
