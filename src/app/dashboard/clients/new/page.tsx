import { createClient, createServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { NewClientForm } from '@/components/clients/new-client-form';

export default async function NewClientPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const serviceClient = await createServiceClient();
  const cookieStore = await cookies();
  const activeOfficeCookie = cookieStore.get('homeflux_active_office')?.value;

  const { data: brokerArr } = await serviceClient
    .from('brokers')
    .select('id, office_id')
    .eq('user_id', user.id)
    .eq('is_active', true);

  const allBrokers = (brokerArr ?? []) as { id: string; office_id: string }[];
  const broker = allBrokers.find((b) => b.office_id === activeOfficeCookie) ?? allBrokers[0] ?? null;
  if (!broker) redirect('/dashboard');

  return (
    <NewClientForm brokerId={broker.id} officeId={broker.office_id} />
  );
}
