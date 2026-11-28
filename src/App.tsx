// src/App.tsx — rotas separadas por estado de autenticação/onboarding
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './auth/context/AuthContextProvider';
import { AppShell } from './core/shell/AppShell';
import { SidebarNavEnterprise } from './core/shell/SidebarNavEnterprise';
import BemVindo from './pages/BemVindo';
import EscolhaConta from './pages/EscolhaConta';
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
import Inicio from './pages/Inicio';

function App() {
  const { loading, authenticated, user, contextSelectionPending } = useAuth();

  if (loading) {
    return <div role="status" className="min-h-dvh flex items-center justify-center bg-bg text-ink-secondary">Carregando acesso...</div>;
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

  // 1º acesso (welcome_pending) OU seleção de contexto da sessão: recepção Enterprise.
  if (user.welcome_pending || contextSelectionPending) {
    return <Routes>
      <Route path="/welcome" element={<BemVindo />} />
      <Route path="/escolha-conta" element={<EscolhaConta />} />
      <Route path="*" element={<Navigate to="/welcome" replace />} />
    </Routes>;
  }

  return (
    <Routes>
      {/* Portal de entrada em tela cheia (sem sidebar operacional) */}
      <Route path="/inicio" element={<Inicio />} />
      <Route path="/welcome" element={<BemVindo />} />
      <Route path="/escolha-conta" element={<EscolhaConta />} />

      {/* Workspace operacional com AppShell Enterprise */}
      <Route
        element={
          <AppShell sidebarContent={({ collapsed, onNavigate }) => <SidebarNavEnterprise collapsed={collapsed} onNavigate={onNavigate} />}>
            <Outlet />
          </AppShell>
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
