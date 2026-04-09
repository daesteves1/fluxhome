'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { PLATFORM_DEFAULTS } from '@/lib/settings';
import type { PlatformSettings } from '@/lib/settings';
import { formatDate } from '@/lib/utils';
import { Users, FileText } from 'lucide-react';

type Office = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
  settings: Record<string, unknown> | null;
  white_label: { logo_url?: string | null; primary_color?: string } | null;
};

interface Props {
  office: Office;
  brokersCount: number;
  clientsCount: number;
}

const BOOLEAN_SETTINGS: { key: keyof PlatformSettings; label: string; description: string }[] = [
  { key: 'portal_enabled', label: 'Portal do Cliente', description: 'Ativar acesso ao portal para clientes deste escritório' },
  { key: 'documents_tab_enabled', label: 'Tab Documentos', description: 'Mostrar secção de documentos no portal' },
  { key: 'propostas_tab_enabled', label: 'Tab Propostas', description: 'Mostrar secção de propostas no portal' },
  { key: 'charts_enabled', label: 'Gráficos Comparativos', description: 'Ativar gráficos no portal de propostas' },
  { key: 'chart_monthly_bar', label: 'Gráfico Prestação Mensal', description: 'Mostrar gráfico de barras de prestação mensal' },
  { key: 'chart_total_cost', label: 'Gráfico Custo Total', description: 'Mostrar gráfico de custo total do crédito' },
];

export function OfficeDetailTabs({ office, brokersCount, clientsCount }: Props) {
  const router = useRouter();
  const existingSettings = (office.settings ?? {}) as Partial<PlatformSettings>;
  const [settings, setSettings] = useState<Partial<PlatformSettings>>(existingSettings);
  const [saving, setSaving] = useState(false);

  function getEffectiveBool(key: keyof PlatformSettings): boolean {
    if (key in settings) return settings[key] as boolean;
    return PLATFORM_DEFAULTS[key] as boolean;
  }

  function isOverridden(key: keyof PlatformSettings): boolean {
    return key in settings && settings[key] !== PLATFORM_DEFAULTS[key];
  }

  function toggleBool(key: keyof PlatformSettings) {
    const current = getEffectiveBool(key);
    setSettings((prev) => ({ ...prev, [key]: !current }));
  }

  async function saveSettings() {
    setSaving(true);
    const res = await fetch(`/api/admin/offices/${office.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings }),
    });
    setSaving(false);
    if (res.ok) {
      toast.success('Configurações guardadas');
      router.refresh();
    } else {
      toast.error('Erro ao guardar configurações');
    }
  }

  return (
    <Tabs defaultValue="overview">
      <TabsList>
        <TabsTrigger value="overview">Visão Geral</TabsTrigger>
        <TabsTrigger value="settings">Configurações</TabsTrigger>
      </TabsList>

      {/* ── Overview ─────────────────────────────────────────────────────── */}
      <TabsContent value="overview" className="mt-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-lg border bg-white p-4">
            <p className="text-xs text-muted-foreground mb-1">Estado</p>
            <Badge variant={office.is_active ? 'default' : 'secondary'} className="text-sm">
              {office.is_active ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <Users className="h-3.5 w-3.5" /> Mediadores Ativos
            </p>
            <p className="text-2xl font-bold">{brokersCount}</p>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" /> Total Processos
            </p>
            <p className="text-2xl font-bold">{clientsCount}</p>
          </div>
        </div>

        <div className="rounded-lg border bg-white">
          <div className="px-4 py-3 border-b bg-slate-50">
            <h3 className="text-sm font-semibold">Detalhes</h3>
          </div>
          <div className="divide-y text-sm">
            <div className="flex justify-between px-4 py-3">
              <span className="text-muted-foreground">Nome</span>
              <span className="font-medium">{office.name}</span>
            </div>
            <div className="flex justify-between px-4 py-3">
              <span className="text-muted-foreground">Slug</span>
              <span className="font-mono text-slate-700">{office.slug}</span>
            </div>
            <div className="flex justify-between px-4 py-3">
              <span className="text-muted-foreground">Criado em</span>
              <span>{formatDate(office.created_at)}</span>
            </div>
            {office.white_label?.primary_color && (
              <div className="flex justify-between px-4 py-3">
                <span className="text-muted-foreground">Cor principal</span>
                <div className="flex items-center gap-2">
                  <div
                    className="h-4 w-4 rounded border"
                    style={{ backgroundColor: office.white_label.primary_color }}
                  />
                  <span className="font-mono text-xs">{office.white_label.primary_color}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </TabsContent>

      {/* ── Settings ─────────────────────────────────────────────────────── */}
      <TabsContent value="settings" className="mt-6 space-y-5">
        {/* Boolean toggles */}
        <div className="rounded-lg border bg-white">
          <div className="px-4 py-3 border-b bg-slate-50">
            <h3 className="text-sm font-semibold">Funcionalidades</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Substituições para este escritório. Valores iguais ao padrão da plataforma não são
              marcados como alterados.
            </p>
          </div>
          <div className="divide-y">
            {BOOLEAN_SETTINGS.map(({ key, label, description }) => (
              <div key={key} className="flex items-center justify-between px-4 py-3.5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{label}</span>
                    {isOverridden(key) && (
                      <Badge variant="outline" className="text-xs h-5">Alterado</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                </div>
                <Switch
                  checked={getEffectiveBool(key)}
                  onCheckedChange={() => toggleBool(key)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Limits */}
        <div className="rounded-lg border bg-white">
          <div className="px-4 py-3 border-b bg-slate-50">
            <h3 className="text-sm font-semibold">Limites</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Deixar vazio para sem limite.</p>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Máx. Processos</Label>
              <Input
                type="number"
                min={1}
                placeholder="Sem limite"
                value={settings.max_clients ?? ''}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    max_clients: e.target.value ? Number(e.target.value) : null,
                  }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Máx. Propostas por Processo</Label>
              <Input
                type="number"
                min={1}
                placeholder="Sem limite"
                value={settings.max_propostas_per_client ?? ''}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    max_propostas_per_client: e.target.value ? Number(e.target.value) : null,
                  }))
                }
              />
            </div>
          </div>
        </div>

        {/* RGPD text */}
        <div className="rounded-lg border bg-white">
          <div className="px-4 py-3 border-b bg-slate-50">
            <h3 className="text-sm font-semibold">Texto RGPD</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Texto de consentimento personalizado para este escritório. Deixar vazio para usar o
              padrão da plataforma.
            </p>
          </div>
          <div className="p-4">
            <Textarea
              rows={5}
              placeholder="Texto padrão da plataforma será utilizado se vazio..."
              value={settings.rgpd_text ?? ''}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, rgpd_text: e.target.value || null }))
              }
            />
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
