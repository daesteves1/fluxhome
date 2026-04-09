import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { MobileLayoutShell } from '@/components/layout/mobile-layout-shell';

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

  const cookieStore = await cookies();
  const impersonatingId = cookieStore.get('impersonating_broker_id')?.value;
  const viewCookie = cookieStore.get('homeflux_view')?.value as 'broker' | 'office' | undefined;

  // ── Sidebar/TopBar display data (may be overridden by impersonation) ──────
  let displayRole = userProfile.role as 'super_admin' | 'office_admin' | 'broker';
  let displayName = userProfile.name;
  let displayEmail = userProfile.email;
  let officeName: string | undefined;
  let logoUrl: string | undefined;
  let primaryColor: string | undefined;
  let isOfficeAdmin = false;
  let impersonatedName: string | null = null;
  const currentView: 'broker' | 'office' = viewCookie ?? 'office';

  if (impersonatingId) {
    // ── Impersonation mode: load target broker's full context ─────────────
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

      // Override display context with impersonated broker's data
      displayRole = impBroker.is_office_admin ? 'office_admin' : 'broker';
      displayName = impUser?.name ?? '—';
      displayEmail = impUser?.email ?? '—';
      isOfficeAdmin = impBroker.is_office_admin;
      officeName = impOffice?.name;
      logoUrl = impOffice?.white_label?.logo_url ?? undefined;
      primaryColor = impOffice?.white_label?.primary_color;
      impersonatedName = impUser?.name ?? null;
    }
  } else if (userProfile.role !== 'super_admin') {
    // ── Normal broker/office-admin mode ───────────────────────────────────
    const { data: brokerRaw } = await serviceClient
      .from('brokers')
      .select('id, office_id, is_office_admin')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    const broker = brokerRaw as { id: string; office_id: string; is_office_admin: boolean } | null;
    isOfficeAdmin = broker?.is_office_admin ?? false;

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
      >
        {children}
      </MobileLayoutShell>
    </>
  );
}
