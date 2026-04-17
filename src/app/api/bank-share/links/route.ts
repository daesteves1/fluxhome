/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('client_id');

    if (!clientId) {
      return NextResponse.json({ error: 'Missing client_id' }, { status: 400 });
    }

    // Use serviceClient for all queries — clients/brokers tables have RLS that blocks anon client
    const serviceClient = createAdminClient();

    // Get broker with office info
    const { data: broker } = await (serviceClient as any)
      .from('brokers')
      .select('id, office_id, is_office_admin')
      .eq('user_id', user.id)
      .single();

    if (!broker) {
      return NextResponse.json({ error: 'Not a broker' }, { status: 403 });
    }

    // Verify broker has access to this client (owner OR office admin in same office)
    const { data: client, error: clientError } = await (serviceClient as any)
      .from('clients')
      .select('id, broker_id, office_id')
      .eq('id', clientId)
      .single();

    if (clientError || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const isOwner = (client as any).broker_id === (broker as any).id;
    const isOfficeAdmin = (broker as any).is_office_admin && (client as any).office_id === (broker as any).office_id;

    if (!isOwner && !isOfficeAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Fetch bank share links (use serviceClient — bank_share_* tables have service-role-only access policies)
    const { data: links } = await (serviceClient as any)
      .from('bank_share_links')
      .select('*')
      .eq('client_id', clientId)
      .eq('broker_id', broker.id)
      .order('created_at', { ascending: false });

    // Compute status for each link and count verified accesses
    const now = new Date();
    const linksWithCounts = await Promise.all(
      (links || []).map(async (link: any) => {
        const { count } = await (serviceClient as any)
          .from('bank_share_access_log')
          .select('*', { count: 'exact', head: true })
          .eq('share_link_id', link.id)
          .eq('event', 'otp_verified');

        const isRevoked = !!link.revoked_at;
        const isExpired = new Date(link.expires_at) < now;
        const status = isRevoked ? 'revoked' : isExpired ? 'expired' : 'active';

        return {
          ...link,
          status,
          access_count: count || 0,
        };
      })
    );

    return NextResponse.json({ links: linksWithCounts });
  } catch (error) {
    console.error('Error fetching links:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
