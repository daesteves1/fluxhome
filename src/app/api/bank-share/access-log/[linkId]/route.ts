/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const serviceClient = createAdminClient();
    const { linkId } = await params;

    // Get broker from brokers table
    const { data: brokerData, error: brokerError } = await (serviceClient as any)
      .from('brokers')
      .select('id, office_id, is_office_admin')
      .eq('user_id', user.id)
      .single();

    if (brokerError || !brokerData) {
      return NextResponse.json({ error: 'Broker not found' }, { status: 404 });
    }

    // Verify access to this link
    const { data: linkData, error: linkError } = await (serviceClient as any)
      .from('bank_share_links')
      .select('id, broker_id, client_id')
      .eq('id', linkId)
      .single();

    if (linkError || !linkData) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 });
    }

    const isOwner = (linkData as any).broker_id === (brokerData as any).id;
    if (!isOwner && (brokerData as any).is_office_admin) {
      const { data: clientRow } = await (serviceClient as any)
        .from('clients').select('office_id').eq('id', (linkData as any).client_id).single();
      if (!clientRow || (clientRow as any).office_id !== (brokerData as any).office_id) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    } else if (!isOwner) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Fetch access logs
    const { data: accessLogs, error: logsError } = await (serviceClient as any)
      .from('bank_share_access_log')
      .select('*')
      .eq('share_link_id', linkId)
      .order('created_at', { ascending: false });

    if (logsError) {
      return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
    }

    return NextResponse.json({ events: accessLogs || [] });
  } catch (err) {
    console.error('Access log error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
