// src/pages/Welcome.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { resolverDestinoPorBootstrap } from '../auth/services/dispatcherService';
import { AUTH_ROUTES } from '../lib/authConfig';
import {
  ShieldCheck,
  User,
  Calendar,
  BarChart3,
  ShieldAlert,
  Loader2,
  AlertCircle,
  Mail,
} from 'lucide-react';

const isDark = () => {
  if (typeof window === 'undefined') return false;
  return document.documentElement.classList.contains('dark') || window.matchMedia('(prefers-color-scheme: dark)').matches;
};

export default function Welcome() {
  const navigate = useNavigate();
  const { user, bootstrap, loading, authenticated, error } = useAuth();
  const [dispatcher, setDispatcher] = useState<{
    destino: { path: string; label: string; modulo: string; disponivel: boolean; motivoIndisponivel?: string } | null;
    onboardingPendente: boolean;
    caminhoOnboarding: string | null;
    motivoBloqueio: string | null;
  } | null>(null);

  useEffect(() => {
    if (bootstrap) {
      setDispatcher(resolverDestinoPorBootstrap(bootstrap));
    }
  }, [bootstrap]);

  // Estados de carregamento / erro
  if (loading || !authenticated) {
    return (
      <div className="welcome-page" style={styles.page}>
        <div style={styles.card}>
          <div style={styles.spinnerContainer}>
            <Loader2 style={styles.loader} />
          </div>
          <p style={styles.textMuted}>Carregando identidade...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="welcome-page" style={styles.page}>
        <div style={styles.card}>
          <AlertCircle style={styles.iconError} />
          <h2 style={styles.title}>Sessão não encontrada</h2>
          <p style={styles.text}>Faça login para acessar o sistema.</p>
          <button
            onClick={() => navigate(AUTH_ROUTES.LOGIN)}
            style={styles.btnPrimary}
          >
            Ir ao login
          </button>
        </div>
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="welcome-page" style={styles.page}>
        <div style={styles.card}>
          <AlertCircle style={styles.iconError} />
          <h2 style={styles.title}>Erro de autenticação</h2>
          <p style={styles.text}>{error.message}</p>
          <button
            onClick={() => navigate(AUTH_ROUTES.LOGIN)}
            style={styles.btnPrimary}
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  // Onboarding pendente → redireciona para o caminho adequado
  if (dispatcher && dispatcher.onboardingPendente && dispatcher.caminhoOnboarding) {
    return (
      <div className="welcome-page" style={styles.page}>
        <div style={styles.card}>
          <ShieldAlert style={styles.iconWarning} />
          <h2 style={styles.title}>Primeiro acesso</h2>
          <p style={styles.text}>{dispatcher.motivoBloqueio}</p>
          <button
            onClick={() => {
              if (dispatcher.caminhoOnboarding) navigate(dispatcher.caminhoOnboarding);
            }}
            style={styles.btnPrimary}
          >
            Continuar o primeiro acesso
          </button>
        </div>
      </div>
    );
  }

  // Bloqueado sem destino autorizado
  if (dispatcher && !dispatcher.destino && !dispatcher.onboardingPendente) {
    return (
      <div className="welcome-page" style={styles.page}>
        <div style={styles.card}>
          <ShieldAlert style={styles.iconError} />
          <h2 style={styles.title}>Acesso bloqueado</h2>
          <p style={styles.text}>{dispatcher.motivoBloqueio}</p>
          <button
            onClick={() => navigate(AUTH_ROUTES.LOGIN)}
            style={styles.btnPrimary}
          >
            Voltar ao login
          </button>
        </div>
      </div>
    );
  }

  const destino = dispatcher?.destino;
  const dark = isDark();
  const bgColor = dark ? '#0f172a' : '#f8fafc';
  const cardBg = dark ? '#1e293b' : '#ffffff';
  const textColor = dark ? '#f1f5f9' : '#0f172a';
  const mutedColor = dark ? '#94a3b8' : '#64748b';
  const borderColor = dark ? '#334155' : '#e2e8f0';

  // Cards de módulos com base nos papéis e destino
  const modulos: Array<{ label: string; modulo: string; icon: React.ReactNode; disponivel: boolean; motivo?: string }> = [];

  const roles = user.roles || [];
  const temPermissao = (recurso: string, acao: string) => {
    // useAuth hasPermission não está disponível aqui diretamente; usamos permissions do bootstrap
    const perms = user.permissions || [];
    return perms.includes(`${recurso}.${acao}`) || perms.includes(`${recurso}.*`) || perms.includes('*.*');
  };

  if (roles.includes('root') || temPermissao('people', 'read')) {
    modulos.push({
      label: 'Pessoas e Vínculos',
      modulo: 'pessoas',
      icon: <User style={styles.modIcon} />,
      disponivel: true,
    });
  }
  if (roles.includes('admin') || temPermissao('medicos', 'read')) {
    modulos.push({
      label: 'Médicos',
      modulo: 'medicos',
      icon: <ShieldCheck style={styles.modIcon} />,
      disponivel: true,
    });
  }
  if (roles.includes('operador_ti') || roles.includes('operacional') || temPermissao('plantao', 'read')) {
    modulos.push({
      label: 'Plantões 12×36',
      modulo: 'plantao',
      icon: <Calendar style={styles.modIcon} />,
      disponivel: true,
    });
  }
  if (roles.includes('auditor') || temPermissao('relatorios', 'read')) {
    modulos.push({
      label: 'Relatórios',
      modulo: 'relatorios',
      icon: <BarChart3 style={styles.modIcon} />,
      disponivel: true,
    });
  }
  if (roles.includes('suporte') || temPermissao('suporte', 'read')) {
    modulos.push({
      label: 'Suporte',
      modulo: 'suporte',
      icon: <Mail style={styles.modIcon} />,
      disponivel: true,
    });
  }

  // Se não houver módulos, mostrar aviso
  if (modulos.length === 0) {
    modulos.push({
      label: 'Nenhum módulo disponível',
      modulo: 'nenhum',
      icon: <ShieldAlert style={styles.modIcon} />,
      disponivel: false,
      motivo: 'Sem permissões de módulo atribuídas',
    });
  }

  return (
    <div className="welcome-page" style={{ ...styles.page, backgroundColor: bgColor, color: textColor }}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.appTitle}>Gestão Médica Alpha</h1>
          <span style={styles.badge}>Enterprise</span>
        </div>
      </header>

      <main style={styles.main}>
        <div style={styles.welcomeCard}>
          <div style={styles.avatar}>
            <User style={styles.avatarIcon} />
          </div>
          <h2 style={styles.greeting}>Bem-vindo, {user.full_name || user.nome || 'Usuário'}</h2>
          <p style={styles.subtitle}>
            {user.email ? user.email : ''}
            {user.tenant_id ? ` · Tenant: ${user.tenant_id}` : ''}
          </p>

          <div style={styles.contextCard}>
            <h3 style={styles.contextTitle}>Seu contexto de acesso</h3>
            <div style={styles.contextRow}>
              <span style={styles.contextLabel}>Papel:</span>
              <span style={styles.contextValue}>{(user.roles || []).join(', ') || '—'}</span>
            </div>
            <div style={styles.contextRow}>
              <span style={styles.contextLabel}>Tenant:</span>
              <span style={styles.contextValue}>{user.tenant_id || '—'}</span>
            </div>
            <div style={styles.contextRow}>
              <span style={styles.contextLabel}>Unidade:</span>
              <span style={styles.contextValue}>{user.unit_id || '—'}</span>
            </div>
          </div>

            <h3 style={styles.modulesTitle}>Módulos disponíveis</h3>
          <div style={styles.modulesGrid}>
            {modulos.map((m) => (
              <div
                key={m.modulo}
                style={{
                  ...styles.modCard,
                  backgroundColor: cardBg,
                  borderColor: borderColor,
                  color: textColor,
                  opacity: m.disponivel ? 1 : 0.6,
                }}
              >
                <div style={{ ...styles.modIconWrapper, color: m.disponivel ? '#2563eb' : mutedColor }}>
                  {m.icon}
                </div>
                <h4 style={styles.modTitle}>{m.label}</h4>
                {!m.disponivel && m.motivo && (
                  <p style={styles.modMuted}>{m.motivo}</p>
                )}
              </div>
            ))}
          </div>

          {destino && (
            <div style={styles.destinationBox}>
              <h3 style={styles.destTitle}>Destino pós-login</h3>
              <div style={styles.destRow}>
                <span style={styles.destLabel}>Rota:</span>
                <span style={styles.destValue}>{destino.path}</span>
              </div>
              <div style={styles.destRow}>
                <span style={styles.destLabel}>Módulo:</span>
                <span style={styles.destValue}>{destino.modulo}</span>
              </div>
              {!destino.disponivel && destino.motivoIndisponivel && (
                <p style={styles.destMuted}>{destino.motivoIndisponivel}</p>
              )}
            </div>
          )}

          <div style={styles.actions}>
            <button
              onClick={() => {
                if (destino?.disponivel && destino.path) navigate(destino.path);
                else navigate('/');
              }}
              style={styles.btnPrimary}
            >
              Acessar {destino?.label || 'Dashboard'}
            </button>
            <button
              onClick={() => navigate(AUTH_ROUTES.TROCA_SENHA)}
              style={styles.btnSecondary}
            >
              Trocar senha
            </button>
          </div>
        </div>
      </main>

      <footer style={styles.footer}>
        <p style={styles.footerText}>
          Gestão Médica Alpha Enterprise · Auth People-First · Supabase/PostgreSQL
        </p>
      </footer>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    padding: 0,
    margin: 0,
  },
  header: {
    backgroundColor: '#021e3aff',
    color: '#fff',
    padding: '20px 24px',
  },
  headerContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  appTitle: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 700,
  },
  badge: {
    fontSize: '11px',
    padding: '2px 8px',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: '12px',
    color: '#fff',
  },
  main: {
    flex: 1,
    padding: '32px 24px',
    display: 'flex',
    justifyContent: 'center',
  },
  welcomeCard: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '32px',
    maxWidth: '720px',
    width: '100%',
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
    border: '1px solid #e2e8f0',
  },
  avatar: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    backgroundColor: '#e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '16px',
  },
  avatarIcon: {
    width: '32px',
    height: '32px',
    color: '#64748b',
  },
  greeting: {
    margin: '0 0 4px 0',
    fontSize: '24px',
    fontWeight: 700,
  },
  subtitle: {
    margin: '0 0 24px 0',
    fontSize: '14px',
    color: '#64748b',
  },
  contextCard: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '24px',
  },
  contextTitle: {
    margin: '0 0 12px 0',
    fontSize: '14px',
    fontWeight: 700,
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  contextRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
    fontSize: '14px',
  },
  contextLabel: {
    color: '#64748b',
  },
  contextValue: {
    fontWeight: 600,
    color: '#0f172a',
  },
  modulesTitle: {
    margin: '0 0 16px 0',
    fontSize: '14px',
    fontWeight: 700,
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  modulesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '12px',
    marginBottom: '24px',
  },
  modCard: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  modIconWrapper: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    backgroundColor: '#e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modIcon: {
    width: '20px',
    height: '20px',
  },
  modTitle: {
    margin: '0',
    fontSize: '16px',
    fontWeight: 700,
  },
  modMuted: {
    margin: '0',
    fontSize: '12px',
    color: '#94a3b8',
  },
  destinationBox: {
    backgroundColor: '#eef2ff',
    border: '1px solid #c7d2fe',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '24px',
  },
  destTitle: {
    margin: '0 0 12px 0',
    fontSize: '14px',
    fontWeight: 700,
    color: '#4f46e5',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  destRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '6px',
    fontSize: '13px',
  },
  destLabel: {
    color: '#64748b',
  },
  destValue: {
    fontWeight: 600,
    color: '#0f172a',
    fontFamily: 'monospace',
  },
  destMuted: {
    margin: '8px 0 0 0',
    fontSize: '12px',
    color: '#64748b',
  },
  actions: {
    display: 'flex',
    gap: '12px',
  },
  btnPrimary: {
    flex: 1,
    padding: '10px 20px',
    backgroundColor: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  btnSecondary: {
    padding: '10px 20px',
    backgroundColor: 'transparent',
    color: '#64748b',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  footer: {
    padding: '16px 24px',
    backgroundColor: '#f1f5f9',
    borderTop: '1px solid #e2e8f0',
  },
  footerText: {
    margin: 0,
    fontSize: '11px',
    color: '#94a3b8',
  },
  spinnerContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '16px',
  },
  loader: {
    width: '28px',
    height: '28px',
    color: '#2563eb',
  },
  textMuted: {
    margin: 0,
    fontSize: '14px',
    color: '#64748b',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '32px',
    maxWidth: '400px',
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
    border: '1px solid #e2e8f0',
  },
  iconError: {
    width: '48px',
    height: '48px',
    color: '#ef4444',
    marginBottom: '16px',
  },
  iconWarning: {
    width: '48px',
    height: '48px',
    color: '#f59e0b',
    marginBottom: '16px',
  },
  title: {
    margin: '0 0 12px 0',
    fontSize: '20px',
    fontWeight: 700,
  },
  text: {
    margin: '0 0 24px 0',
    fontSize: '14px',
    color: '#64748b',
  },
};
