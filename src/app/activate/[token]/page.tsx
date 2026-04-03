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

  return (
    <ActivateForm
      token={token}
      email={invitation.email}
      role={invitation.role}
      officeName={officeName}
      isExpired={!!isExpired}
    />
  );
}
