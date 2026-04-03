import { createServiceClient } from '@/lib/supabase/server';
import { ImpersonateBrokerList } from '@/components/admin/impersonate-broker-list';

export default async function AdminImpersonatePage() {
  const serviceClient = await createServiceClient();

  const { data: brokersRaw } = await serviceClient
    .from('brokers')
    .select('id, user_id, office_id, is_active')
    .eq('is_active', true)
    .order('id');

  const userIds = (brokersRaw ?? []).map((b) => (b as { user_id: string }).user_id);
  const officeIds = Array.from(new Set((brokersRaw ?? []).map((b) => (b as { office_id: string }).office_id)));

  const userMap: Record<string, { name: string; email: string }> = {};
  if (userIds.length > 0) {
    const { data: usersRaw } = await serviceClient
      .from('users')
      .select('id, name, email')
      .in('id', userIds);
    for (const u of usersRaw ?? []) {
      const user = u as { id: string; name: string; email: string };
      userMap[user.id] = { name: user.name, email: user.email };
    }
  }

  const officeMap: Record<string, string> = {};
  if (officeIds.length > 0) {
    const { data: officesRaw } = await serviceClient
      .from('offices')
      .select('id, name')
      .in('id', officeIds);
    for (const o of officesRaw ?? []) {
      const office = o as { id: string; name: string };
      officeMap[office.id] = office.name;
    }
  }

  type BrokerItem = { id: string; userName: string; userEmail: string; officeName: string };

  const brokers: BrokerItem[] = (brokersRaw ?? []).map((b) => {
    const broker = b as { id: string; user_id: string; office_id: string; is_active: boolean };
    return {
      id: broker.id,
      userName: userMap[broker.user_id]?.name ?? '—',
      userEmail: userMap[broker.user_id]?.email ?? '—',
      officeName: officeMap[broker.office_id] ?? '—',
    };
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Impersonar Mediador</h1>
      <p className="text-muted-foreground text-sm">
        Selecione um mediador para aceder ao dashboard como esse utilizador.
      </p>
      <ImpersonateBrokerList brokers={brokers} />
    </div>
  );
}
