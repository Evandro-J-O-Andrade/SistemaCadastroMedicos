// src/pages/Welcome.tsx
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ArrowRight, Building2, Shield, Users } from 'lucide-react';
import { resolveRoutes } from '../core/dispatcher/DispatcherMaster';

export default function Welcome(): React.ReactElement {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fullName = user?.nome || user?.email || 'Usuário';

  const ctx = {
    isRootGlobal: user?.isRootGlobal ?? false,
    roles: user?.roles ?? [],
    permissions: user?.permissions ?? [],
    tenantId: user?.tenantId ?? null,
    unitId: user?.unitId ?? null,
  };
  const routes = resolveRoutes(ctx);
  const firstAvailable = routes.find(r => r.disponivel)?.path || '/';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full text-center">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
          Bem-vindo, {fullName}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-lg mb-8">
          Sua plataforma de gestão médica está pronta.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
            <Building2 className="w-8 h-8 text-blue-600 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Central</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Visão consolidada</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
            <Users className="w-8 h-8 text-green-600 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Unidades</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Gestão por unidade</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
            <Shield className="w-8 h-8 text-purple-600 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Segurança</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">RBAC + RLS</p>
          </div>
        </div>

        <button
          onClick={() => navigate(firstAvailable)}
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
        >
          Acessar Dashboard
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
