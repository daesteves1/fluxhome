import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

interface RouteParams { params: Promise<{ id: string; propostaId: string }> }

export async function POST(request: NextRequest, { params }: RouteParams) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, propostaId } = await params;
  const serviceClient = await createServiceClient();

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const bankName = formData.get('bank_name') as string | null;

  if (!file || !bankName) {
    return NextResponse.json({ error: 'Missing file or bank_name' }, { status: 400 });
  }

  const safeName = bankName.replace(/[^a-zA-Z0-9\u00C0-\u017F\s-]/g, '').trim().replace(/\s+/g, '_');
  const path = `${id}/${propostaId}/${safeName}.pdf`;

  const arrayBuffer = await file.arrayBuffer();
  const { error } = await serviceClient.storage
    .from('propostas-docs')
    .upload(path, arrayBuffer, { contentType: 'application/pdf', upsert: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ path });
}
