import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { resolveDashboardScope } from '@/lib/dashboard/scope';
import { forceRefreshSnapshot } from '@/lib/dashboard/snapshot';

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const cookieStore = await cookies();
  const impersonatingId = cookieStore.get('impersonating_broker_id')?.value ?? null;
  const activeOfficeCookieId = cookieStore.get('homeflux_active_office')?.value ?? null;

  const scope = await resolveDashboardScope({}, user.id, impersonatingId, activeOfficeCookieId);
  if (!scope) return NextResponse.json({ error: 'No scope' }, { status: 400 });

  const data = await forceRefreshSnapshot(scope);
  return NextResponse.json({ computed_at: data.computed_at });
}
