// emailConfig.js
// Variáveis pegando do ambiente (.env no Netlify)
export const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
export const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
export const PUBLIC_KEY  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
