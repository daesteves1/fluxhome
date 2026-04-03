'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Plus, Eye, EyeOff, Pencil, Trash2, Star, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import type { Proposta } from './client-detail-tabs';
import type { ProcessStep } from '@/types/database';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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

type BankMeta = { name: string; recommended?: boolean; highlight?: boolean };

export function PropostasTab({ client, propostas }: Props) {
  const t = useTranslations('propostas');
  const router = useRouter();
  const [toggling, setToggling] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  async function toggleVisibility(propostaId: string, current: boolean) {
    setToggling(propostaId);
    try {
      const res = await fetch(`/api/clients/${client.id}/propostas/${propostaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_visible_to_client: !current }),
      });
      if (res.ok) router.refresh();
      else toast.error('Erro');
    } finally {
      setToggling(null);
    }
  }

  async function deleteProposta(propostaId: string) {
    setDeleting(propostaId);
    setConfirmDeleteId(null);
    try {
      const res = await fetch(`/api/clients/${client.id}/propostas/${propostaId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success('Proposta eliminada');
        router.refresh();
      } else {
        toast.error('Erro ao eliminar');
      }
    } finally {
      setDeleting(null);
    }
  }

  function getBankMeta(p: Proposta) {
    const banks = (p.comparison_data as BankMeta[] | null) ?? [];
    const recommended = banks.find((b) => b.recommended || b.highlight);
    return { count: banks.length, recommended: recommended?.name ?? null };
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
          {propostas.map((p) => {
            const { count, recommended } = getBankMeta(p);
            const isDeleting = deleting === p.id;

            return (
              <div key={p.id} className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  {/* Left: title + meta */}
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-slate-900 leading-snug">
                      {p.title || t('proposta')}
                    </p>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <p className="text-xs text-slate-400">{formatDate(p.created_at)}</p>
                      {count > 0 && (
                        <span className="text-xs text-slate-500">
                          {count} banco{count !== 1 ? 's' : ''}
                        </span>
                      )}
                      {recommended && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                          <Star className="h-3 w-3" fill="currentColor" />
                          {recommended}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Visibility toggle */}
                    <button
                      onClick={() => toggleVisibility(p.id, p.is_visible_to_client)}
                      disabled={toggling === p.id}
                      title={p.is_visible_to_client ? 'Ocultar do cliente' : 'Tornar visível ao cliente'}
                      className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-40"
                    >
                      {toggling === p.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : p.is_visible_to_client
                          ? <EyeOff className="h-3.5 w-3.5" />
                          : <Eye className="h-3.5 w-3.5" />
                      }
                      {p.is_visible_to_client ? 'Ocultar' : 'Publicar'}
                    </button>

                    {/* Edit */}
                    <Link
                      href={`/dashboard/clients/${client.id}/propostas/${p.id}`}
                      className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
                      title="Editar"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Link>

                    {/* Delete */}
                    <button
                      onClick={() => setConfirmDeleteId(p.id)}
                      disabled={isDeleting}
                      title="Eliminar"
                      className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 text-slate-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors disabled:opacity-40"
                    >
                      {isDeleting
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Trash2 className="h-3.5 w-3.5" />
                      }
                    </button>
                  </div>
                </div>

                {/* Visibility badge */}
                <div className="mt-2">
                  <span className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full ${
                    p.is_visible_to_client
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-slate-100 text-slate-500'
                  }`}>
                    {p.is_visible_to_client ? '● Visível ao cliente' : '○ Oculto'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete confirm dialog */}
      <Dialog open={!!confirmDeleteId} onOpenChange={(v) => { if (!v) setConfirmDeleteId(null); }}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Eliminar proposta?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600 mt-1">Esta ação não pode ser desfeita.</p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={() => confirmDeleteId && deleteProposta(confirmDeleteId)}
            >
              Eliminar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
