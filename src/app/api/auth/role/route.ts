import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ role: null });

  const serviceClient = await createServiceClient();
  const { data } = await serviceClient
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  return NextResponse.json({ role: (data as { role: string } | null)?.role ?? null });
}
