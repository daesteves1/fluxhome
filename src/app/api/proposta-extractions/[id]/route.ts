/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient, createAdminClient } from '@/lib/supabase/server';

interface RouteParams { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const serviceClient = createAdminClient();
    const body = await request.json() as { proposta_id?: string; fields_edited?: number };

    await (serviceClient as any)
      .from('proposta_extractions')
      .update({ proposta_id: body.proposta_id, updated_at: new Date().toISOString() })
      .eq('id', id);

    // Fire-and-forget audit log
    void (async () => {
      try {
        await (serviceClient as any).from('audit_log').insert({
          action: 'proposta_extraction_confirmed',
          actor_user_id: user.id,
          target_type: 'proposta_extraction',
          target_id: id,
          metadata: { proposta_id: body.proposta_id, fields_edited: body.fields_edited ?? 0 },
        });
      } catch { /* ignore */ }
    })();

    return NextResponse.json({ ok: true });
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

    const serviceClient = createAdminClient();

    const cookieStore = await cookies();
    const activeOfficeCookie = cookieStore.get('homeflux_active_office')?.value;
    let brokerQuery = (serviceClient as any).from('brokers').select('id, office_id').eq('user_id', user.id).eq('is_active', true);
    if (activeOfficeCookie) brokerQuery = brokerQuery.eq('office_id', activeOfficeCookie);
    const { data: brokerRaw } = await brokerQuery.limit(1);
    const broker = ((brokerRaw ?? [])[0] ?? null) as { id: string; office_id: string } | null;
    if (!broker) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Fetch the row to verify ownership and get pdf_path
    const { data: rowRaw } = await (serviceClient as any)
      .from('proposta_extractions')
      .select('id, pdf_path, proposta_id')
      .eq('id', id)
      .eq('office_id', broker.office_id)
      .single();
    const row = rowRaw as { id: string; pdf_path: string | null; proposta_id: string | null } | null;
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (row.proposta_id) return NextResponse.json({ error: 'Already validated' }, { status: 409 });

    // Delete PDF from storage
    if (row.pdf_path) {
      await serviceClient.storage.from('fine-pdfs').remove([row.pdf_path]);
    }

    await (serviceClient as any).from('proposta_extractions').delete().eq('id', id);

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const serviceClient = createAdminClient();

    const cookieStore = await cookies();
    const activeOfficeCookie = cookieStore.get('homeflux_active_office')?.value;
    let brokerQuery = (serviceClient as any).from('brokers').select('id, office_id').eq('user_id', user.id).eq('is_active', true);
    if (activeOfficeCookie) brokerQuery = brokerQuery.eq('office_id', activeOfficeCookie);
    const { data: brokerRaw } = await brokerQuery.limit(1);
    const broker = ((brokerRaw ?? [])[0] ?? null) as { id: string; office_id: string } | null;
    if (!broker) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { data, error } = await (serviceClient as any)
      .from('proposta_extractions')
      .select('id, status, extracted_data, confidence_data, error_message, proposta_id, pdf_path, created_at, completed_at')
      .eq('id', id)
      .eq('office_id', broker.office_id)
      .single();

    if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
