import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { view } = await request.json() as { view: string };
  if (view !== 'broker' && view !== 'office') {
    return NextResponse.json({ error: 'Invalid view' }, { status: 400 });
  }

  const cookieStore = await cookies();
  cookieStore.set('homeflux_view', view, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
  });

  return NextResponse.json({ ok: true });
}
