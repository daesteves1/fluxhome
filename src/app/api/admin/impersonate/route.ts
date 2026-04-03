import { createClient, createServiceClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = await createServiceClient();
  const { data: userData } = await serviceClient
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  const u = userData as { role: string } | null;
  if (!u || u.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { broker_id } = await request.json();
  if (!broker_id) return NextResponse.json({ error: 'broker_id required' }, { status: 400 });

  const { data: brokerRaw } = await serviceClient
    .from('brokers')
    .select('id, is_active')
    .eq('id', broker_id)
    .single();

  const broker = brokerRaw as { id: string; is_active: boolean } | null;
  if (!broker || !broker.is_active) {
    return NextResponse.json({ error: 'Broker not found or inactive' }, { status: 404 });
  }

  const cookieStore = await cookies();
  cookieStore.set('impersonating_broker_id', broker_id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 4, // 4 hours
  });

  return NextResponse.json({ ok: true });
}
