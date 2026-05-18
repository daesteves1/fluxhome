'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2, Loader2, ExternalLink, AlertCircle, Cpu, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { BankProposta } from '@/types/proposta';
import { fmtEur, fmtPct, calcTotalRecomendado, RATE_TYPE_LABELS } from '@/types/proposta';
import { createClient } from '@/lib/supabase/client';

interface ExtractionRow {
  id: string;
  status: 'pending' | 'processing' | 'complete' | 'failed';
  error_message: string | null;
  proposta_id: string | null;
}

interface Client {
  id: string;
  p1_name: string;
  p2_name?: string | null;
  [key: string]: unknown;
}

interface Props {
  client: Client;
  apiBase?: string;
  pageBase?: string;
  processId?: string;
}

export function PropostasTab({ client, apiBase, pageBase, processId }: Props) {
  const base = apiBase ?? `/api/clients/${client.id}`;
  const pg = pageBase ?? `/dashboard/clients/${client.id}`;
  const router = useRouter();
  const [bankPropostas, setBankPropostas] = useState<BankProposta[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingExtractionId, setDeletingExtractionId] = useState<string | null>(null);
  const [pendingExtractions, setPendingExtractions] = useState<ExtractionRow[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${base}/bank-propostas`);
      if (res.ok) {
        const data = await res.json() as BankProposta[];
        setBankPropostas(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [base]);

  useEffect(() => { void loadData(); }, [loadData]);

  // Fetch and watch pending extractions for this process
  useEffect(() => {
    if (!processId) return;
    let cancelled = false;

    async function fetchExtractions() {
      const res = await fetch(`/api/proposta-extractions?process_id=${processId}`).catch(() => null);
      if (!res?.ok || cancelled) return;
      const rows = await res.json() as ExtractionRow[];
      if (!cancelled) setPendingExtractions(rows.filter((r) =>
        r.status === 'pending' || r.status === 'processing' ||
        (r.status === 'complete' && !r.proposta_id)
      ));
    }
    void fetchExtractions();

    const supabase = createClient();
    const channel = supabase
      .channel(`extractions-process-${processId}`)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on('postgres_changes' as any, {
        event: 'UPDATE',
        schema: 'public',
        table: 'proposta_extractions',
        filter: `process_id=eq.${processId}`,
      }, (payload: { new: ExtractionRow }) => {
        const updated = payload.new;
        setPendingExtractions((prev) => {
          const filtered = prev.filter((r) => r.id !== updated.id);
          const showCard = (updated.status === 'pending' || updated.status === 'processing') ||
            (updated.status === 'complete' && !updated.proposta_id);
          return showCard ? [...filtered, updated] : filtered;
        });
        if (updated.status === 'complete') {
          toast.success('FINE analisada! Proposta pronta para validação.');
        }
      })
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [processId]);

  async function handleDeleteExtraction(extractionId: string) {
    if (!confirm('Eliminar esta análise de FINE? Esta ação não pode ser desfeita.')) return;
    setDeletingExtractionId(extractionId);
    try {
      const res = await fetch(`/api/proposta-extractions/${extractionId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao eliminar');
      setPendingExtractions((prev) => prev.filter((e) => e.id !== extractionId));
      toast.success('Análise eliminada');
    } catch {
      toast.error('Erro ao eliminar análise');
    } finally {
      setDeletingExtractionId(null);
    }
  }

  async function handleDelete(propostaId: string, bankName: string) {
    if (!confirm(`Eliminar proposta "${bankName}"? Esta ação não pode ser desfeita.`)) return;
    setDeletingId(propostaId);
    try {
      const res = await fetch(`${base}/bank-propostas/${propostaId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao eliminar');
      toast.success('Proposta eliminada');
      setBankPropostas((prev) => prev.filter((p) => p.id !== propostaId));
    } catch {
      toast.error('Erro ao eliminar proposta');
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        A carregar propostas…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Bank Propostas Section ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Propostas Bancárias
          </h3>
          <Button
            size="sm"
            onClick={() => router.push(`${pg}/bank-propostas/new`)}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Nova proposta
          </Button>
        </div>

        {/* Pending AI extraction cards */}
        {pendingExtractions.map((ex, i) => (
          <div key={ex.id} className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
            <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
              {ex.status === 'complete'
                ? <Cpu className="h-4 w-4 text-blue-600" />
                : <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
              }
            </div>
            <div className="flex-1 min-w-0">
              {ex.status === 'complete' ? (
                <>
                  <p className="text-sm font-medium text-blue-900">Proposta pronta para validação</p>
                  <p className="text-xs text-blue-600">FINE analisada com sucesso</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-blue-900">FINE em análise para a proposta {bankPropostas.length + i + 1}</p>
                  <p className="text-xs text-blue-600">A analisar o PDF da FINE…</p>
                </>
              )}
            </div>
            {ex.status === 'complete' && (
              <Button
                size="sm"
                variant="outline"
                className="border-blue-300 text-blue-700 hover:bg-blue-100 shrink-0"
                onClick={() => router.push(`${pg}/bank-propostas/new?extraction_id=${ex.id}`)}
              >
                Validar agora
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            )}
            <button
              type="button"
              disabled={deletingExtractionId === ex.id}
              onClick={() => handleDeleteExtraction(ex.id)}
              className="p-1.5 rounded-lg text-blue-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
              title="Eliminar análise"
            >
              {deletingExtractionId === ex.id
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Trash2 className="h-4 w-4" />
              }
            </button>
          </div>
        ))}

        {bankPropostas.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm border border-dashed border-gray-200 rounded-xl">
            Nenhuma proposta criada ainda.
          </div>
        ) : (
          <div className="space-y-2">
            {bankPropostas.map((p) => {
              const totalBanco = calcTotalRecomendado(p, Boolean(client.p2_name));
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
                        onClick={() => router.push(`${pg}/bank-propostas/${p.id}/edit`)}
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

    </div>
  );
}
