import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

interface RouteParams { params: Promise<{ id: string; propostaId: string }> }

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id, propostaId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

  const serviceClient = await createServiceClient();

  // Look up office_id from the proposta record
  const { data: propostaRaw } = await serviceClient
    .from('bank_propostas' as 'propostas')
    .select('office_id')
    .eq('id', propostaId)
    .eq('client_id', id)
    .single() as unknown as { data: { office_id: string } | null };

  if (!propostaRaw) return NextResponse.json({ error: 'Proposta not found' }, { status: 404 });

  const storagePath = `${propostaRaw.office_id}/${id}/${propostaId}/bank_proposal.pdf`;

  const { error: uploadError } = await serviceClient.storage
    .from('propostas-docs')
    .upload(storagePath, file, { upsert: true, contentType: 'application/pdf' });

  if (uploadError) {
    console.error('[upload-pdf] Storage error:', uploadError.message);
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { error: updateError } = await serviceClient
    .from('bank_propostas' as 'propostas')
    .update({ bank_pdf_path: storagePath, updated_at: new Date().toISOString() } as unknown as Record<string, unknown>)
    .eq('id', propostaId)
    .eq('client_id', id) as unknown as { error: unknown };

  if (updateError) {
    console.error('[upload-pdf] DB update error:', updateError);
    return NextResponse.json({ error: String(updateError) }, { status: 500 });
  }

  return NextResponse.json({ path: storagePath });
}
