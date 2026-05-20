/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function GET(_req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = await createServiceClient();

  const { data: brokerRaw } = await serviceClient
    .from('brokers').select('id').eq('user_id', user.id).eq('is_active', true).single();
  const broker = brokerRaw as { id: string } | null;
  if (!broker) return NextResponse.json({ error: 'Broker not found' }, { status: 404 });

  const { data, error } = await (serviceClient as any)
    .from('broker_notifications')
    .select('*')
    .eq('broker_id', broker.id)
    .order('created_at', { ascending: false })
    .limit(8);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const unreadCount = (data as any[]).filter((n) => !n.is_read).length;

  return NextResponse.json({ notifications: data ?? [], unreadCount });
}
