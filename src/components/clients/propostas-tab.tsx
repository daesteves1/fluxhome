'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Plus, Eye, EyeOff, FileDown, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import type { Proposta } from './client-detail-tabs';
import type { ProcessStep } from '@/types/database';
import Link from 'next/link';

interface Client {
  id: string;
  p1_name: string;
  process_step: ProcessStep;
  [key: string]: unknown;
}

interface Props {
  client: Client;
  propostas: Proposta[];
  currentBrokerId?: string | null;
}

export function PropostasTab({ client, propostas }: Props) {
  const t = useTranslations('propostas');
  const router = useRouter();
  const [toggling, setToggling] = useState<string | null>(null);

  async function toggleVisibility(propostaId: string, current: boolean) {
    setToggling(propostaId);
    try {
      const res = await fetch(`/api/clients/${client.id}/propostas/${propostaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_visible_to_client: !current }),
      });
      if (res.ok) router.refresh();
      else toast.error('Error');
    } finally {
      setToggling(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button asChild>
          <Link href={`/dashboard/clients/${client.id}/propostas/new`}>
            <Plus className="h-4 w-4 mr-1.5" />
            {t('addProposta')}
          </Link>
        </Button>
      </div>

      {propostas.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          {t('noProposta')}
        </div>
      ) : (
        <div className="space-y-3">
          {propostas.map((p) => (
            <Card key={p.id} className="shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-sm">{p.title || t('proposta')}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDate(p.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={p.is_visible_to_client ? 'default' : 'secondary'} className="text-xs">
                      {p.is_visible_to_client ? t('visibleToClient') : t('hiddenFromClient')}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleVisibility(p.id, p.is_visible_to_client)}
                      disabled={toggling === p.id}
                    >
                      {p.is_visible_to_client ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/clients/${client.id}/propostas/${p.id}`}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <a href={`/api/clients/${client.id}/propostas/${p.id}/pdf`} download>
                        <FileDown className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
