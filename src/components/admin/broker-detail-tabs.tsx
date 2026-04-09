'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/utils';
import type { BrokerSettingsOverride } from '@/lib/settings';
import { resolveSettings } from '@/lib/settings';
import type { PlatformSettings } from '@/lib/settings';

type BrokerDetail = {
  id: string;
  is_active: boolean;
  is_office_admin: boolean;
  activated_at: string | null;
  invited_at: string | null;
  settings: BrokerSettingsOverride | null;
  userName: string;
  userEmail: string;
  officeName: string;
  officeSettings: Partial<PlatformSettings> | null;
};

interface Props {
  broker: BrokerDetail;
}

const TOGGLE_SETTINGS: { key: keyof BrokerSettingsOverride; label: string; description: string }[] = [
  { key: 'portal_enabled', label: 'Portal do Cliente', description: 'Acesso ao portal para os clientes deste mediador' },
  { key: 'documents_tab_enabled', label: 'Tab Documentos', description: 'Tab de documentos visível no portal' },
  { key: 'propostas_tab_enabled', label: 'Tab Propostas', description: 'Tab de propostas visível no portal' },
  { key: 'charts_enabled', label: 'Gráficos Comparativos', description: 'Gráficos de comparação de propostas' },
  { key: 'chart_monthly_bar', label: 'Gráfico Prestação Mensal', description: 'Gráfico de barras de prestação mensal' },
  { key: 'chart_total_cost', label: 'Gráfico Custo Total', description: 'Gráfico de custo total do crédito' },
];

type TriState = 'inherit' | 'on' | 'off';

function TriStateToggle({
  value,
  effectiveValue,
  onChange,
}: {
  value: TriState;
  effectiveValue: boolean;
  onChange: (v: TriState) => void;
}) {
  return (
    <div className="flex gap-1">
      {(['inherit', 'on', 'off'] as TriState[]).map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={cn(
            'px-2.5 py-1 rounded text-xs font-medium border transition-colors',
            value === opt
              ? opt === 'inherit'
                ? 'bg-slate-200 border-slate-300 text-slate-700'
                : opt === 'on'
                ? 'bg-green-100 border-green-300 text-green-700'
                : 'bg-red-100 border-red-300 text-red-700'
              : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600',
          )}
        >
          {opt === 'inherit' ? `Herdar (${effectiveValue ? 'Ativo' : 'Inativo'})` : opt === 'on' ? 'Ativo' : 'Inativo'}
        </button>
      ))}
    </div>
  );
}

export function BrokerDetailTabs({ broker }: Props) {
  const router = useRouter();
  const [overrides, setOverrides] = useState<BrokerSettingsOverride>(broker.settings ?? {});
  const [isActive, setIsActive] = useState(broker.is_active);
  const [saving, setSaving] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);

  // Effective settings from office + platform cascade (before broker override)
  const officeResolved = resolveSettings(broker.officeSettings);

  function getTriState(key: keyof BrokerSettingsOverride): TriState {
    const v = overrides[key];
    if (v === 'on') return 'on';
    if (v === 'off') return 'off';
    return 'inherit';
  }

  function getEffectiveValue(key: keyof BrokerSettingsOverride): boolean {
    return officeResolved[key as keyof PlatformSettings] as boolean;
  }

  function setTriState(key: keyof BrokerSettingsOverride, v: TriState) {
    setOverrides((prev) => {
      const next = { ...prev };
      if (v === 'inherit') {
        delete next[key];
      } else {
        next[key] = v;
      }
      return next;
    });
  }

  async function saveSettings() {
    setSaving(true);
    const res = await fetch(`/api/admin/brokers/${broker.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: overrides }),
    });
    setSaving(false);
    if (res.ok) {
      toast.success('Configurações guardadas');
      router.refresh();
    } else {
      toast.error('Erro ao guardar');
    }
  }

  async function toggleStatus() {
    setSavingStatus(true);
    const res = await fetch(`/api/admin/brokers/${broker.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !isActive }),
    });
    setSavingStatus(false);
    if (res.ok) {
      setIsActive((v) => !v);
      router.refresh();
    } else {
      toast.error('Erro ao atualizar estado');
    }
  }

  return (
    <Tabs defaultValue="overview">
      <TabsList>
        <TabsTrigger value="overview">Visão Geral</TabsTrigger>
        <TabsTrigger value="settings">Configurações</TabsTrigger>
      </TabsList>

      {/* ── Overview ─────────────────────────────────────────────────────── */}
      <TabsContent value="overview" className="mt-6">
        <div className="rounded-lg border bg-white">
          <div className="px-4 py-3 border-b bg-slate-50 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Detalhes do Mediador</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{isActive ? 'Ativo' : 'Inativo'}</span>
              <Switch checked={isActive} onCheckedChange={toggleStatus} disabled={savingStatus} />
            </div>
          </div>
          <div className="divide-y text-sm">
            <div className="flex justify-between px-4 py-3">
              <span className="text-muted-foreground">Nome</span>
              <span className="font-medium">{broker.userName}</span>
            </div>
            <div className="flex justify-between px-4 py-3">
              <span className="text-muted-foreground">Email</span>
              <span>{broker.userEmail}</span>
            </div>
            <div className="flex justify-between px-4 py-3">
              <span className="text-muted-foreground">Escritório</span>
              <span>{broker.officeName}</span>
            </div>
            <div className="flex justify-between px-4 py-3">
              <span className="text-muted-foreground">Perfil</span>
              <Badge variant="outline" className="text-xs">
                {broker.is_office_admin ? 'Admin de Escritório' : 'Mediador'}
              </Badge>
            </div>
            <div className="flex justify-between px-4 py-3">
              <span className="text-muted-foreground">Convidado em</span>
              <span>{broker.invited_at ? formatDate(broker.invited_at) : '—'}</span>
            </div>
            <div className="flex justify-between px-4 py-3">
              <span className="text-muted-foreground">Ativado em</span>
              <span>{broker.activated_at ? formatDate(broker.activated_at) : '—'}</span>
            </div>
          </div>
        </div>
      </TabsContent>

      {/* ── Settings ─────────────────────────────────────────────────────── */}
      <TabsContent value="settings" className="mt-6 space-y-5">
        <div className="rounded-lg border bg-white">
          <div className="px-4 py-3 border-b bg-slate-50">
            <h3 className="text-sm font-semibold">Substituições de Funcionalidades</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              &ldquo;Herdar&rdquo; usa a configuração do escritório/plataforma. &ldquo;Ativo&rdquo;
              e &ldquo;Inativo&rdquo; substituem para este mediador especificamente.
            </p>
          </div>
          <div className="divide-y">
            {TOGGLE_SETTINGS.map(({ key, label, description }) => (
              <div key={key} className="flex items-start justify-between px-4 py-3.5 gap-4">
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                </div>
                <TriStateToggle
                  value={getTriState(key)}
                  effectiveValue={getEffectiveValue(key)}
                  onChange={(v) => setTriState(key, v)}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={saveSettings} disabled={saving}>
            {saving ? 'A guardar...' : 'Guardar Configurações'}
          </Button>
        </div>
      </TabsContent>
    </Tabs>
  );
}
