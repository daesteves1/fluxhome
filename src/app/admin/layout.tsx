import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/sidebar';
import { TopBar } from '@/components/layout/topbar';
import { ImpersonationBanner } from '@/components/layout/impersonation-banner';

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
    <div className="flex min-h-screen">
      <Sidebar
        role="super_admin"
        userName={userProfile.name}
        userEmail={userProfile.email}
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
