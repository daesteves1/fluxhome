'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

interface OfficeData {
  id: string;
  name: string;
  slug: string;
  white_label: Record<string, unknown>;
  settings: Record<string, unknown>;
}

interface Props {
  office: OfficeData;
  isAdmin: boolean;
}

export function OfficeSettingsForm({ office, isAdmin }: Props) {
  const router = useRouter();
  const [name, setName] = useState(office.name);
  const [logoUrl, setLogoUrl] = useState((office.white_label?.logo_url as string) ?? '');
  const [primaryColor, setPrimaryColor] = useState((office.white_label?.primary_color as string) ?? '#2563eb');
  const [portalEnabled, setPortalEnabled] = useState((office.settings?.portal_enabled as boolean) ?? true);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const res = await fetch(`/api/settings/office`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        white_label: { ...office.white_label, logo_url: logoUrl || null, primary_color: primaryColor },
        settings: { ...office.settings, portal_enabled: portalEnabled },
      }),
    });
    setSaving(false);
    if (res.ok) {
      toast.success('Escritório atualizado');
      router.refresh();
    } else {
      toast.error('Erro ao guardar');
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informações do Escritório</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} disabled={!isAdmin} />
          </div>
          <div className="space-y-1.5">
            <Label>Slug</Label>
            <Input value={office.slug} disabled className="bg-muted" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">White Label</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>URL do Logótipo</Label>
            <Input
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://..."
              disabled={!isAdmin}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Cor Principal</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-9 w-16 rounded border cursor-pointer"
                disabled={!isAdmin}
              />
              <Input
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-32 font-mono"
                disabled={!isAdmin}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Funcionalidades</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Portal do Cliente</p>
              <p className="text-xs text-muted-foreground">Permite que clientes acedam ao portal de documentos</p>
            </div>
            <Switch
              checked={portalEnabled}
              onCheckedChange={setPortalEnabled}
              disabled={!isAdmin}
            />
          </div>
        </CardContent>
      </Card>

      {isAdmin && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'A guardar...' : 'Guardar Alterações'}
          </Button>
        </div>
      )}
    </div>
  );
}
