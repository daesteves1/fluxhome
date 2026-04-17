import { createClient, createServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { NewClientStepper } from '@/components/clients/new-client-stepper';

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

  // Load office branding for the stepper sidebar
  const { data: officeRaw } = await serviceClient
    .from('offices')
    .select('name, white_label')
    .eq('id', broker.office_id)
    .single();

  const office = officeRaw as {
    name: string;
    white_label: { logo_url: string | null; primary_color: string } | null;
  } | null;

  return (
    <NewClientStepper
      brokerId={broker.id}
      officeId={broker.office_id}
      logoUrl={office?.white_label?.logo_url ?? undefined}
      officeName={office?.name}
    />
  );
}
