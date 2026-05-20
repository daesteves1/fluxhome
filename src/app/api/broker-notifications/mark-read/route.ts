/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = await createServiceClient();

  const { data: brokerRaw } = await serviceClient
    .from('brokers').select('id').eq('user_id', user.id).eq('is_active', true).limit(1);
  const broker = ((brokerRaw ?? [])[0] ?? null) as { id: string } | null;
  if (!broker) return NextResponse.json({ error: 'Broker not found' }, { status: 404 });

  const body = await request.json() as { ids?: string[] };

  let query = (serviceClient as any)
    .from('broker_notifications')
    .update({ is_read: true })
    .eq('broker_id', broker.id);

  if (body.ids?.length) {
    query = query.in('id', body.ids);
  }

  const { error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
