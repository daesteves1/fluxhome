import { createClient, createServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { NewClientForm } from '@/components/clients/client-form';

export default async function NewClientPage() {
  const supabase = await createClient();
  const serviceClient = await createServiceClient();
  const t = await getTranslations('clients');

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: brokerRaw } = await serviceClient
    .from('brokers')
    .select('id, office_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single();

  const broker = brokerRaw as { id: string; office_id: string } | null;
  if (!broker) redirect('/dashboard');

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h2 className="text-2xl font-semibold text-foreground">{t('newClient')}</h2>
      <NewClientForm brokerId={broker.id} officeId={broker.office_id} />
    </div>
  );
}
