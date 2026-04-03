import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { PasswordForm } from '@/components/settings/password-form';

export default async function PasswordPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-bold text-slate-900 mb-6">Alterar Palavra-passe</h1>
      <PasswordForm />
    </div>
  );
}
