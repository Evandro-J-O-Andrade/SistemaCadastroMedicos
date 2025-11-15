import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.NODEMAILER_HOST,
  port: process.env.NODEMAILER_PORT,
  secure: false,
  auth: {
    user: process.env.NODEMAILER_USER,
    pass: process.env.NODEMAILER_PASS,
  },
});

export async function sendRecoveryToAdmin(username, token) {
  const admin = process.env.ADMIN_EMAIL;
  const info = {
    from: process.env.NODEMAILER_USER,
    to: admin,
    subject: "Pedido de recuperação de senha",
    html: `<p>Usuário <strong>${username}</strong> solicitou recuperação.</p><p>Token: <strong>${token}</strong></p>`,
  };
  return transporter.sendMail(info);
}
