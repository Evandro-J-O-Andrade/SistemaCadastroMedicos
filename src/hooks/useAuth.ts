// Hook de autenticação Enterprise People-First.
// Delegada ao AuthProvider único (src/auth/context/AuthContextProvider.tsx).
// Fonte única de verdade para sessão, identidade bootstrap, RBAC e onboarding.
import { useAuthEnterprise } from '../auth/context/AuthContextProvider';
import type { AuthUser, AuthState, BootstrapResponse } from '../auth/services/authService';

export function useAuth() {
  return useAuthEnterprise();
}

export type { AuthUser, AuthState, BootstrapResponse };
