import { createClient, createServiceClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

async function requireOfficeAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const serviceClient = await createServiceClient();
  const { data } = await serviceClient
    .from('brokers')
    .select('id, office_id, is_office_admin')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single();

  const broker = data as { id: string; office_id: string; is_office_admin: boolean } | null;
  if (!broker || !broker.is_office_admin) return null;
  return { serviceClient, broker };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ brokerId: string }> }
) {
  const { brokerId } = await params;
  const auth = await requireOfficeAdmin();
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { serviceClient, broker: adminBroker } = auth;

  // Verify target broker belongs to same office
  const { data: targetRaw } = await serviceClient
    .from('brokers')
    .select('id, office_id')
    .eq('id', brokerId)
    .single();

  const target = targetRaw as { id: string; office_id: string } | null;
  if (!target || target.office_id !== adminBroker.office_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Prevent admin from modifying themselves
  if (brokerId === adminBroker.id) {
    return NextResponse.json({ error: 'Cannot modify your own account' }, { status: 400 });
  }

  const body = await request.json();
  const allowed = ['is_active'];
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
