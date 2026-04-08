'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2, Map, FileSpreadsheet, FileText, Loader2, ExternalLink, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { BankProposta, MapaComparativo } from '@/types/proposta';
import { formatDate } from '@/lib/utils';
import { ComparisonTable } from '@/components/propostas/comparison-table';
import { fmtEur, fmtPct, calcPrestacaoTotalBanco, RATE_TYPE_LABELS } from '@/types/proposta';

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
            {bankPropostas.map((p) => {
              const totalBanco = calcPrestacaoTotalBanco(p);
              const isExpired = p.validade_ate ? new Date(p.validade_ate) < new Date() : false;
              const expiresSOon = p.validade_ate && !isExpired
                ? (new Date(p.validade_ate).getTime() - Date.now()) < 7 * 24 * 60 * 60 * 1000
                : false;
              const initials = p.bank_name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
              return (
                <div
                  key={p.id}
                  className="bg-white border border-gray-200 rounded-xl hover:border-gray-300 transition-colors overflow-hidden"
                >
                  <div className="flex items-start gap-3 px-4 pt-3 pb-2">
                    {/* Bank avatar */}
                    <div className="w-10 h-10 rounded-lg bg-[#1E3A5F] flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-gray-800">{p.bank_name}</p>
                        {p.rate_type && (
                          <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                            {RATE_TYPE_LABELS[p.rate_type]}
                          </span>
                        )}
                        {p.tan && (
                          <span className="text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded">
                            TAN {fmtPct(p.tan)}
                          </span>
                        )}
                        {isExpired && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-red-50 text-red-600 border border-red-200 px-1.5 py-0.5 rounded">
                            <AlertCircle className="h-3 w-3" />
                            Expirada
                          </span>
                        )}
                        {expiresSOon && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded">
                            Expira em breve
                          </span>
                        )}
                      </div>
                      {/* Key metrics grid */}
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                        {p.loan_amount && <span className="text-xs text-gray-500">{fmtEur(p.loan_amount)}</span>}
                        {p.term_months && <span className="text-xs text-gray-500">{p.term_months} meses</span>}
                        {p.spread && <span className="text-xs text-gray-500">Spread {fmtPct(p.spread)}</span>}
                        {totalBanco > 0 && <span className="text-xs font-medium text-gray-700">{fmtEur(totalBanco)}/mês</span>}
                      </div>
                      {/* Conditions chips */}
                      {p.condicoes_spread && p.condicoes_spread.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {p.condicoes_spread.slice(0, 3).map((c) => (
                            <span key={c} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{c}</span>
                          ))}
                          {p.condicoes_spread.length > 3 && (
                            <span className="text-[10px] text-gray-400">+{p.condicoes_spread.length - 3}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {p.bank_pdf_path && (
                        <a
                          href={`/api/clients/${client.id}/bank-propostas/${p.id}/pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center h-8 w-8 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Ver PDF"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
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
                  {p.validade_ate && (
                    <div className={`px-4 py-1.5 text-[11px] border-t ${isExpired ? 'bg-red-50 text-red-600 border-red-100' : 'bg-gray-50 text-gray-500 border-gray-100'}`}>
                      Válida até {p.validade_ate}
                    </div>
                  )}
                </div>
              );
            })}
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
