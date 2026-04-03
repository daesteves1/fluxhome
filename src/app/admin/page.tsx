import { createServiceClient } from '@/lib/supabase/server';
import { getTranslations } from 'next-intl/server';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { Building2, Users, FileText, Send, LayoutDashboard, Shield } from 'lucide-react';

export default async function AdminDashboardPage() {
  const serviceClient = await createServiceClient();
  const t = await getTranslations('admin');

  const [
    { count: institutionsCount },
    { count: officesCount },
    { count: brokersCount },
    { count: activeProcessesCount },
    { count: documentsCount },
    { count: propostasCount },
  ] = await Promise.all([
    serviceClient.from('institutions').select('*', { count: 'exact', head: true }),
    serviceClient.from('offices').select('*', { count: 'exact', head: true }).eq('is_active', true),
    serviceClient.from('brokers').select('*', { count: 'exact', head: true }).eq('is_active', true),
    serviceClient.from('clients').select('*', { count: 'exact', head: true }).not('process_step', 'in', '("closed","approved")'),
    serviceClient.from('document_uploads').select('*', { count: 'exact', head: true }),
    serviceClient.from('propostas').select('*', { count: 'exact', head: true }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground flex items-center gap-2">
          <Shield className="h-6 w-6 text-red-600" />
          {t('title')}
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard title={t('totalInstitutions')} value={institutionsCount ?? 0} icon={Building2} trend="neutral" />
        <KpiCard title={t('totalOffices')} value={officesCount ?? 0} icon={LayoutDashboard} trend="neutral" />
        <KpiCard title={t('totalBrokers')} value={brokersCount ?? 0} icon={Users} trend="neutral" />
        <KpiCard title={t('totalActiveProcesses')} value={activeProcessesCount ?? 0} icon={FileText} trend="neutral" />
        <KpiCard title={t('totalDocuments')} value={documentsCount ?? 0} icon={FileText} trend="neutral" />
        <KpiCard title={t('totalPropostas')} value={propostasCount ?? 0} icon={Send} trend="positive" />
      </div>
    </div>
  );
}
