import { createServiceClient } from '@/lib/supabase/server';
import type { DashboardScope, LayerToggles } from './types';

type SearchParams = {
  scope?: string;
  broker?: string;
  range?: string;
};

export async function resolveDashboardScope(
  searchParams: SearchParams,
  userId: string,
  impersonatingId: string | null,
  activeOfficeCookieId: string | null,
): Promise<DashboardScope | null> {
  const service = await createServiceClient();

  type BrokerRow = { id: string; office_id: string; is_office_admin: boolean };
  let broker: BrokerRow | null = null;

  if (impersonatingId) {
    const { data } = await service
      .from('brokers')
      .select('id, office_id, is_office_admin')
      .eq('id', impersonatingId)
      .eq('is_active', true)
      .single();
    broker = data as BrokerRow | null;
  } else {
    const { data } = await service
      .from('brokers')
      .select('id, office_id, is_office_admin')
      .eq('user_id', userId)
      .eq('is_active', true);
    const all = (data ?? []) as BrokerRow[];
    broker = all.find((b) => b.office_id === activeOfficeCookieId) ?? all[0] ?? null;
  }

  if (!broker) return null;

  // Impersonating or plain broker always sees broker scope
  const canSeeOffice = broker.is_office_admin && !impersonatingId;
  const requestedScope = searchParams.scope === 'broker' ? 'broker' : 'office';
  const view = canSeeOffice ? requestedScope : 'broker';

  const filterBrokerId =
    canSeeOffice && view === 'office' && searchParams.broker ? searchParams.broker : null;

  return {
    view,
    officeId: broker.office_id,
    brokerId: broker.id,
    filterBrokerId,
    isOfficeAdmin: broker.is_office_admin,
  };
}

export async function loadLayerToggles(officeId: string): Promise<LayerToggles> {
  const service = await createServiceClient();
  const { data } = await service
    .from('dashboard_layer_toggles')
    .select('layer, enabled')
    .eq('office_id', officeId);

  const rows = (data ?? []) as { layer: string; enabled: boolean }[];
  const map = Object.fromEntries(rows.map((r) => [r.layer, r.enabled]));

  return {
    hero: map.hero ?? true,
    action_board: map.action_board ?? true,
    pipeline_health: map.pipeline_health ?? true,
    performance: map.performance ?? true,
  };
}

export async function loadBrokersForFilter(
  officeId: string
): Promise<{ id: string; name: string }[]> {
  const service = await createServiceClient();
  const { data } = await service
    .from('brokers')
    .select('id, users(name)')
    .eq('office_id', officeId)
    .eq('is_active', true);
  return ((data ?? []) as unknown as { id: string; users: { name: string } | null }[]).map(
    (b) => ({ id: b.id, name: b.users?.name ?? '—' })
  );
}
