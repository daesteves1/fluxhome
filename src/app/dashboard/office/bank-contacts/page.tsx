import { createClient, createServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { BankContactsManager } from '@/components/office/bank-contacts-manager';

export default async function BankContactsPage() {
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
  if (!broker || !broker.is_office_admin) redirect('/dashboard');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: contactsRaw } = await (serviceClient as any)
    .from('bank_contacts')
    .select('*')
    .eq('office_id', broker.office_id)
    .order('bank_name', { ascending: true })
    .order('name', { ascending: true });

  const contacts = (contactsRaw ?? []) as {
    id: string;
    bank_id: string;
    bank_name: string;
    name: string;
    email: string;
    role: string | null;
    phone: string | null;
    notes: string | null;
    created_at: string;
  }[];

  return (
    <div className="max-w-4xl space-y-6">
      <BankContactsManager initialContacts={contacts} />
    </div>
  );
}
