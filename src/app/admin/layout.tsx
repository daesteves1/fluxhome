import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { MobileLayoutShell } from '@/components/layout/mobile-layout-shell';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const serviceClient = await createServiceClient();

  const { data: userProfileRaw } = await serviceClient
    .from('users')
    .select('id, name, email, role')
    .eq('id', user.id)
    .single();

  const userProfile = userProfileRaw as { id: string; name: string; email: string; role: string } | null;

  if (!userProfile || userProfile.role !== 'super_admin') {
    redirect('/dashboard');
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

  return (
    <MobileLayoutShell
      role="super_admin"
      userName={userProfile.name}
      userEmail={userProfile.email}
      impersonatedName={impersonatedName}
    >
      {children}
    </MobileLayoutShell>
  );
}
