import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

interface RouteParams { params: Promise<{ id: string }> }

function errMsg(e: unknown): string {
  if (e && typeof e === 'object') { const o = e as Record<string, unknown>; if (typeof o.message === 'string') return o.message; }
  return String(e);
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = await createServiceClient();
  const { data, error } = await serviceClient
    .from('bank_propostas' as 'propostas').select('*').eq('process_id', id)
    .order('created_at', { ascending: false }) as unknown as { data: unknown[]; error: unknown };

  if (error) return NextResponse.json({ error: errMsg(error) }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = await createServiceClient();
  const brokerRaw = await serviceClient.from('brokers').select('id, office_id').eq('user_id', user.id).eq('is_active', true).single();
  const broker = brokerRaw.data as { id: string; office_id: string } | null;
  if (!broker) return NextResponse.json({ error: 'Broker not found' }, { status: 403 });

  // Get client_id from process
  const { data: procRaw } = await serviceClient.from('processes').select('client_id').eq('id', id).single();
  const proc = procRaw as { client_id: string } | null;
  if (!proc) return NextResponse.json({ error: 'Process not found' }, { status: 404 });

  const body = await request.json() as Record<string, unknown>;
  const { data, error } = await serviceClient
    .from('bank_propostas' as 'propostas')
    .insert({ ...body, client_id: proc.client_id, process_id: id, broker_id: broker.id, office_id: broker.office_id })
    .select('id').single() as unknown as { data: { id: string } | null; error: unknown };

  if (error) return NextResponse.json({ error: errMsg(error) }, { status: 500 });
  return NextResponse.json({ id: (data as { id: string }).id }, { status: 201 });
}
