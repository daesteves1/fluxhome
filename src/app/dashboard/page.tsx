import { createClient, createServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { ClientsTable } from '@/components/dashboard/clients-table';
import { Users, FileText, Send, CheckCircle } from 'lucide-react';
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

function greeting() {
  const h = new Date().getHours();
  if (h >= 6 && h < 12) return 'Bom dia';
  if (h >= 12 && h < 19) return 'Boa tarde';
  return 'Boa noite';
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const serviceClient = await createServiceClient();
  const t = await getTranslations('dashboard');

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: userProfileRaw } = await serviceClient
    .from('users')
    .select('id, role, name')
    .eq('id', user.id)
    .single();

  const userProfile = userProfileRaw as { id: string; role: string; name: string } | null;

  const cookieStore = await cookies();
  const impersonatingId = cookieStore.get('impersonating_broker_id')?.value;
  const viewCookie = cookieStore.get('homeflux_view')?.value as 'broker' | 'office' | undefined;

  // When impersonating, load that broker's data instead
  type BrokerData = { id: string; office_id: string; is_office_admin: boolean };
  let broker: BrokerData | null = null;

  if (impersonatingId) {
    const { data: impBrokerRaw } = await serviceClient
      .from('brokers')
      .select('id, office_id, is_office_admin')
      .eq('id', impersonatingId)
      .eq('is_active', true)
      .single();
    broker = impBrokerRaw as BrokerData | null;
  } else {
    const { data: brokerRaw } = await serviceClient
      .from('brokers')
      .select('id, office_id, is_office_admin')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();
    broker = brokerRaw as BrokerData | null;
  }

  if (!broker && userProfile?.role !== 'super_admin') {
    redirect('/login');
  }

  // Office admins respect the view preference; regular brokers always see own clients
  // When impersonating, always show that broker's own clients
  const showOwnOnly =
    Boolean(impersonatingId) ||
    userProfile?.role === 'broker' ||
    (broker?.is_office_admin && viewCookie === 'broker');

  let clientsRaw: ClientRow[] = [];

  if (showOwnOnly && broker) {
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

  const firstName = userProfile?.name?.split(' ')[0] ?? '';

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

  const todayPT = now.toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">
          {greeting()}{firstName ? `, ${firstName}` : ''}.
        </h1>
        <p className="text-sm text-slate-500 capitalize hidden sm:block">{todayPT}</p>
      </div>

      {/* KPI cards */}
      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-2">{t('pipeline')}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
      </div>

      {/* Clients table */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-slate-700">{t('clients')}</h2>
          <Link
            href="/dashboard/clients/new"
            className="inline-flex items-center h-9 px-4 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            + {t('addClient')}
          </Link>
        </div>
        <ClientsTable
          clients={clientsRaw}
          showBrokerColumn={!showOwnOnly}
        />
      </div>
    </div>
  );
}
