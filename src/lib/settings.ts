export type PlatformSettings = {
  // Portal tabs
  portal_enabled: boolean;
  documents_tab_enabled: boolean;
  propostas_tab_enabled: boolean;
  // Propostas features
  charts_enabled: boolean;
  chart_monthly_bar: boolean;
  chart_total_cost: boolean;
  // Limits
  max_clients: number | null;
  max_propostas_per_client: number | null;
  // RGPD
  rgpd_text: string | null;
};

export const PLATFORM_DEFAULTS: PlatformSettings = {
  portal_enabled: true,
  documents_tab_enabled: true,
  propostas_tab_enabled: true,
  charts_enabled: true,
  chart_monthly_bar: true,
  chart_total_cost: true,
  max_clients: null,
  max_propostas_per_client: null,
  rgpd_text: null,
};

// Broker-level overrides use three-state: absent = inherit, 'on' = true, 'off' = false
export type BrokerSettingsOverride = Partial<
  Record<
    | 'portal_enabled'
    | 'documents_tab_enabled'
    | 'propostas_tab_enabled'
    | 'charts_enabled'
    | 'chart_monthly_bar'
    | 'chart_total_cost',
    'on' | 'off'
  >
>;

const BROKER_BOOL_KEYS = [
  'portal_enabled',
  'documents_tab_enabled',
  'propostas_tab_enabled',
  'charts_enabled',
  'chart_monthly_bar',
  'chart_total_cost',
] as const;

/**
 * Resolves the effective PlatformSettings for a given context.
 * Cascade: PLATFORM_DEFAULTS → officeSettings → brokerSettings
 *
 * officeSettings is Partial<PlatformSettings> — any key present overrides the platform default.
 * brokerSettings uses three-state per boolean key: absent = inherit, 'on' = true, 'off' = false.
 */
export function resolveSettings(
  officeSettings?: Partial<PlatformSettings> | null,
  brokerSettings?: BrokerSettingsOverride | null,
): PlatformSettings {
  const resolved: PlatformSettings = {
    ...PLATFORM_DEFAULTS,
    ...(officeSettings ?? {}),
  };

  if (brokerSettings) {
    for (const key of BROKER_BOOL_KEYS) {
      const v = brokerSettings[key];
      if (v === 'on') resolved[key] = true;
      else if (v === 'off') resolved[key] = false;
    }
  }

  return resolved;
}
