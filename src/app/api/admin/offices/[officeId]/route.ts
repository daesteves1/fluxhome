import { createClient, createServiceClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

async function requireSuperAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const serviceClient = await createServiceClient();
  const { data } = await serviceClient
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  const u = data as { role: string } | null;
  if (!u || u.role !== 'super_admin') return null;
  return serviceClient;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ officeId: string }> }
) {
  const { officeId } = await params;
  const serviceClient = await requireSuperAdmin();
  if (!serviceClient) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const allowed = [
    'name', 'slug', 'is_active', 'institution_id', 'white_label', 'settings', 'document_template',
    'lead_capture_enabled', 'lead_capture_hero_title', 'lead_capture_hero_subtitle',
    'lead_capture_primary_color', 'lead_capture_logo_url', 'bdp_intermediario_number',
    'lead_capture_headline', 'lead_capture_subheadline', 'lead_capture_cta_label',
    'lead_capture_show_bank_logos', 'website_url', 'office_nif', 'office_address',
  ];
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }

  const { error } = await serviceClient
    .from('offices')
    .update(update)
    .eq('id', officeId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
