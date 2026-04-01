import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

interface RouteParams { params: Promise<{ id: string; noteId: string }> }

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { noteId } = await params;
  const { content } = await request.json();
  const serviceClient = await createServiceClient();

  const { data: brokerRaw } = await serviceClient
    .from('brokers').select('id').eq('user_id', user.id).eq('is_active', true).single();
  const broker = brokerRaw as { id: string } | null;
  if (!broker) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { error } = await serviceClient
    .from('broker_notes')
    .update({ content })
    .eq('id', noteId)
    .eq('broker_id', broker.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { noteId } = await params;
  const serviceClient = await createServiceClient();

  const { data: brokerRaw } = await serviceClient
    .from('brokers').select('id').eq('user_id', user.id).eq('is_active', true).single();
  const broker = brokerRaw as { id: string } | null;
  if (!broker) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { error } = await serviceClient
    .from('broker_notes')
    .delete()
    .eq('id', noteId)
    .eq('broker_id', broker.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
