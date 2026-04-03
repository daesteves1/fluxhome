import { createServiceClient } from '@/lib/supabase/server';
import { AdminBrokersTable } from '@/components/admin/admin-brokers-table';

export default async function AdminBrokersPage() {
  const serviceClient = await createServiceClient();

  const { data: brokersRaw } = await serviceClient
    .from('brokers')
    .select('id, user_id, office_id, is_active, is_office_admin, activated_at, invited_at')
    .order('activated_at', { ascending: false });

  const userIds = Array.from(new Set(
    (brokersRaw ?? []).map((b) => (b as { user_id: string }).user_id)
  ));
  const officeIds = Array.from(new Set(
    (brokersRaw ?? []).map((b) => (b as { office_id: string }).office_id)
  ));

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

  type Broker = {
    id: string;
    user_id: string;
    office_id: string;
    is_active: boolean;
    is_office_admin: boolean;
    activated_at: string | null;
    invited_at: string | null;
    userName: string;
    userEmail: string;
    officeName: string;
  };

  const brokers: Broker[] = (brokersRaw ?? []).map((b) => {
    const broker = b as { id: string; user_id: string; office_id: string; is_active: boolean; is_office_admin: boolean; activated_at: string | null; invited_at: string | null };
    return {
      ...broker,
      userName: userMap[broker.user_id]?.name ?? '—',
      userEmail: userMap[broker.user_id]?.email ?? '—',
      officeName: officeMap[broker.office_id] ?? '—',
    };
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Mediadores</h1>
      <AdminBrokersTable brokers={brokers} />
    </div>
  );
}
