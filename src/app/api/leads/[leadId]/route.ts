import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  const { leadId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = await createServiceClient();

  // Verify broker belongs to the same office as the lead
  const { data: brokerRaw } = await serviceClient
    .from('brokers')
    .select('office_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single();

  const broker = brokerRaw as { office_id: string } | null;
  if (!broker) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data: leadRaw } = await serviceClient
    .from('leads')
    .select('id, office_id')
    .eq('id', leadId)
    .single();

  const lead = leadRaw as { id: string; office_id: string } | null;
  if (!lead || lead.office_id !== broker.office_id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await request.json() as Record<string, unknown>;
  const allowed = ['status', 'assigned_broker_id', 'notes'];
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const { error } = await serviceClient
    .from('leads')
    .update(update)
    .eq('id', leadId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
