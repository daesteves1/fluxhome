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
  const { name, institution_id } = body;

  if (!name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  // Auto-generate slug from name (unique suffix added by DB if needed)
  const slug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const { data, error } = await serviceClient
    .from('offices')
    .insert({ name, slug, institution_id: institution_id ?? null })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: (data as { id: string }).id }, { status: 201 });
}
