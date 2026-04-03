import { createClient, createServiceClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = await createServiceClient();

  const { data: broker } = await serviceClient
    .from('brokers')
    .select('id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single();

  if (!broker) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const {
    title,
    comparison_data,
    insurance_data,
    one_time_charges,
    monthly_charges,
    notes,
    is_visible_to_client,
  } = body;

  const { data, error } = await serviceClient
    .from('propostas')
    .insert({
      client_id: id,
      broker_id: broker.id,
      title: title ?? null,
      comparison_data: comparison_data ?? [],
      insurance_data: insurance_data ?? {},
      one_time_charges: one_time_charges ?? [],
      monthly_charges: monthly_charges ?? [],
      notes: notes ?? null,
      is_visible_to_client: is_visible_to_client ?? false,
    })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ id: data.id }, { status: 201 });
}
