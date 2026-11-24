// Caminhos de rota do fluxo Enterprise People-First
export const AUTH_ROUTES = {
  LOGIN: '/login',
  TROCA_SENHA: '/troca-senha',
  WELCOME: '/welcome',
  DISPATCHER: '/dispatcher',
  DASHBOARD_ADMIN_MASTER: '/dashboard/admin-master',
  DASHBOARD: '/',
} as const;

// Erros distintos do fluxo Enterprise (sem expor credenciais)
export const AUTH_ERRORS = {
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  EMAIL_NOT_CONFIRMED: 'EMAIL_NOT_CONFIRMED',
  IDENTITY_NOT_LINKED: 'IDENTITY_NOT_LINKED',
  PESSOA_INATIVA: 'PESSOA_INATIVA',
  NO_ACTIVE_ROLE: 'NO_ACTIVE_ROLE',
  NOT_AUTHENTICATED: 'NOT_AUTHENTICATED',
  PERMISSAO_INSUFICIENTE: 'PERMISSAO_INSUFICIENTE',
  PRIMEIRO_ACESSO_PENDENTE: 'PRIMEIRO_ACESSO_PENDENTE',
  SERVICE_ERROR: 'SERVICE_ERROR',
} as const;

export type AuthErrorCode = (typeof AUTH_ERRORS)[keyof typeof AUTH_ERRORS];

export const AUTH_ERROR_MESSAGES: Record<AuthErrorCode, string> = {
  [AUTH_ERRORS.INVALID_CREDENTIALS]: 'E-mail ou senha inválidos, ou conta não disponível.',
  [AUTH_ERRORS.EMAIL_NOT_CONFIRMED]: 'E-mail não confirmado. Verifique sua caixa de entrada.',
  [AUTH_ERRORS.IDENTITY_NOT_LINKED]: 'Sua conta não está vinculada a uma pessoa cadastrada. Procure o administrador.',
  [AUTH_ERRORS.PESSOA_INATIVA]: 'Sua pessoa está desativada. Procure o administrador.',
  [AUTH_ERRORS.NO_ACTIVE_ROLE]: 'Você não possui papel/permissão ativo no sistema.',
  [AUTH_ERRORS.NOT_AUTHENTICATED]: 'Sessão expirada. Faça login novamente.',
  [AUTH_ERRORS.PERMISSAO_INSUFICIENTE]: 'Permissão insuficiente para acessar este recurso.',
  [AUTH_ERRORS.PRIMEIRO_ACESSO_PENDENTE]: 'Primeiro acesso: conclua a troca de senha e o aceite dos termos.',
  [AUTH_ERRORS.SERVICE_ERROR]: 'Falha temporária do serviço. Tente novamente.',
} as const;
