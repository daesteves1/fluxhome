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

  let brokerQ = serviceClient
    .from('brokers')
    .select('id, office_id')
    .eq('user_id', user.id)
    .eq('is_active', true);
  if (activeOfficeCookie) brokerQ = brokerQ.eq('office_id', activeOfficeCookie);
  const { data: brokerArr } = await brokerQ.limit(1);

  const broker = ((brokerArr ?? [])[0] ?? null) as { id: string; office_id: string } | null;
  if (!broker) redirect('/dashboard');

  return (
    <NewClientForm brokerId={broker.id} officeId={broker.office_id} />
  );
}
