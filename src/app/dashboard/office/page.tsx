import { createClient, createServiceClient, createAdminClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { OfficeSettingsForm } from '@/components/settings/office-settings-form';

export default async function OfficeSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const serviceClient = await createServiceClient();
  const cookieStore = await cookies();
  const activeOfficeCookie = cookieStore.get('homeflux_active_office')?.value;

  const { data: brokerArr } = await serviceClient
    .from('brokers')
    .select('id, office_id, is_office_admin')
    .eq('user_id', user.id)
    .eq('is_active', true);

  const allBrokers = (brokerArr ?? []) as { id: string; office_id: string; is_office_admin: boolean }[];
  const broker = allBrokers.find((b) => b.office_id === activeOfficeCookie) ?? allBrokers[0] ?? null;
  if (!broker) redirect('/dashboard');

  const adminClient = createAdminClient();
  const { data: officeRaw } = await adminClient
    .from('offices')
    .select('id, name, slug, white_label, settings, document_template')
    .eq('id', broker.office_id)
    .single();

  const office = officeRaw as {
    id: string;
    name: string;
    slug: string;
    white_label: Record<string, unknown>;
    settings: Record<string, unknown>;
    document_template: import('@/lib/document-defaults').OfficeDocTemplate[] | null;
  } | null;

  if (!office) redirect('/dashboard');

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Escritório</h1>
      <OfficeSettingsForm office={office} isAdmin={broker.is_office_admin} />
    </div>
  );
}
