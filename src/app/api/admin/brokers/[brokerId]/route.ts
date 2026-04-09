import { createClient, createServiceClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

async function requireSuperAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const serviceClient = await createServiceClient();
  const { data } = await serviceClient
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  const u = data as { role: string } | null;
  if (!u || u.role !== 'super_admin') return null;
  return serviceClient;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ brokerId: string }> }
) {
  const { brokerId } = await params;
  const serviceClient = await requireSuperAdmin();
  if (!serviceClient) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const allowed = ['is_active', 'is_office_admin', 'settings'];
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }

  const { error } = await serviceClient
    .from('brokers')
    .update(update)
    .eq('id', brokerId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
