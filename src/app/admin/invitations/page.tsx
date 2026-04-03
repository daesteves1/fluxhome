import { createServiceClient } from '@/lib/supabase/server';
import { AdminInvitationsTable } from '@/components/admin/admin-invitations-table';

export default async function AdminInvitationsPage() {
  const serviceClient = await createServiceClient();

  const { data: invitationsRaw } = await serviceClient
    .from('invitations')
    .select('id, email, role, status, sent_at, expires_at, accepted_at, office_id')
    .order('sent_at', { ascending: false });

  const officeIds = Array.from(new Set(
    (invitationsRaw ?? [])
      .map((i) => (i as { office_id: string | null }).office_id)
      .filter(Boolean) as string[]
  ));

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

  const { data: officesAllRaw } = await serviceClient
    .from('offices')
    .select('id, name')
    .eq('is_active', true)
    .order('name');

  type Invitation = {
    id: string;
    email: string;
    role: string;
    status: string;
    sent_at: string;
    expires_at: string | null;
    accepted_at: string | null;
    office_id: string | null;
  };
  type OfficeOption = { id: string; name: string };

  const invitations = (invitationsRaw ?? []).map((inv) => {
    const i = inv as Invitation;
    return { ...i, officeName: i.office_id ? officeMap[i.office_id] ?? null : null };
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Convites</h1>
      <AdminInvitationsTable
        invitations={invitations}
        officeOptions={(officesAllRaw ?? []) as OfficeOption[]}
      />
    </div>
  );
}
