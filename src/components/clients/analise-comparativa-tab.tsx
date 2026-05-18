'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Map, FileSpreadsheet, FileText, Loader2, Eye, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import type { BankProposta, MapaComparativo } from '@/types/proposta';
import { ComparisonTable } from '@/components/propostas/comparison-table';
import { PropostasCharts } from '@/components/propostas/propostas-charts';
import { fmtEur, fmtPct, calcPrestacaoTotalBanco, calcPrestacaoTotalExterno, calcTotalRecomendado } from '@/types/proposta';

interface Client {
  id: string;
  p1_name: string;
  p2_name?: string | null;
  portal_token?: string;
  [key: string]: unknown;
}

interface Props {
  client: Client;
  apiBase?: string;
  pageBase?: string;
}

interface MapaWithPropostas {
  mapa: MapaComparativo;
  bankPropostas: BankProposta[];
  propostaChoice?: unknown;
}

function ClientChoiceBanner({
  choice,
  orderedPropostas,
}: {
  choice: { proposta_id: string; bank_name: string; insurance_choice: string; confirmed_at: string };
  orderedPropostas: BankProposta[];
}) {
  const choiceBank = orderedPropostas.find((p) => p.id === choice.proposta_id);
  const choiceMonthly = choiceBank
    ? (choice.insurance_choice === 'banco' ? calcPrestacaoTotalBanco(choiceBank) : calcPrestacaoTotalExterno(choiceBank))
    : 0;
  return (
    <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl p-4 mt-3">
      <div className="h-5 w-5 rounded-full bg-green-500 flex items-center justify-center shrink-0 mt-0.5">
        <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
      </div>
      <div>
        <p className="text-sm font-semibold text-green-800">Preferência do cliente</p>
        <p className="text-sm text-green-700 mt-0.5">
          {choice.bank_name} com {choice.insurance_choice === 'banco' ? 'seguros do banco' : 'seguros externos'}
          {choiceMonthly > 0 && ` — ${fmtEur(choiceMonthly)}/mês`}
        </p>
      </div>
    </div>
  );
}

export function AnaliseComparativaTab({ client, apiBase, pageBase }: Props) {
  const base = apiBase ?? `/api/clients/${client.id}`;
  const pg = pageBase ?? `/dashboard/clients/${client.id}`;
  const router = useRouter();
  const [bankPropostas, setBankPropostas] = useState<BankProposta[]>([]);
  const [mapaData, setMapaData] = useState<MapaWithPropostas | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);

  const portalToken = client.portal_token as string | undefined;
  const portalUrl = portalToken ? `/portal/${portalToken}` : null;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [bpRes, mapaRes] = await Promise.all([
        fetch(`${base}/bank-propostas`),
        fetch(`${base}/mapa`),
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
  }, [base]);

  useEffect(() => { void loadData(); }, [loadData]);

  const orderedMapaPropostas = mapaData?.mapa
    ? (mapaData.mapa.proposta_ids
        .map((pid) => mapaData.bankPropostas.find((p) => p.id === pid))
        .filter(Boolean) as BankProposta[])
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        A carregar…
      </div>
    );
  }

  return (
    <div className="space-y-4">
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
            {mapaData && orderedMapaPropostas.length > 0 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewOpen(true)}
                >
                  <Eye className="h-4 w-4 mr-1.5" />
                  Ver como cliente
                </Button>
                {portalUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(portalUrl, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-1.5" />
                    Abrir portal
                  </Button>
                )}
              </>
            )}
            <Button
              size="sm"
              onClick={() => router.push(`${pg}/mapa`)}
              disabled={bankPropostas.length === 0}
            >
              <Map className="h-4 w-4 mr-1.5" />
              {mapaData ? 'Editar mapa' : 'Criar mapa'}
            </Button>
          </div>
        </div>

        {!mapaData?.mapa ? (
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
                mode="broker"
                clientId={client.id}
              />
            )}
            {mapaData.propostaChoice != null && (
              <ClientChoiceBanner
                choice={mapaData.propostaChoice as { proposta_id: string; bank_name: string; insurance_choice: string; confirmed_at: string }}
                orderedPropostas={orderedMapaPropostas}
              />
            )}
          </div>
        )}
      </div>

      {/* Preview dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-5xl w-full max-h-[90vh] overflow-y-auto p-0">
          <div className="sticky top-0 z-20 flex items-center justify-between bg-amber-500 text-white px-4 py-3">
            <p className="text-sm font-semibold">PRÉ-VISUALIZAÇÃO — Isto é o que o cliente irá ver</p>
            <button onClick={() => setPreviewOpen(false)} className="text-white hover:text-amber-100 ml-4">✕</button>
          </div>
          <div className="p-5 space-y-5">
            <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
              {orderedMapaPropostas.map((p) => {
                const isRec = p.id === mapaData?.mapa?.recommended_proposta_id;
                const totalBanco = calcTotalRecomendado(p, Boolean(client.p2_name));
                const initials = p.bank_name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
                return (
                  <div key={p.id} className={`rounded-xl bg-white p-4 ${isRec ? 'border-2 border-blue-500 shadow-md' : 'border border-slate-200'}`}>
                    {isRec && (
                      <div className="mb-2 text-center">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-blue-600 rounded-full px-2.5 py-1">
                          ★ Recomendado
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-9 h-9 rounded-lg bg-[#1E3A5F] flex items-center justify-center text-white text-xs font-bold">{initials}</div>
                      <p className="font-bold text-slate-900">{p.bank_name}</p>
                    </div>
                    {totalBanco > 0 && (
                      <p className={`text-2xl font-bold ${isRec ? 'text-blue-700' : 'text-slate-900'}`}>
                        {fmtEur(totalBanco)}<span className="text-sm font-normal text-slate-400">/mês</span>
                      </p>
                    )}
                    <div className="flex gap-3 mt-1 text-xs text-slate-500 flex-wrap">
                      {p.tan && <span>TAN: {fmtPct(p.tan)}</span>}
                      {p.spread && <span>Spread: {fmtPct(p.spread)}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
            <ComparisonTable propostas={orderedMapaPropostas} recommendedId={mapaData?.mapa?.recommended_proposta_id ?? null} hasP2={Boolean(client.p2_name)} mode="broker" clientId={client.id} />
            {orderedMapaPropostas.some((p) => (p.monthly_payment ?? 0) > 0) && (
              <div className="border-t border-slate-200 pt-5">
                <p className="text-base font-bold text-slate-900 mb-1">Análise Comparativa</p>
                <p className="text-xs text-slate-500 mb-4">Visualize e compare as propostas para tomar a melhor decisão</p>
                <PropostasCharts propostas={orderedMapaPropostas} recommendedId={mapaData?.mapa?.recommended_proposta_id ?? null} />
              </div>
            )}
            {mapaData?.mapa?.broker_notes && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <p className="text-xs font-semibold text-blue-500 uppercase tracking-wide mb-1.5">Notas do mediador</p>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{mapaData.mapa.broker_notes}</p>
              </div>
            )}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <p className="text-base font-bold text-slate-800 mb-1">A minha preferência</p>
              <p className="text-sm text-slate-500">O cliente verá aqui a secção para indicar a sua preferência.</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
