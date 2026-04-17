/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const serviceClient = createAdminClient();
    const body = await request.json();

    const { link_id } = body;

    // Get broker from brokers table
    const { data: brokerData, error: brokerError } = await (serviceClient as any)
      .from('brokers')
      .select('id, office_id, is_office_admin')
      .eq('user_id', user.id)
      .single();

    if (brokerError || !brokerData) {
      return NextResponse.json({ error: 'Broker not found' }, { status: 404 });
    }

    // Verify broker has access to this link (owner OR office admin in same office)
    const { data: linkData, error: linkError } = await (serviceClient as any)
      .from('bank_share_links')
      .select('id, broker_id, client_id')
      .eq('id', link_id)
      .single();

    if (linkError || !linkData) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 });
    }

    // Check ownership via client's office if office admin
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

    // Update revoked_at
    const { error: updateError } = await (serviceClient as any)
      .from('bank_share_links')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', link_id);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to revoke link' }, { status: 500 });
    }

    // Log to audit_log
    await (serviceClient as any).from('audit_log').insert({
      action: 'bank_share_revoked',
      actor_user_id: user.id,
      target_type: 'bank_share_link',
      target_id: link_id,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Revoke bank share error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
