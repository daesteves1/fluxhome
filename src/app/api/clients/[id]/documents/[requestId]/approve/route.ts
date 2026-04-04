import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

interface RouteParams { params: Promise<{ id: string; requestId: string }> }

export async function PATCH(_req: NextRequest, { params }: RouteParams) {
  const { id, requestId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = await createServiceClient();

  const { error } = await serviceClient
    .from('document_requests')
    .update({ status: 'approved', broker_notes: null })
    .eq('id', requestId)
    .eq('client_id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Auto-advance: check if all mandatory docs are now approved
  const { data: allReqs } = await serviceClient
    .from('document_requests')
    .select('id, is_mandatory, status')
    .eq('client_id', id);

  const reqs = (allReqs ?? []) as { id: string; is_mandatory: boolean; status: string }[];
  const mandatoryAll = reqs.filter((r) => r.is_mandatory);
  const allMandatoryApproved = mandatoryAll.length > 0 && mandatoryAll.every((r) => r.status === 'approved');

  let advanced = false;
  if (allMandatoryApproved) {
    const { data: clientRaw } = await serviceClient
      .from('clients')
      .select('process_step')
      .eq('id', id)
      .single();
    const step = (clientRaw as { process_step: string } | null)?.process_step;
    if (step === 'docs_pending') {
      await serviceClient
        .from('clients')
        .update({ process_step: 'docs_complete' })
        .eq('id', id);
      advanced = true;
    }
  }

  return NextResponse.json({ ok: true, advanced, allMandatoryApproved });
}
