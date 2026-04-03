import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/sidebar';
import { TopBar } from '@/components/layout/topbar';
import { ImpersonationBanner } from '@/components/layout/impersonation-banner';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const serviceClient = await createServiceClient();

  const { data: userProfileRaw } = await serviceClient
    .from('users')
    .select('id, name, email, role')
    .eq('id', user.id)
    .single();

  const userProfile = userProfileRaw as {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;

  if (!userProfile) redirect('/login');

  let officeName: string | undefined;
  let logoUrl: string | undefined;
  let primaryColor: string | undefined;

  if (userProfile.role !== 'super_admin') {
    const { data: brokerRaw } = await serviceClient
      .from('brokers')
      .select('id, office_id, is_office_admin')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    const broker = brokerRaw as { id: string; office_id: string; is_office_admin: boolean } | null;

    if (broker?.office_id) {
      const { data: officeRaw } = await serviceClient
        .from('offices')
        .select('name, white_label')
        .eq('id', broker.office_id)
        .single();

      const office = officeRaw as {
        name: string;
        white_label: { logo_url: string | null; primary_color: string };
      } | null;

      if (office) {
        officeName = office.name;
        logoUrl = office.white_label?.logo_url ?? undefined;
        primaryColor = office.white_label?.primary_color;
      }
    }
  }

  const cookieStore = await cookies();
  const impersonatingId = cookieStore.get('impersonating_broker_id')?.value;
  let impersonatedName: string | null = null;

  if (impersonatingId) {
    const { data: impBrokerRaw } = await serviceClient
      .from('brokers')
      .select('user_id')
      .eq('id', impersonatingId)
      .single();

    if (impBrokerRaw) {
      const impBroker = impBrokerRaw as { user_id: string };
      const { data: impUserRaw } = await serviceClient
        .from('users')
        .select('name')
        .eq('id', impBroker.user_id)
        .single();
      impersonatedName = (impUserRaw as { name: string } | null)?.name ?? null;
    }
  }

  const role = userProfile.role as 'super_admin' | 'office_admin' | 'broker';

  return (
    <div className="flex min-h-screen">
      {primaryColor && primaryColor !== '#1E40AF' && (
        <style>{`:root { --brand-primary: ${primaryColor}; }`}</style>
      )}
      <Sidebar
        role={role}
        userName={userProfile.name}
        userEmail={userProfile.email}
        officeName={officeName}
        logoUrl={logoUrl}
        primaryColor={primaryColor}
      />
      <div className="flex flex-col flex-1 min-w-0">
        {impersonatedName && (
          <ImpersonationBanner impersonatedName={impersonatedName} />
        )}
        <TopBar userName={userProfile.name} />
        <main className="flex-1 overflow-y-auto bg-slate-50">
          <div className="max-w-5xl mx-auto px-6 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
