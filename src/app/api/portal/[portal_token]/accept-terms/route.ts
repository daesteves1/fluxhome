import { createServiceClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ portal_token: string }> }
) {
  const { portal_token } = await params;
  const serviceClient = await createServiceClient();

  const { data: clientRaw } = await serviceClient
    .from('clients')
    .select('id, terms_accepted_at')
    .eq('portal_token', portal_token)
    .single();

  if (!clientRaw) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const client = clientRaw as { id: string; terms_accepted_at: string | null };

  if (client.terms_accepted_at) {
    return NextResponse.json({ ok: true });
  }

  const { error } = await serviceClient
    .from('clients')
    .update({ terms_accepted_at: new Date().toISOString() })
    .eq('id', client.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
