// src/App.tsx — rotas separadas por estado de autenticação/onboarding
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './auth/context/AuthContextProvider';
import { EnterpriseShell } from './core/shell/EnterpriseShell';
import Welcome from './pages/Welcome';
import DashboardAdminMaster from './pages/DashboardAdminMaster';
import GestaoTenants from './pages/GestaoTenants';
import GestaoDocumentosLegais from './pages/GestaoDocumentosLegais';
import Login from './pages/LoginEnterprise';
import TrocaSenha from './pages/TrocaSenha';
import LegalOnboarding from './pages/LegalOnboarding';
import Medicos from './pages/Medicos';
import Plantao from './pages/Plantao';
import Relatorios from './pages/Relatorios';
import Filtros from './pages/Filtros';
import CadastroEmLote from './pages/CadastroEmLote';
import CadastroUsuarios from './pages/CadastroUsuarios';
import { ProtectedRoute } from './components/ProtectedRoute';
import { SidebarNav } from './core/shell/SidebarNav';
import Inicio from './pages/Inicio';

function App() {
  const { loading, authenticated, user, contextSelectionPending } = useAuth();

  if (loading) {
    return <div role="status" className="min-h-dvh flex items-center justify-center bg-gray-50 text-gray-700 dark:bg-slate-950 dark:text-slate-200">Carregando acesso...</div>;
  }

  if (!authenticated || !user) {
    return <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>;
  }

  // Onboarding fica FORA do shell operacional. Primeiro a senha, depois documentos, depois Welcome.
  if (user.must_change_password) {
    return <Routes>
      <Route path="/first-login/change-password" element={<TrocaSenha />} />
      <Route path="/troca-senha" element={<TrocaSenha />} />
      <Route path="*" element={<Navigate to="/first-login/change-password" replace />} />
    </Routes>;
  }

  if (user.terms_pending || user.responsibility_pending) {
    return <Routes>
      <Route path="/onboarding/legal" element={<LegalOnboarding />} />
      <Route path="*" element={<Navigate to="/onboarding/legal" replace />} />
    </Routes>;
  }

  if (user.welcome_pending) {
    return <Routes>
      <Route path="/welcome" element={<Welcome />} />
      <Route path="*" element={<Navigate to="/welcome" replace />} />
    </Routes>;
  }

  // Welcome recorrente por login (não em refresh/token refresh): seleção de contexto da sessão.
  if (contextSelectionPending) {
    return <Routes>
      <Route path="/welcome" element={<Welcome />} />
      <Route path="*" element={<Navigate to="/welcome" replace />} />
    </Routes>;
  }

  return (
    <Routes>
      {/* Portal de entrada em tela cheia (sem sidebar operacional) */}
      <Route path="/inicio" element={<Inicio />} />
      <Route path="/welcome" element={<Welcome />} />

      {/* Workspace operacional com AppShell Enterprise */}
      <Route
        element={
          <EnterpriseShell sidebarContent={({ collapsed, onNavigate }) => <SidebarNav collapsed={collapsed} onNavigate={onNavigate} />}>
            <Outlet />
          </EnterpriseShell>
        }
      >
        <Route path="/" element={<Navigate to="/inicio" replace />} />
        <Route element={<ProtectedRoute requireOnboardingComplete allowedRoles={['root', 'admin']} />}>
          <Route path="/dashboard/admin-master" element={<DashboardAdminMaster />} />
          <Route path="/admin/tenants" element={<GestaoTenants />} />
          <Route path="/admin/documentos-legais" element={<GestaoDocumentosLegais />} />
        </Route>
        <Route element={<ProtectedRoute requireOnboardingComplete />}>
          <Route path="/relatorios" element={<Relatorios />} />
          <Route path="/filtros" element={<Filtros />} />
        </Route>
        <Route element={<ProtectedRoute requireOnboardingComplete allowedRoles={['root', 'admin', 'suporte']} />}>
          <Route path="/medicos" element={<Medicos />} />
          <Route path="/plantao" element={<Plantao />} />
          <Route path="/cadastro-lote" element={<CadastroEmLote />} />
        </Route>
        <Route element={<ProtectedRoute requireOnboardingComplete allowedRoles={['root', 'admin']} />}>
          <Route path="/cadastro-usuarios" element={<CadastroUsuarios />} />
        </Route>
        <Route path="*" element={<Navigate to="/inicio" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
