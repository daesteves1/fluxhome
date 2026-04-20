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
import { Users, FileText, Copy, ExternalLink } from 'lucide-react';
import { DocumentTemplateEditor } from '@/components/settings/document-template-editor';
import { getOfficeDocumentTemplate, type OfficeDocTemplate } from '@/lib/document-defaults';

type Office = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
  settings: Record<string, unknown> | null;
  white_label: { logo_url?: string | null; primary_color?: string } | null;
  document_template: OfficeDocTemplate[] | null;
  lead_capture_enabled: boolean;
  lead_capture_hero_title: string | null;
  lead_capture_hero_subtitle: string | null;
  lead_capture_primary_color: string | null;
  lead_capture_logo_url: string | null;
  bdp_intermediario_number: string | null;
  lead_capture_headline: string | null;
  lead_capture_subheadline: string | null;
  lead_capture_cta_label: string | null;
  lead_capture_show_bank_logos: boolean;
  website_url: string | null;
  office_nif: string | null;
  office_address: string | null;
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
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Lead capture state
  const [leadEnabled, setLeadEnabled] = useState(office.lead_capture_enabled ?? false);
  const [leadHeroTitle, setLeadHeroTitle] = useState(office.lead_capture_hero_title ?? '');
  const [leadHeroSubtitle, setLeadHeroSubtitle] = useState(office.lead_capture_hero_subtitle ?? '');
  const [leadColor, setLeadColor] = useState(office.lead_capture_primary_color ?? '');
  const [leadLogoUrl, setLeadLogoUrl] = useState(office.lead_capture_logo_url ?? '');
  const [bdpNumber, setBdpNumber] = useState(office.bdp_intermediario_number ?? '');
  const [leadHeadline, setLeadHeadline] = useState(office.lead_capture_headline ?? '');
  const [leadSubheadline, setLeadSubheadline] = useState(office.lead_capture_subheadline ?? '');
  const [leadCtaLabel, setLeadCtaLabel] = useState(office.lead_capture_cta_label ?? '');
  const [showBankLogos, setShowBankLogos] = useState(office.lead_capture_show_bank_logos ?? true);
  const [websiteUrl, setWebsiteUrl] = useState(office.website_url ?? '');
  const [officeNif, setOfficeNif] = useState(office.office_nif ?? '');
  const [officeAddress, setOfficeAddress] = useState(office.office_address ?? '');
  const [savingLeads, setSavingLeads] = useState(false);

  async function saveLeadCapture() {
    setSavingLeads(true);
    const res = await fetch(`/api/admin/offices/${office.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lead_capture_enabled: leadEnabled,
        lead_capture_hero_title: leadHeroTitle || null,
        lead_capture_hero_subtitle: leadHeroSubtitle || null,
        lead_capture_primary_color: leadColor || null,
        lead_capture_logo_url: leadLogoUrl || null,
        bdp_intermediario_number: bdpNumber || null,
        lead_capture_headline: leadHeadline || null,
        lead_capture_subheadline: leadSubheadline || null,
        lead_capture_cta_label: leadCtaLabel || null,
        lead_capture_show_bank_logos: showBankLogos,
        website_url: websiteUrl || null,
        office_nif: officeNif || null,
        office_address: officeAddress || null,
      }),
    });
    setSavingLeads(false);
    if (res.ok) {
      toast.success('Configurações de captura de leads guardadas');
      router.refresh();
    } else {
      toast.error('Erro ao guardar');
    }
  }

  const leadPageUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/l/${office.slug}`
    : `/l/${office.slug}`;

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

  async function saveTemplate(template: OfficeDocTemplate[]) {
    setSavingTemplate(true);
    const res = await fetch(`/api/admin/offices/${office.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ document_template: template }),
    });
    setSavingTemplate(false);
    if (res.ok) {
      toast.success('Template de documentos guardado');
      router.refresh();
    } else {
      toast.error('Erro ao guardar template');
    }
  }

  return (
    <Tabs defaultValue="overview">
      <TabsList>
        <TabsTrigger value="overview">Visão Geral</TabsTrigger>
        <TabsTrigger value="settings">Configurações</TabsTrigger>
        <TabsTrigger value="documents">Documentos</TabsTrigger>
        <TabsTrigger value="leads">Captura de Leads</TabsTrigger>
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

      {/* ── Lead Capture ─────────────────────────────────────────────────── */}
      <TabsContent value="leads" className="mt-6 space-y-5">
        {/* Enable toggle */}
        <div className="rounded-lg border bg-white">
          <div className="px-4 py-3 border-b bg-slate-50 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Captura de Leads</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Ativar página pública de captação de contactos para este escritório
              </p>
            </div>
            <Switch checked={leadEnabled} onCheckedChange={setLeadEnabled} />
          </div>
          {leadEnabled && (
            <div className="px-4 py-3">
              <div className="flex items-center gap-2 p-2.5 rounded-md bg-slate-50 border text-sm">
                <span className="text-muted-foreground truncate flex-1 font-mono text-xs">{leadPageUrl}</span>
                <button
                  type="button"
                  onClick={() => { navigator.clipboard.writeText(leadPageUrl); toast.success('URL copiado'); }}
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                  title="Copiar URL"
                >
                  <Copy className="h-4 w-4" />
                </button>
                <a
                  href={leadPageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                  title="Abrir página"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Branding */}
        <div className="rounded-lg border bg-white">
          <div className="px-4 py-3 border-b bg-slate-50">
            <h3 className="text-sm font-semibold">Branding da Página</h3>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <Label>Título Hero</Label>
              <Input
                placeholder="Ex: Simule o seu Crédito Habitação"
                value={leadHeroTitle}
                onChange={(e) => setLeadHeroTitle(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label>Subtítulo Hero</Label>
              <Input
                placeholder="Ex: Encontramos as melhores condições para si"
                value={leadHeroSubtitle}
                onChange={(e) => setLeadHeroSubtitle(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Cor Primária</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={leadColor || '#0f172a'}
                  onChange={(e) => setLeadColor(e.target.value)}
                  className="h-9 w-12 cursor-pointer rounded border px-1"
                />
                <Input
                  placeholder="#0f172a"
                  value={leadColor}
                  onChange={(e) => setLeadColor(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>URL do Logo</Label>
              <Input
                placeholder="https://..."
                value={leadLogoUrl}
                onChange={(e) => setLeadLogoUrl(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* BdP */}
        <div className="rounded-lg border bg-white">
          <div className="px-4 py-3 border-b bg-slate-50">
            <h3 className="text-sm font-semibold">Regulatório</h3>
          </div>
          <div className="p-4 space-y-1.5">
            <Label>Número de Intermediário BdP</Label>
            <Input
              placeholder="Ex: 0001234"
              value={bdpNumber}
              onChange={(e) => setBdpNumber(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Apresentado no rodapé da página de captação conforme exigido pelo Banco de Portugal.
            </p>
          </div>
        </div>

        {/* Advanced Settings */}
        <div className="rounded-lg border bg-white">
          <div className="px-4 py-3 border-b bg-slate-50">
            <h3 className="text-sm font-semibold">Configurações Avançadas</h3>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <Label>Headline principal</Label>
              <Input
                placeholder="Ex: Encontre o melhor crédito habitação"
                value={leadHeadline}
                onChange={(e) => setLeadHeadline(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label>Sub-headline</Label>
              <Input
                placeholder="Ex: Comparamos propostas dos principais bancos sem custos"
                value={leadSubheadline}
                onChange={(e) => setLeadSubheadline(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Label do botão CTA</Label>
              <Input
                placeholder="Ex: Pedir análise gratuita"
                value={leadCtaLabel}
                onChange={(e) => setLeadCtaLabel(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Website do escritório</Label>
              <Input
                placeholder="https://..."
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>NIF do escritório</Label>
              <Input
                placeholder="Ex: 500000000"
                value={officeNif}
                onChange={(e) => setOfficeNif(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Morada/sede</Label>
              <Input
                placeholder="Ex: Rua Exemplo, 1, Lisboa"
                value={officeAddress}
                onChange={(e) => setOfficeAddress(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2 flex items-center justify-between py-1">
              <div>
                <span className="text-sm font-medium">Mostrar logos de bancos</span>
                <p className="text-xs text-muted-foreground mt-0.5">Apresentar logos dos principais bancos na página de captação</p>
              </div>
              <Switch checked={showBankLogos} onCheckedChange={setShowBankLogos} />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={saveLeadCapture} disabled={savingLeads}>
            {savingLeads ? 'A guardar...' : 'Guardar'}
          </Button>
        </div>
      </TabsContent>

      {/* ── Documents ────────────────────────────────────────────────────── */}
      <TabsContent value="documents" className="mt-6">
        <div className="rounded-lg border bg-white">
          <div className="px-4 py-3 border-b bg-slate-50">
            <h3 className="text-sm font-semibold">Template de Documentos</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Documentos solicitados por defeito ao criar um novo processo neste escritório
            </p>
          </div>
          <div className="p-4">
            <DocumentTemplateEditor
              initialTemplate={getOfficeDocumentTemplate(office.document_template)}
              saving={savingTemplate}
              onSave={saveTemplate}
            />
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}
