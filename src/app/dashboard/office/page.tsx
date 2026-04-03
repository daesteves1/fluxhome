import { createClient, createServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { OfficeSettingsForm } from '@/components/settings/office-settings-form';

export default async function OfficeSettingsPage() {
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

  const broker = brokerRaw as { id: string; office_id: string; is_office_admin: boolean } | null;
  if (!broker) redirect('/dashboard');

  const { data: officeRaw } = await serviceClient
    .from('offices')
    .select('id, name, slug, white_label, settings')
    .eq('id', broker.office_id)
    .single();

  const office = officeRaw as {
    id: string;
    name: string;
    slug: string;
    white_label: Record<string, unknown>;
    settings: Record<string, unknown>;
  } | null;

  if (!office) redirect('/dashboard');

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Escritório</h1>
      <OfficeSettingsForm office={office} isAdmin={broker.is_office_admin} />
    </div>
  );
}
