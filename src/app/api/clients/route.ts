import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { isValidNIF } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const serviceClient = await createServiceClient();
    const { data: brokerRaw } = await serviceClient
      .from('brokers').select('id, office_id').eq('user_id', user.id).eq('is_active', true).single();
    const broker = brokerRaw as { id: string; office_id: string } | null;
    if (!broker) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const url = new URL(request.url);
    const search = url.searchParams.get('search')?.trim() ?? '';
    const limit = Math.min(Number(url.searchParams.get('limit') ?? '20'), 50);

    let query = serviceClient
      .from('clients')
      .select('id, p1_name, p1_email, p2_name')
      .eq('office_id', broker.office_id)
      .order('p1_name', { ascending: true })
      .limit(limit);

    if (search.length >= 2) {
      query = query.or(`p1_name.ilike.%${search}%,p1_email.ilike.%${search}%,p1_nif.ilike.%${search}%,p2_name.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error('List clients error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const serviceClient = await createServiceClient();
    const body = await request.json();

    const {
      broker_id, office_id, p1_name, p1_nif, p1_email, p1_phone,
      p1_employment_type, p1_birth_date, p2_name, p2_nif, p2_email,
      p2_phone, p2_employment_type, p2_birth_date,
    } = body;

    const hasP2 = Boolean(p2_name);

    // Validate email and NIF format
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (p1_email && !emailRe.test(p1_email)) return NextResponse.json({ error: 'Email do P1 inválido' }, { status: 400 });
    if (p1_nif && !isValidNIF(p1_nif)) return NextResponse.json({ error: 'NIF do P1 inválido' }, { status: 400 });
    if (hasP2 && p2_email && !emailRe.test(p2_email)) return NextResponse.json({ error: 'Email do P2 inválido' }, { status: 400 });
    if (hasP2 && p2_nif && !isValidNIF(p2_nif)) return NextResponse.json({ error: 'NIF do P2 inválido' }, { status: 400 });

    // Insert client (identity fields only)
    const { data, error } = await serviceClient.from('clients').insert({
      broker_id,
      office_id,
      p1_name,
      p1_nif: p1_nif || null,
      p1_email: p1_email || null,
      p1_phone: p1_phone || null,
      p1_employment_type: p1_employment_type || null,
      p1_birth_date: p1_birth_date || null,
      p2_name: p2_name || null,
      p2_nif: p2_nif || null,
      p2_email: p2_email || null,
      p2_phone: p2_phone || null,
      p2_employment_type: p2_employment_type || null,
      p2_birth_date: p2_birth_date || null,
    }).select('id, portal_token').single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const clientId = (data as { id: string; portal_token: string | null }).id;
    const portalToken = (data as { id: string; portal_token: string | null }).portal_token;

    return NextResponse.json({ id: clientId, name: p1_name, portal_token: portalToken });
  } catch (err) {
    console.error('Create client error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
