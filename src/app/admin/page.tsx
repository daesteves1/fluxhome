import { createServiceClient } from '@/lib/supabase/server';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { Building2, Users, FileText, Send, UserCog, TrendingUp, Shield, Clock } from 'lucide-react';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export default async function AdminDashboardPage() {
  const serviceClient = await createServiceClient();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const last7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: officesCount },
    { count: brokersCount },
    { count: activeProcessesCount },
    { count: propostasCount },
    { count: closedThisMonthCount },
    { count: newBrokersThisMonthCount },
    { count: pendingDocsCount },
    { count: recentUploadsCount },
  ] = await Promise.all([
    serviceClient.from('offices').select('*', { count: 'exact', head: true }).eq('is_active', true),
    serviceClient.from('brokers').select('*', { count: 'exact', head: true }).eq('is_active', true),
    serviceClient.from('processes').select('*', { count: 'exact', head: true }).not('process_step', 'in', '("closed","approved")'),
    serviceClient.from('propostas').select('*', { count: 'exact', head: true }),
    serviceClient.from('processes').select('*', { count: 'exact', head: true }).eq('process_step', 'closed').gte('updated_at', startOfMonth),
    serviceClient.from('brokers').select('*', { count: 'exact', head: true }).gte('activated_at', startOfMonth),
    serviceClient.from('document_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    serviceClient.from('document_uploads').select('*', { count: 'exact', head: true }).gte('uploaded_at', last7),
  ]);

  // Recent offices
  const { data: recentOfficesRaw } = await serviceClient
    .from('offices')
    .select('id, name, slug, is_active, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  type OfficeRow = { id: string; name: string; slug: string; is_active: boolean; created_at: string };
  const recentOffices = (recentOfficesRaw ?? []) as OfficeRow[];

  // Recent processes (activity)
  const { data: recentProcessesRaw } = await serviceClient
    .from('processes')
    .select('id, process_step, updated_at, clients(p1_name, p2_name)')
    .order('updated_at', { ascending: false })
    .limit(8);

  type ClientRow = { id: string; p1_name: string; p2_name: string | null; process_step: string; updated_at: string };
  const recentClients = ((recentProcessesRaw ?? []) as unknown as { id: string; process_step: string; updated_at: string; clients: { p1_name: string; p2_name: string | null } | null }[]).map((p): ClientRow => ({
    id: p.id,
    p1_name: p.clients?.p1_name ?? '',
    p2_name: p.clients?.p2_name ?? null,
    process_step: p.process_step,
    updated_at: p.updated_at,
  }));

  const STEP_LABELS: Record<string, string> = {
    docs_pending: 'Docs Pendentes',
    docs_review: 'Em Análise',
    propostas_sent: 'Propostas Enviadas',
    approved: 'Aprovado',
    closed: 'Fechado',
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Shield className="h-6 w-6 text-red-600" />
        <h2 className="text-2xl font-semibold">Super Admin</h2>
      </div>

      {/* KPI Row 1 */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Plataforma</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard title="Escritórios Ativos" value={officesCount ?? 0} icon={Building2} trend="neutral" />
          <KpiCard title="Mediadores Ativos" value={brokersCount ?? 0} icon={UserCog} trend="neutral" />
          <KpiCard title="Processos Ativos" value={activeProcessesCount ?? 0} icon={FileText} trend="neutral" />
          <KpiCard title="Total Propostas" value={propostasCount ?? 0} icon={Send} trend="positive" />
        </div>
      </div>

      {/* KPI Row 2 */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Este Mês</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard title="Processos Fechados" value={closedThisMonthCount ?? 0} icon={TrendingUp} trend="positive" />
          <KpiCard title="Novos Mediadores" value={newBrokersThisMonthCount ?? 0} icon={Users} trend="neutral" />
          <KpiCard title="Docs Pendentes" value={pendingDocsCount ?? 0} icon={Clock} trend={pendingDocsCount && pendingDocsCount > 0 ? 'warning' : 'neutral'} />
          <KpiCard title="Uploads (7 dias)" value={recentUploadsCount ?? 0} icon={FileText} trend="neutral" />
        </div>
      </div>

      {/* Bottom grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Offices */}
        <div className="rounded-lg border bg-white">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <h3 className="text-sm font-semibold">Escritórios Recentes</h3>
            <Link href="/admin/offices" className="text-xs text-blue-600 hover:underline">Ver todos</Link>
          </div>
          <div className="divide-y">
            {recentOffices.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhum escritório</p>
            ) : (
              recentOffices.map((o) => (
                <div key={o.id} className="flex items-center justify-between px-4 py-2.5">
                  <div>
                    <Link href={`/admin/offices/${o.id}`} className="text-sm font-medium hover:underline">
                      {o.name}
                    </Link>
                    <p className="text-xs text-muted-foreground font-mono">{o.slug}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={o.is_active ? 'default' : 'secondary'} className="text-xs">
                      {o.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{formatDate(o.created_at)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-lg border bg-white">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <h3 className="text-sm font-semibold">Actividade Recente</h3>
            <span className="text-xs text-muted-foreground">Últimos processos</span>
          </div>
          <div className="divide-y">
            {recentClients.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhuma actividade</p>
            ) : (
              recentClients.map((c) => (
                <div key={c.id} className="flex items-center justify-between px-4 py-2.5">
                  <div>
                    <p className="text-sm font-medium">
                      {c.p1_name}{c.p2_name ? ` & ${c.p2_name}` : ''}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {STEP_LABELS[c.process_step] ?? c.process_step}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{formatDate(c.updated_at)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
