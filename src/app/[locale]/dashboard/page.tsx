import { createClient, createServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { ClientsTable } from '@/components/dashboard/clients-table';
import { Users, FileText, Send, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

type ClientRow = {
  id: string;
  p1_name: string;
  p2_name: string | null;
  process_step: string;
  updated_at: string;
  broker_id: string;
  brokers: { id: string; users: { name: string } | null } | null;
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const serviceClient = await createServiceClient();
  const t = await getTranslations('dashboard');

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: userProfileRaw } = await serviceClient
    .from('users')
    .select('id, role')
    .eq('id', user.id)
    .single();

  const userProfile = userProfileRaw as { id: string; role: string } | null;

  const { data: brokerRaw } = await serviceClient
    .from('brokers')
    .select('id, office_id, is_office_admin')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single();

  const broker = brokerRaw as { id: string; office_id: string; is_office_admin: boolean } | null;

  if (!broker && userProfile?.role !== 'super_admin') {
    redirect('/login');
  }

  // Build query based on role — use raw query then cast
  let clientsRaw: ClientRow[] = [];

  if (userProfile?.role === 'broker' && broker) {
    const { data } = await serviceClient
      .from('clients')
      .select('id, p1_name, p2_name, process_step, updated_at, broker_id')
      .eq('broker_id', broker.id)
      .order('updated_at', { ascending: false });
    clientsRaw = (data ?? []).map((c) => ({
      ...(c as { id: string; p1_name: string; p2_name: string | null; process_step: string; updated_at: string; broker_id: string }),
      brokers: null,
    }));
  } else if (broker?.office_id) {
    const { data } = await serviceClient
      .from('clients')
      .select('id, p1_name, p2_name, process_step, updated_at, broker_id')
      .eq('office_id', broker.office_id)
      .order('updated_at', { ascending: false });
    clientsRaw = (data ?? []).map((c) => ({
      ...(c as { id: string; p1_name: string; p2_name: string | null; process_step: string; updated_at: string; broker_id: string }),
      brokers: null,
    }));
  }

  // KPI calculations
  const activeProcesses = clientsRaw.filter(
    (c) => !['closed', 'approved'].includes(c.process_step)
  ).length;

  const docsPending = clientsRaw.filter(
    (c) => c.process_step === 'docs_pending'
  ).length;

  const propostasSent = clientsRaw.filter(
    (c) => c.process_step === 'propostas_sent'
  ).length;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const closedThisMonth = clientsRaw.filter(
    (c) => c.process_step === 'closed' && c.updated_at >= startOfMonth
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">{t('title')}</h2>
        </div>
        <Button asChild>
          <Link href="/dashboard/clients/new">{t('addClient')}</Link>
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title={t('activeProcesses')}
          value={activeProcesses}
          icon={Users}
          trend="neutral"
        />
        <KpiCard
          title={t('docsPendingReview')}
          value={docsPending}
          icon={FileText}
          trend={docsPending > 0 ? 'warning' : 'neutral'}
        />
        <KpiCard
          title={t('propostasSent')}
          value={propostasSent}
          icon={Send}
          trend="neutral"
        />
        <KpiCard
          title={t('closedThisMonth')}
          value={closedThisMonth}
          icon={CheckCircle}
          trend="positive"
        />
      </div>

      {/* Clients table */}
      <ClientsTable
        clients={clientsRaw}
        showBrokerColumn={userProfile?.role !== 'broker'}
      />
    </div>
  );
}
