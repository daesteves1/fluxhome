'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2, Map, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { BankProposta, MapaComparativo } from '@/types/proposta';
import { formatDate } from '@/lib/utils';
import { ComparisonTable } from '@/components/propostas/comparison-table';
import { fmtEur, fmtPct } from '@/types/proposta';

interface Client {
  id: string;
  p1_name: string;
  [key: string]: unknown;
}

interface Props {
  client: Client;
}

interface MapaWithPropostas {
  mapa: MapaComparativo;
  bankPropostas: BankProposta[];
}

export function PropostasTab({ client }: Props) {
  const router = useRouter();
  const [bankPropostas, setBankPropostas] = useState<BankProposta[]>([]);
  const [mapaData, setMapaData] = useState<MapaWithPropostas | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [bpRes, mapaRes] = await Promise.all([
        fetch(`/api/clients/${client.id}/bank-propostas`),
        fetch(`/api/clients/${client.id}/mapa`),
      ]);
      if (bpRes.ok) {
        const data = await bpRes.json() as BankProposta[];
        setBankPropostas(data);
      }
      if (mapaRes.ok) {
        const data = await mapaRes.json() as MapaWithPropostas | null;
        setMapaData(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [client.id]);

  useEffect(() => { void loadData(); }, [loadData]);

  async function handleDelete(id: string, bankName: string) {
    if (!confirm(`Eliminar proposta "${bankName}"? Esta ação não pode ser desfeita.`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/clients/${client.id}/bank-propostas/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao eliminar');
      toast.success('Proposta eliminada');
      setBankPropostas((prev) => prev.filter((p) => p.id !== id));
    } catch {
      toast.error('Erro ao eliminar proposta');
    } finally {
      setDeletingId(null);
    }
  }

  const orderedMapaPropostas = mapaData
    ? (mapaData.mapa.proposta_ids
        .map((pid) => mapaData.bankPropostas.find((p) => p.id === pid))
        .filter(Boolean) as BankProposta[])
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        A carregar propostas…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ── Bank Propostas Section ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Propostas Bancárias
          </h3>
          <Button
            size="sm"
            onClick={() => router.push(`/dashboard/clients/${client.id}/bank-propostas/new`)}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Nova proposta
          </Button>
        </div>

        {bankPropostas.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm border border-dashed border-gray-200 rounded-xl">
            Nenhuma proposta criada ainda.
          </div>
        ) : (
          <div className="space-y-2">
            {bankPropostas.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-4 px-4 py-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{p.bank_name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {[
                      p.loan_amount ? fmtEur(p.loan_amount) : null,
                      p.term_months ? `${p.term_months} meses` : null,
                      p.spread ? `Spread ${fmtPct(p.spread)}` : null,
                      p.tan ? `TAN ${fmtPct(p.tan)}` : null,
                    ].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <p className="text-xs text-gray-400 hidden md:block">{formatDate(p.created_at)}</p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/dashboard/clients/${client.id}/bank-propostas/${p.id}/edit`)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(p.id, p.bank_name)}
                    disabled={deletingId === p.id}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    {deletingId === p.id
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Trash2 className="h-4 w-4" />
                    }
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Mapa Comparativo Section ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Mapa Comparativo
          </h3>
          <div className="flex items-center gap-2">
            {mapaData && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`/api/clients/${client.id}/mapa/excel`, '_blank')}
                >
                  <FileSpreadsheet className="h-4 w-4 mr-1.5" />
                  Excel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`/api/clients/${client.id}/mapa/pdf`, '_blank')}
                >
                  <FileText className="h-4 w-4 mr-1.5" />
                  PDF
                </Button>
              </>
            )}
            <Button
              size="sm"
              onClick={() => router.push(`/dashboard/clients/${client.id}/mapa`)}
              disabled={bankPropostas.length === 0}
            >
              <Map className="h-4 w-4 mr-1.5" />
              {mapaData ? 'Editar mapa' : 'Criar mapa'}
            </Button>
          </div>
        </div>

        {!mapaData ? (
          <div className="text-center py-10 text-gray-400 text-sm border border-dashed border-gray-200 rounded-xl">
            {bankPropostas.length === 0
              ? 'Crie primeiro pelo menos uma proposta bancária.'
              : 'Crie o mapa comparativo para comparar propostas lado a lado.'}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                mapaData.mapa.is_visible_to_client
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {mapaData.mapa.is_visible_to_client ? 'Visível ao cliente' : 'Oculto ao cliente'}
              </span>
              <span className="text-xs text-gray-400">
                {orderedMapaPropostas.length} proposta{orderedMapaPropostas.length !== 1 ? 's' : ''} incluída{orderedMapaPropostas.length !== 1 ? 's' : ''}
              </span>
            </div>
            {orderedMapaPropostas.length > 0 && (
              <ComparisonTable
                propostas={orderedMapaPropostas}
                recommendedId={mapaData.mapa.recommended_proposta_id}
                highlightedCells={mapaData.mapa.highlighted_cells as Record<string, string>}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
