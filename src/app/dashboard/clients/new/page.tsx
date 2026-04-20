import { createClient, createServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { NewClientForm } from '@/components/clients/new-client-form';

export default async function NewClientPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const serviceClient = await createServiceClient();
  const { data: brokerRaw } = await serviceClient
    .from('brokers')
    .select('id, office_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single();

  const broker = brokerRaw as { id: string; office_id: string } | null;
  if (!broker) redirect('/dashboard');

  return (
    <NewClientForm brokerId={broker.id} officeId={broker.office_id} />
  );
}
