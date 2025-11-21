// Pequeno arquivo de configuração exportável.
// Serve para centralizar valores que o frontend pode querer embutir via build
export const API_CONFIG = {
  API_URL: process.env.API_URL || 'http://localhost:5000',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '8h',
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*'
};
