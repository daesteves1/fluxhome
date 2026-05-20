/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

interface RouteParams { params: Promise<{ id: string }> }

async function getAdminBroker(userId: string) {
  const serviceClient = createAdminClient();
  const { data } = await (serviceClient as any)
    .from('brokers')
    .select('id, office_id, is_office_admin')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();
  return data as { id: string; office_id: string; is_office_admin: boolean } | null;
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const broker = await getAdminBroker(user.id);
    if (!broker?.is_office_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json() as Record<string, unknown>;
    const { bank_id, bank_name, name, email, role, phone, notes } = body;

    const serviceClient = createAdminClient();
    const { data, error } = await (serviceClient as any)
      .from('bank_contacts')
      .update({ bank_id, bank_name, name, email, role: role || null, phone: phone || null, notes: notes || null, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('office_id', broker.office_id)
      .select('*')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const broker = await getAdminBroker(user.id);
    if (!broker?.is_office_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const serviceClient = createAdminClient();
    const { error } = await (serviceClient as any)
      .from('bank_contacts')
      .delete()
      .eq('id', id)
      .eq('office_id', broker.office_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
