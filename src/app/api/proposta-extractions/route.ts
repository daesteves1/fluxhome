/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { resolveSettings } from '@/lib/settings';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const serviceClient = createAdminClient();
    const { data: brokerRaw } = await (serviceClient as any)
      .from('brokers').select('id, office_id').eq('user_id', user.id).eq('is_active', true).single();
    const broker = brokerRaw as { id: string; office_id: string } | null;
    if (!broker) return NextResponse.json([], { status: 200 });

    const processId = request.nextUrl.searchParams.get('process_id');
    let query = (serviceClient as any)
      .from('proposta_extractions')
      .select('id, status, error_message, proposta_id, created_at')
      .eq('office_id', broker.office_id)
      .order('created_at', { ascending: false });

    if (processId) query = query.eq('process_id', processId);

    const { data, error } = await query;
    if (error) return NextResponse.json([], { status: 200 });
    return NextResponse.json(data ?? []);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const serviceClient = createAdminClient();

    // Get broker + office
    const { data: brokerRaw } = await (serviceClient as any)
      .from('brokers')
      .select('id, office_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    const broker = brokerRaw as { id: string; office_id: string } | null;
    if (!broker) return NextResponse.json({ error: 'Broker not found' }, { status: 403 });

    // Check feature flag
    const { data: officeRaw } = await (serviceClient as any)
      .from('offices')
      .select('settings')
      .eq('id', broker.office_id)
      .single();

    const officeSettings = (officeRaw as { settings: Record<string, unknown> | null } | null)?.settings ?? null;
    const resolved = resolveSettings(officeSettings as any);
    if (!resolved.ai_proposta_extraction) {
      return NextResponse.json({ error: 'Feature not enabled for this office' }, { status: 403 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const processId = formData.get('process_id') as string | null;

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    if (!processId) return NextResponse.json({ error: 'process_id required' }, { status: 400 });

    // Verify process belongs to this office
    const { data: procRaw } = await (serviceClient as any)
      .from('processes')
      .select('id, client_id, office_id')
      .eq('id', processId)
      .eq('office_id', broker.office_id)
      .single();

    if (!procRaw) return NextResponse.json({ error: 'Process not found' }, { status: 404 });

    // Create the extraction row first to get its id for the storage path
    const extractionId = crypto.randomUUID();
    const storagePath = `${broker.office_id}/${processId}/${extractionId}.pdf`;

    // Upload PDF to storage
    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await serviceClient.storage
      .from('fine-pdfs')
      .upload(storagePath, arrayBuffer, { contentType: 'application/pdf', upsert: false });

    if (uploadError) {
      console.error('[proposta-extractions] Storage upload error:', uploadError.message);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // Insert extraction row with pending status
    const { data: extractionRow, error: insertError } = await (serviceClient as any)
      .from('proposta_extractions')
      .insert({
        id: extractionId,
        office_id: broker.office_id,
        broker_id: broker.id,
        process_id: processId,
        pdf_path: storagePath,
        status: 'pending',
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('[proposta-extractions] Insert error:', insertError.message);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Log audit event (fire-and-forget, don't block response)
    void (async () => {
      try {
        await (serviceClient as any).from('audit_log').insert({
          action: 'proposta_extraction_started',
          actor_user_id: user.id,
          target_type: 'proposta_extraction',
          target_id: extractionId,
          metadata: { process_id: processId, office_id: broker.office_id, file_name: file.name },
        });
      } catch (e) {
        console.warn('[proposta-extractions] audit log failed:', e);
      }
    })();

    return NextResponse.json({ extraction_id: (extractionRow as { id: string }).id }, { status: 201 });
  } catch (e) {
    console.error('[proposta-extractions] Unexpected error:', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
