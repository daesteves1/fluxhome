import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { MobileLayoutShell } from '@/components/layout/mobile-layout-shell';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [serviceClient, cookieStore] = await Promise.all([
    createServiceClient(),
    cookies(),
  ]);

  const impersonatingId = cookieStore.get('impersonating_broker_id')?.value;

  // Fetch user profile first so we can redirect super admins before any further queries
  const { data: userProfileRaw } = await serviceClient
    .from('users').select('id, name, email, role').eq('id', user.id).single();

  const userProfile = userProfileRaw as {
    id: string; name: string; email: string; role: string;
  } | null;

  if (!userProfile) redirect('/login');
  if (userProfile.role === 'super_admin' && !impersonatingId) redirect('/admin');

  const { data: allBrokersRaw } = await serviceClient
    .from('brokers').select('id, office_id, is_office_admin').eq('user_id', user.id).eq('is_active', true);

  const viewCookie = cookieStore.get('homeflux_view')?.value as 'broker' | 'office' | undefined;
  const activeOfficeCookie = cookieStore.get('homeflux_active_office')?.value;

  let displayRole = userProfile.role as 'super_admin' | 'office_admin' | 'broker';
  let displayName = userProfile.name;
  let displayEmail = userProfile.email;
  let officeName: string | undefined;
  let logoUrl: string | undefined;
  let primaryColor: string | undefined;
  let isOfficeAdmin = false;
  let impersonatedName: string | null = null;
  const currentView: 'broker' | 'office' = viewCookie ?? 'office';

  // All offices this user belongs to (for the office switcher)
  let userOffices: { id: string; name: string; logoUrl?: string }[] = [];
  let activeOfficeId: string | undefined;

  if (impersonatingId) {
    const { data: impBrokerRaw } = await serviceClient
      .from('brokers')
      .select('id, user_id, office_id, is_office_admin')
      .eq('id', impersonatingId)
      .single();

    const impBroker = impBrokerRaw as {
      id: string;
      user_id: string;
      office_id: string;
      is_office_admin: boolean;
    } | null;

    if (impBroker) {
      const [{ data: impUserRaw }, { data: impOfficeRaw }] = await Promise.all([
        serviceClient.from('users').select('name, email').eq('id', impBroker.user_id).single(),
        serviceClient.from('offices').select('name, white_label').eq('id', impBroker.office_id).single(),
      ]);

      const impUser = impUserRaw as { name: string; email: string } | null;
      const impOffice = impOfficeRaw as {
        name: string;
        white_label: { logo_url: string | null; primary_color: string } | null;
      } | null;

      displayRole = impBroker.is_office_admin ? 'office_admin' : 'broker';
      displayName = impUser?.name ?? '—';
      displayEmail = impUser?.email ?? '—';
      isOfficeAdmin = impBroker.is_office_admin;
      officeName = impOffice?.name;
      logoUrl = impOffice?.white_label?.logo_url ?? undefined;
      primaryColor = impOffice?.white_label?.primary_color;
      impersonatedName = impUser?.name ?? null;
      activeOfficeId = impBroker.office_id;
      userOffices = officeName
        ? [{ id: impBroker.office_id, name: officeName, logoUrl }]
        : [];
    }
  } else if (userProfile.role !== 'super_admin') {
    const allBrokers = (allBrokersRaw ?? []) as {
      id: string;
      office_id: string;
      is_office_admin: boolean;
    }[];

    if (allBrokers.length > 0) {
      // Determine active office: prefer cookie if it matches one of the user's offices
      const cookieMatch = allBrokers.find((b) => b.office_id === activeOfficeCookie);
      const activeBroker = cookieMatch ?? allBrokers[0];
      activeOfficeId = activeBroker.office_id;
      isOfficeAdmin = activeBroker.is_office_admin;
      displayRole = isOfficeAdmin ? 'office_admin' : 'broker';

      // Fetch all offices in parallel
      const officeIds = allBrokers.map((b) => b.office_id);
      const { data: officesRaw } = await serviceClient
        .from('offices')
        .select('id, name, white_label')
        .in('id', officeIds);

      const officesData = (officesRaw ?? []) as {
        id: string;
        name: string;
        white_label: { logo_url: string | null; primary_color: string } | null;
      }[];

      userOffices = allBrokers.map((b) => {
        const o = officesData.find((x) => x.id === b.office_id);
        return {
          id: b.office_id,
          name: o?.name ?? '—',
          logoUrl: o?.white_label?.logo_url ?? undefined,
        };
      });

      const activeOfficeData = officesData.find((o) => o.id === activeOfficeId);
      if (activeOfficeData) {
        officeName = activeOfficeData.name;
        logoUrl = activeOfficeData.white_label?.logo_url ?? undefined;
        primaryColor = activeOfficeData.white_label?.primary_color;
      }
    }
  }

  return (
    <>
      {primaryColor && primaryColor !== '#1E40AF' && (
        <style>{`:root { --brand-primary: ${primaryColor}; }`}</style>
      )}
      <MobileLayoutShell
        role={displayRole}
        userName={displayName}
        userEmail={displayEmail}
        officeName={officeName}
        logoUrl={logoUrl}
        primaryColor={primaryColor}
        isOfficeAdmin={isOfficeAdmin}
        currentView={currentView}
        impersonatedName={impersonatedName}
        userOffices={userOffices}
        activeOfficeId={activeOfficeId}
      >
        {children}
      </MobileLayoutShell>
    </>
  );
}
