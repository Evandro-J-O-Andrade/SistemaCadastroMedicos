// src/App.tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './auth/context/AuthContextProvider';
import { EnterpriseShell } from './core/shell/EnterpriseShell';
import Welcome from './pages/Welcome';
import DashboardAdminMaster from './pages/DashboardAdminMaster';
import GestaoTenants from './pages/GestaoTenants';
import GestaoDocumentosLegais from './pages/GestaoDocumentosLegais';
import Login from './pages/LoginEnterprise';
import TrocaSenha from './pages/TrocaSenha';
import Home from './pages/Home';
import Medicos from './pages/Medicos';
import Plantao from './pages/Plantao';
import Relatorios from './pages/Relatorios';
import Filtros from './pages/Filtros';
import CadastroEmLote from './pages/CadastroEmLote';
import CadastroUsuarios from './pages/CadastroUsuarios';
import { ProtectedRoute } from './components/ProtectedRoute';

const ONBOARDING_PATHS = ['/troca-senha', '/welcome'];

function App() {
  const { authenticated } = useAuth();

  const publicRoutes = (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/troca-senha" element={<TrocaSenha />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );

  const appRoutes = (
    <Routes>
      <Route path="/welcome" element={<Welcome />} />
      <Route element={<ProtectedRoute requireOnboardingComplete={true} allowedOnboardingPaths={ONBOARDING_PATHS} allowedRoles={['root', 'admin']} />}>
        <Route path="/dashboard/admin-master" element={<DashboardAdminMaster />} />
        <Route path="/admin/tenants" element={<GestaoTenants />} />
        <Route path="/admin/documentos-legais" element={<GestaoDocumentosLegais />} />
      </Route>
      <Route element={<ProtectedRoute requireOnboardingComplete={true} allowedOnboardingPaths={ONBOARDING_PATHS} />}>
        <Route path="/" element={<Home />} />
        <Route path="/relatorios" element={<Relatorios />} />
        <Route path="/filtros" element={<Filtros />} />
      </Route>
      <Route
        element={
          <ProtectedRoute
            requireOnboardingComplete={true}
            allowedOnboardingPaths={ONBOARDING_PATHS}
            allowedRoles={['admin', 'suporte']}
          />
        }
      >
        <Route path="/medicos" element={<Medicos />} />
        <Route path="/plantao" element={<Plantao />} />
        <Route path="/cadastro-lote" element={<CadastroEmLote />} />
      </Route>
      <Route
        element={
          <ProtectedRoute
            requireOnboardingComplete={true}
            allowedOnboardingPaths={ONBOARDING_PATHS}
            allowedRoles={['admin']}
          />
        }
      >
        <Route path="/cadastro-usuarios" element={<CadastroUsuarios />} />
      </Route>
    </Routes>
  );

  return (
    <>
      {/* Rotas públicas - sem AppShell */}
      {!authenticated && publicRoutes}

      {/* Rotas autenticadas - dentro do AppShell */}
      {authenticated && (
        <EnterpriseShell>
          {appRoutes}
        </EnterpriseShell>
      )}
    </>
  );
}

export default App;
