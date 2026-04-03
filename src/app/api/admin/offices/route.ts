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

export async function GET() {
  const serviceClient = await requireSuperAdmin();
  if (!serviceClient) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data, error } = await serviceClient
    .from('offices')
    .select('id, name, slug, is_active, created_at, institution_id, institutions(name)')
    .order('name');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ offices: data });
}

export async function POST(request: NextRequest) {
  const serviceClient = await requireSuperAdmin();
  if (!serviceClient) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const { name, slug, institution_id } = body;

  if (!name || !slug) {
    return NextResponse.json({ error: 'name and slug are required' }, { status: 400 });
  }

  const { data, error } = await serviceClient
    .from('offices')
    .insert({ name, slug, institution_id: institution_id ?? null })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: (data as { id: string }).id }, { status: 201 });
}
