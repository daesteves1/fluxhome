import { createClient, createServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ProfileForm } from '@/components/settings/profile-form';

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const serviceClient = await createServiceClient();
  const { data: userRaw } = await serviceClient
    .from('users')
    .select('id, name, email, phone, avatar_url')
    .eq('id', user.id)
    .single();

  const userData = userRaw as {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    avatar_url: string | null;
  } | null;

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-bold text-slate-900 mb-6">Perfil</h1>
      {userData && <ProfileForm user={userData} />}
    </div>
  );
}
