import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

interface RouteParams { params: Promise<{ id: string; propostaId: string }> }

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { propostaId } = await params;
  const body = await request.json();
  const serviceClient = await createServiceClient();

  const allowed: Record<string, unknown> = {};
  const fields = ['title', 'notes', 'is_visible_to_client', 'comparison_data', 'insurance_data', 'one_time_charges', 'monthly_charges'];
  for (const f of fields) {
    if (f in body) allowed[f] = body[f];
  }

  const { error } = await serviceClient
    .from('propostas')
    .update(allowed)
    .eq('id', propostaId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { propostaId } = await params;
  const serviceClient = await createServiceClient();

  const { error } = await serviceClient
    .from('propostas')
    .delete()
    .eq('id', propostaId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
