/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

async function getAdminBroker(userId: string) {
  const serviceClient = createAdminClient();
  const { data } = await (serviceClient as any)
    .from('brokers')
    .select('id, office_id, is_office_admin')
    .eq('user_id', userId)
    .eq('is_active', true)
    .limit(1);
  return (((data ?? [])[0] ?? null)) as { id: string; office_id: string; is_office_admin: boolean } | null;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const broker = await getAdminBroker(user.id);
    if (!broker) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const serviceClient = createAdminClient();
    const { data, error } = await (serviceClient as any)
      .from('bank_contacts')
      .select('*')
      .eq('office_id', broker.office_id)
      .order('bank_name', { ascending: true })
      .order('name', { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const broker = await getAdminBroker(user.id);
    if (!broker?.is_office_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json() as Record<string, unknown>;
    const { bank_id, bank_name, name, email, role, phone, notes } = body;

    if (!bank_id || !bank_name || !name || !email) {
      return NextResponse.json({ error: 'Campos obrigatórios em falta' }, { status: 400 });
    }

    const serviceClient = createAdminClient();
    const { data, error } = await (serviceClient as any)
      .from('bank_contacts')
      .insert({ office_id: broker.office_id, bank_id, bank_name, name, email, role: role || null, phone: phone || null, notes: notes || null })
      .select('*')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
