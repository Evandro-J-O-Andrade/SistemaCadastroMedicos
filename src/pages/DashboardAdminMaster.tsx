// DashboardAdminMaster — Central administrativa para ROOT global
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  Building,
  Users,
  User,
  ShieldCheck,
  Calendar,
  BarChart3,
  Bell,
  Cog,
  AlertCircle,
} from 'lucide-react';
import {
  Card,
  SectionHeader,
  Badge,
  Table,
  TableHeader,
  TableRow,
  TableCell,
  Button,
  Loading,
  UnavailableState,
} from '../components/ui/base';
import { COLORS, TYPOGRAPHY, SPACING, getThemeColors } from '../components/ui/designTokens';

interface ModuleCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  role: string;
  disponivel: boolean;
  motivo?: string;
  onClick?: () => void;
  isDark: boolean;
}

function ModuleCard({ title, description, icon: Icon, role, disponivel, motivo, onClick, isDark }: ModuleCardProps) {
  const theme = getThemeColors(isDark);
  return (
    <div style={{ cursor: disponivel && onClick ? 'pointer' : 'default', opacity: disponivel ? 1 : 0.6 }}>
      <Card isDark={isDark} padding={SPACING.md}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.sm }}>
          <div>
            <Icon style={{ width: 24, height: 24, color: disponivel ? COLORS.primary : theme.textMuted }} />
            <Badge variant="info" isDark={isDark}>{role}</Badge>
          </div>
          {!disponivel && <span style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.warning }}>Indisponível</span>}
        </div>
        <h4 style={{ margin: '0 0 8px 0', fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: TYPOGRAPHY.fontWeight.semibold, color: theme.text }}>
          {title}
        </h4>
        <p style={{ margin: '0 0 12px 0', fontSize: TYPOGRAPHY.fontSize.xs, color: theme.textMuted }}>{description}</p>
        {motivo && (
          <p style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.warning, fontStyle: 'italic' }}>{motivo}</p>
        )}
        {disponivel && onClick && (
          <div style={{ marginTop: SPACING.sm }}>
            <div style={{ padding: '6px 12px' }}>
              <Button variant="secondary" onClick={onClick}>
                Acessar
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

export default function DashboardAdminMaster() {
  const navigate = useNavigate();
  const { user, loading, authenticated, error } = useAuth();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('gma-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDark(saved ? saved === 'dark' : prefersDark);
  }, []);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('gma-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const theme = getThemeColors(isDark);

  if (loading || !authenticated) {
    return <Loading isDark={isDark} message="Carregando dashboard administrativo..." />;
  }

  if (!user) {
    return (
      <div style={{ padding: SPACING.xxl, textAlign: 'center', color: theme.textMuted }}>
        <AlertCircle style={{ width: 48, height: 48, color: COLORS.error, marginBottom: SPACING.md }} />
        <h2 style={{ fontSize: TYPOGRAPHY.fontSize.lg, fontWeight: TYPOGRAPHY.fontWeight.bold, color: theme.text }}>
          Sessão não encontrada
        </h2>
        <p style={{ marginTop: SPACING.sm }}>Faça login para acessar o Admin Master.</p>
      </div>
    );
  }

  // Verificar ROOT global
  const roles = Array.isArray(user.roles) ? user.roles : [];
  const isRootGlobal = roles.includes('root') && !user.tenant_id;

  if (!isRootGlobal) {
    return (
      <div style={{ padding: SPACING.xxl, textAlign: 'center', color: theme.textMuted }}>
        <ShieldCheck style={{ width: 48, height: 48, color: COLORS.warning, marginBottom: SPACING.md }} />
        <h2 style={{ fontSize: TYPOGRAPHY.fontSize.lg, fontWeight: TYPOGRAPHY.fontWeight.bold, color: theme.text }}>
          Acesso restrito
        </h2>
        <p style={{ marginTop: SPACING.sm }}>
          O Dashboard Admin Master é exclusivo para ROOT global. Seu contexto atual é limitado ao tenant.
        </p>
        <div style={{ marginTop: SPACING.md }}>
          <Button variant="secondary" onClick={() => navigate('/')}>
            Voltar ao dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (error && !user) {
    return (
      <div style={{ padding: SPACING.xxl, textAlign: 'center', color: theme.textMuted }}>
        <AlertCircle style={{ width: 48, height: 48, color: COLORS.error, marginBottom: SPACING.md }} />
        <h2 style={{ fontSize: TYPOGRAPHY.fontSize.lg, fontWeight: TYPOGRAPHY.fontWeight.bold, color: theme.text }}>
          Erro de autenticação
        </h2>
        <p style={{ marginTop: SPACING.sm }}>{error.message}</p>
      </div>
    );
  }

  // Módulos administrativos (indisponíveis enquanto backend não for implementado)
  const modulos = [
    {
      title: 'Gestão de Tenants',
      description: 'Cadastro, edição e ativação de tenants da plataforma.',
      icon: Building,
      role: 'ROOT Global',
      disponivel: false,
      motivo: 'Backend de tenants pendente (Gate 2.3 Chunk 3)',
    },
    {
      title: 'Unidades e Vínculos',
      description: 'Gestão de unidades médicas e vínculos pessoa-unidade.',
      icon: Building,
      role: 'ROOT Global',
      disponivel: false,
      motivo: 'Backend de unidades pendente (Gate 2.3 Chunk 3)',
    },
    {
      title: 'Pessoas e Usuários',
      description: 'Cadastro de pessoas, vínculos auth_identity_links e role_assignments.',
      icon: Users,
      role: 'ROOT Global',
      disponivel: false,
      motivo: 'Backend de pessoas pendente (Gate 2.3 Chunk 3)',
    },
    {
      title: 'Médicos e Especialidades',
      description: 'Catálogo de profissionais médicos e especialidades.',
      icon: User,
      role: 'ROOT Global',
      disponivel: false,
      motivo: 'Backend médico pendente (regras 12×36 preservadas)',
    },
    {
      title: 'Plantões e Produção',
      description: 'Escala 12×36, plantões e produção médica por unidade.',
      icon: Calendar,
      role: 'ROOT Global',
      disponivel: false,
      motivo: 'Backend de plantão pendente (Gate 2.3 Chunk 3)',
    },
    {
      title: 'RBAC — Roles e Permissões',
      description: 'Definição de papéis, permissões e políticas de acesso.',
      icon: ShieldCheck,
      role: 'ROOT Global',
      disponivel: false,
      motivo: 'Backend de RBAC pendente (Gate 2.3 Chunk 3)',
    },
    {
      title: 'Auditoria e Segurança',
      description: 'Eventos de auditoria, log de acessos e alterações.',
      icon: Bell,
      role: 'ROOT Global',
      disponivel: false,
      motivo: 'Backend de auditoria pendente (Gate 2.3 Chunk 3)',
    },
    {
      title: 'Relatórios Gerenciais',
      description: 'Indicadores operacionais e relatórios de gestão.',
      icon: BarChart3,
      role: 'ROOT Global',
      disponivel: false,
      motivo: 'Backend de relatórios pendente (Gate 2.3 Chunk 3)',
    },
    {
      title: 'Configurações SaaS',
      description: 'Parâmetros globais da plataforma, temas e integrações.',
      icon: Cog,
      role: 'ROOT Global',
      disponivel: false,
      motivo: 'Backend de configurações pendente (Gate 2.3 Chunk 3)',
    },
  ];

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
      <SectionHeader title="Admin Master" subtitle="Central administrativa da plataforma — ROOT Global" isDark={isDark} />

      {/* KPIs - estado indisponível */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: SPACING.md, marginBottom: SPACING.lg }}>
        <UnavailableState
          isDark={isDark}
          title="Indicadores indisponíveis"
          message="O backend de métricas operacionais ainda não foi implementado. Valores fictícios não são exibidos."
          icon={BarChart3}
        />
      </div>

      {/* Módulos administrativos */}
      <SectionHeader title="Módulos Administrativos" subtitle="Acesso restrito a ROOT global. Módulos sem backend implementado exibem estado indisponível." isDark={isDark} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: SPACING.md }}>
        {modulos.map((m) => (
          <ModuleCard key={m.title} {...m} isDark={isDark} />
        ))}
      </div>

      {/* Seção de informações do ROOT */}
      <SectionHeader title="Contexto do ROOT Global" isDark={isDark} />
      <Card isDark={isDark} padding={SPACING.md}>
        <Table isDark={isDark}>
          <TableHeader isDark={isDark}>
            <TableRow isDark={isDark}>
              <TableCell isDark={isDark} bold>Campo</TableCell>
              <TableCell isDark={isDark} bold>Valor</TableCell>
            </TableRow>
          </TableHeader>
          <tbody>
            <TableRow isDark={isDark}>
              <TableCell isDark={isDark}>Pessoa</TableCell>
              <TableCell isDark={isDark}>{user.nome || user.email || '—'}</TableCell>
            </TableRow>
            <TableRow isDark={isDark}>
              <TableCell isDark={isDark}>E-mail</TableCell>
              <TableCell isDark={isDark}>{user.email || '—'}</TableCell>
            </TableRow>
            <TableRow isDark={isDark}>
              <TableCell isDark={isDark}>Papel</TableCell>
              <TableCell isDark={isDark}>{roles.join(', ')}</TableCell>
            </TableRow>
            <TableRow isDark={isDark}>
              <TableCell isDark={isDark}>Tenant</TableCell>
              <TableCell isDark={isDark}>
                <Badge variant="info" isDark={isDark}>Global (sem tenant)</Badge>
              </TableCell>
            </TableRow>
            <TableRow isDark={isDark}>
              <TableCell isDark={isDark}>Onboarding</TableCell>
              <TableCell isDark={isDark}>
                {user.must_change_password || user.terms_pending || user.responsibility_pending || user.welcome_pending ? (
                  <Badge variant="warning" isDark={isDark}>Pendente</Badge>
                ) : (
                  <Badge variant="success" isDark={isDark}>Concluído</Badge>
                )}
              </TableCell>
            </TableRow>
          </tbody>
        </Table>
      </Card>

      {/* Aviso sobre backend pendente */}
      <div style={{ marginTop: SPACING.lg, backgroundColor: theme.bg === COLORS.bg ? '#fffbeb' : '#1e293b', border: `1px solid ${COLORS.warning}`, borderRadius: '8px' }}>
        <Card isDark={isDark} padding="0">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: SPACING.sm }}>
          <AlertCircle style={{ width: 20, height: 20, color: COLORS.warning, flexShrink: 0 }} />
          <div>
            <p style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: TYPOGRAPHY.fontWeight.semibold, color: theme.text }}>
              Backend não homologado
            </p>
            <p style={{ marginTop: SPACING.xs, fontSize: TYPOGRAPHY.fontSize.xs, color: theme.textMuted }}>
              Os módulos administrativos exibem estado indisponível porque o backend Supabase/PostgreSQL ainda não foi implantado remotamente. Nenhum dado fictício é gerado.
            </p>
          </div>
        </div>
      </Card>
      </div>
    </div>
  );
}
