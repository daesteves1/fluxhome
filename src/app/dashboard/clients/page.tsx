import { createClient, createServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { ClientsTable } from '@/components/dashboard/clients-table';
import Link from 'next/link';

export default async function ClientsPage() {
  const supabase = await createClient();
  const serviceClient = await createServiceClient();
  const t = await getTranslations();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: userProfileRaw } = await serviceClient
    .from('users')
    .select('id, role, name')
    .eq('id', user.id)
    .single();

  const userProfile = userProfileRaw as { id: string; role: string; name: string } | null;

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

  type ClientRow = {
    id: string;
    p1_name: string;
    p2_name: string | null;
    process_step: string;
    updated_at: string;
    broker_id: string;
    brokers: { id: string; users: { name: string } | null } | null;
  };

  let clients: ClientRow[] = [];

  if (userProfile?.role === 'broker' && broker) {
    const { data } = await serviceClient
      .from('clients')
      .select('id, p1_name, p2_name, process_step, updated_at, broker_id')
      .eq('broker_id', broker.id)
      .order('updated_at', { ascending: false });
    clients = (data ?? []).map((c) => ({
      ...(c as Omit<ClientRow, 'brokers'>),
      brokers: null,
    }));
  } else if (broker?.office_id) {
    const { data } = await serviceClient
      .from('clients')
      .select('id, p1_name, p2_name, process_step, updated_at, broker_id, brokers(id, users(name))')
      .eq('office_id', broker.office_id)
      .order('updated_at', { ascending: false });
    clients = (data ?? []) as unknown as ClientRow[];
  }

  const showBrokerColumn = userProfile?.role !== 'broker';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{t('clients.title')}</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {clients.length} {clients.length === 1 ? 'cliente' : 'clientes'}
          </p>
        </div>
        <Link
          href="/dashboard/clients/new"
          className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium px-3 py-1.5 rounded-lg transition-colors"
        >
          + {t('dashboard.addClient')}
        </Link>
      </div>

      <ClientsTable clients={clients} showBrokerColumn={showBrokerColumn} />
    </div>
  );
}
