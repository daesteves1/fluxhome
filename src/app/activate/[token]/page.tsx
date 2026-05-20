import { notFound } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import ActivateForm from './activate-form';

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function ActivatePage({ params }: PageProps) {
  const { token } = await params;
  const supabase = await createServiceClient();

  const { data: invitationRaw, error } = await supabase
    .from('invitations')
    .select('*')
    .eq('token', token)
    .eq('status', 'pending')
    .single();

  if (error || !invitationRaw) {
    notFound();
  }

  const invitation = invitationRaw as {
    id: string;
    email: string;
    role: string;
    office_id: string | null;
    expires_at: string | null;
    status: string;
    sent_at: string;
  };

  let officeName: string | null = null;
  if (invitation.office_id) {
    const { data: office } = await supabase
      .from('offices')
      .select('name')
      .eq('id', invitation.office_id)
      .single();
    officeName = (office as { name: string } | null)?.name ?? null;
  }

  const isExpired =
    invitation.expires_at && new Date(invitation.expires_at) < new Date();

  // Detect if this email already has an active account
  let isExistingUser = false;
  try {
    const { data: { users } } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const found = users.find((u) => u.email === invitation.email);
    if (found) {
      const { data: brokers } = await supabase
        .from('brokers')
        .select('id')
        .eq('user_id', found.id)
        .eq('is_active', true)
        .limit(1);
      isExistingUser = (brokers?.length ?? 0) > 0;
    }
  } catch {
    // If lookup fails, fall back to the normal signup form
  }

  return (
    <ActivateForm
      token={token}
      email={invitation.email}
      role={invitation.role}
      officeName={officeName}
      isExpired={!!isExpired}
      isExistingUser={isExistingUser}
    />
  );
}
