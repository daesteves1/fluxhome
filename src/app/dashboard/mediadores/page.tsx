import { createClient, createServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { MediadorList } from '@/components/mediadores/mediador-list';

export default async function MediadorPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const serviceClient = await createServiceClient();

  const { data: brokerRaw } = await serviceClient
    .from('brokers')
    .select('id, office_id, is_office_admin')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single();

  const currentBroker = brokerRaw as {
    id: string;
    office_id: string;
    is_office_admin: boolean;
  } | null;

  if (!currentBroker || !currentBroker.is_office_admin) {
    redirect('/dashboard');
  }

  const { data: brokersRaw } = await serviceClient
    .from('brokers')
    .select('id, is_office_admin, is_active, invited_at, activated_at, users(id, name, email)')
    .eq('office_id', currentBroker.office_id)
    .order('invited_at', { ascending: false });

  const brokers = (brokersRaw ?? []) as {
    id: string;
    is_office_admin: boolean;
    is_active: boolean;
    invited_at: string | null;
    activated_at: string | null;
    users: { id: string; name: string; email: string } | null;
  }[];

  const { data: invitationsRaw } = await serviceClient
    .from('invitations')
    .select('id, email, role, status, sent_at, expires_at')
    .eq('office_id', currentBroker.office_id)
    .eq('role', 'broker')
    .eq('status', 'pending')
    .order('sent_at', { ascending: false });

  const pendingInvitations = (invitationsRaw ?? []) as {
    id: string;
    email: string;
    role: string;
    status: string;
    sent_at: string;
    expires_at: string;
  }[];

  return (
    <MediadorList
      brokers={brokers}
      pendingInvitations={pendingInvitations}
      currentBrokerId={currentBroker.id}
      officeId={currentBroker.office_id}
    />
  );
}
