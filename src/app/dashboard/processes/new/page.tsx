import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { NewProcessFormWrapper } from '@/components/processes/new-process-form-wrapper';

export default async function NewProcessPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <Suspense fallback={<div className="max-w-2xl mx-auto py-8 text-sm text-slate-400">A carregar...</div>}>
      <NewProcessFormWrapper />
    </Suspense>
  );
}
