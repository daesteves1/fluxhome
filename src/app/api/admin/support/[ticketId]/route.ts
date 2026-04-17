import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

interface RouteParams { params: Promise<{ ticketId: string }> }

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const serviceClient = await createServiceClient();
  const { data: userRaw } = await serviceClient
    .from('users').select('role').eq('id', user.id).single();
  if ((userRaw as { role: string } | null)?.role !== 'super_admin') {
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 });
  }

  const { ticketId } = await params;
  const { status } = (await request.json()) as { status: 'open' | 'in_progress' | 'resolved' };

  const allowed = ['open', 'in_progress', 'resolved'];
  if (!allowed.includes(status)) {
    return NextResponse.json({ error: 'Estado inválido.' }, { status: 400 });
  }

  const { error } = await serviceClient
    .from('support_tickets')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', ticketId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
