'use client';

import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import {
  Upload,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Trash2,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import { HomeFluxLogoMark } from '@/components/layout/homeflux-logo';

type DocRequest = {
  id: string;
  label: string;
  status: string;
  broker_notes: string | null;
  max_files: number;
  created_at: string;
};

type PortalUpload = {
  id: string;
  document_request_id: string;
  file_name: string | null;
  storage_path: string;
  uploaded_at: string;
};

type BankData = {
  name: string;
  recommended?: boolean;
  highlight?: boolean;
  montante?: string;
  prazo?: string;
  tipo_taxa?: string;
  periodo_fixo?: string;
  euribor?: string;
  spread?: string;
  tan?: string;
  prestacao?: string;
  doc_path?: string;
};

type InsuranceData = {
  [bankName: string]: {
    vida: string;
    multirriscos: string;
    vida_ext: string;
    multirriscos_ext: string;
  };
};

type ChargeRow = { label: string; [bankName: string]: string | boolean | undefined };

type Proposta = {
  id: string;
  title: string | null;
  comparison_data: unknown;
  insurance_data: unknown;
  one_time_charges: unknown;
  monthly_charges: unknown;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

// ─── Portal Proposta Card ──────────────────────────────────────────────────

function fmtEur(val: number) {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val);
}
function fmtPct(val: string) {
  const n = parseFloat(val);
  return isNaN(n) ? val : `${n.toFixed(2)}%`;
}
function parse(v: string | undefined): number { return parseFloat(v ?? '0') || 0; }

function calcSubtotalBank(bank: BankData, ins: InsuranceData): number {
  return parse(bank.prestacao) + parse(ins[bank.name]?.vida) + parse(ins[bank.name]?.multirriscos);
}
function calcTotalOneTime(bankName: string, charges: ChargeRow[]): number {
  return charges.reduce((s, r) => s + parse(r[bankName] as string), 0);
}

function lowestIdx(values: (number | null)[]): number | null {
  const filtered = values.map((v, i) => v !== null && v > 0 ? { v, i } : null).filter(Boolean) as { v: number; i: number }[];
  if (filtered.length < 2) return null;
  const min = Math.min(...filtered.map((x) => x.v));
  return filtered.find((x) => x.v === min)?.i ?? null;
}

function ComparisonTable({ banks, ins, oneTime, monthly }: {
  banks: BankData[];
  ins: InsuranceData;
  oneTime: ChargeRow[];
  monthly: ChargeRow[];
}) {
  const rows: { label: string; values: (string | null)[]; isNumeric?: boolean }[] = [
    { label: 'Tipo de Taxa', values: banks.map((b) => b.tipo_taxa ?? null) },
    { label: 'Euribor', values: banks.map((b) => b.tipo_taxa === 'Fixa' ? 'N/A' : (b.euribor ?? null)) },
    { label: 'Spread', values: banks.map((b) => b.spread ? fmtPct(b.spread) : null), isNumeric: true },
    { label: 'TAN', values: banks.map((b) => b.tan ? fmtPct(b.tan) : null), isNumeric: true },
    { label: 'Prestação mensal', values: banks.map((b) => b.prestacao ? fmtEur(parse(b.prestacao)) : null), isNumeric: true },
    { label: 'Seg. Vida (banco)', values: banks.map((b) => { const v = ins[b.name]?.vida; return v ? fmtEur(parse(v)) : null; }), isNumeric: true },
    { label: 'Seg. Multirriscos (banco)', values: banks.map((b) => { const v = ins[b.name]?.multirriscos; return v ? fmtEur(parse(v)) : null; }), isNumeric: true },
    { label: 'Subtotal mensal', values: banks.map((b) => { const s = calcSubtotalBank(b, ins); return s > 0 ? fmtEur(s) : null; }), isNumeric: true },
    { label: 'Encargos únicos', values: banks.map((b) => { const s = calcTotalOneTime(b.name, oneTime); return s > 0 ? fmtEur(s) : null; }), isNumeric: true },
    { label: 'Manutenção de conta', values: banks.map((b) => { const v = monthly[0]?.[b.name]; return v ? fmtEur(parse(v as string)) : null; }), isNumeric: true },
  ];

  const numericValues = (row: typeof rows[number]) =>
    row.isNumeric ? banks.map((b) => {
      const raw = row.label === 'Prestação mensal' ? parse(b.prestacao)
        : row.label === 'Subtotal mensal' ? calcSubtotalBank(b, ins)
        : row.label === 'Encargos únicos' ? calcTotalOneTime(b.name, oneTime)
        : null;
      return raw;
    }) : [];

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide w-40 border-b border-slate-100">
              Métrica
            </th>
            {banks.map((b, i) => {
              const isRec = b.recommended || b.highlight;
              return (
                <th key={i} className={`px-4 py-3 text-center text-sm font-bold border-b border-slate-100 ${isRec ? 'bg-blue-50 text-blue-700' : 'text-slate-700'}`}>
                  {isRec && <span className="block text-[10px] font-semibold text-blue-500 mb-0.5">★ Recomendado</span>}
                  {b.name}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {rows.map((row) => {
            const nums = numericValues(row);
            const bestIdx = row.isNumeric ? lowestIdx(nums) : null;
            return (
              <tr key={row.label} className="hover:bg-slate-50/50">
                <td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap">{row.label}</td>
                {row.values.map((val, i) => {
                  const isRec = banks[i].recommended || banks[i].highlight;
                  const isBest = bestIdx === i;
                  return (
                    <td key={i} className={`px-4 py-2.5 text-center text-sm font-medium ${isRec ? 'bg-blue-50/40' : ''} ${isBest ? 'text-green-700' : 'text-slate-700'}`}>
                      {isBest && val ? (
                        <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 border border-green-200 rounded-full px-2 py-0.5 text-xs font-semibold">
                          {val}
                        </span>
                      ) : (val ?? <span className="text-slate-300">—</span>)}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SummaryCards({ banks, ins }: { banks: BankData[]; ins: InsuranceData }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {banks.map((b, i) => {
        const isRec = b.recommended || b.highlight;
        const subtotal = calcSubtotalBank(b, ins);
        return (
          <div key={i} className={`rounded-xl border p-4 ${isRec ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white'}`}>
            <div className="flex items-start justify-between gap-2 mb-2">
              <p className="font-bold text-base text-slate-900">{b.name}</p>
              {isRec && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-100 rounded-full px-2 py-0.5 shrink-0">
                  ★ Recomendado
                </span>
              )}
            </div>
            {subtotal > 0 && (
              <div className="mt-1">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Prestação c/ seguros banco</p>
                <p className={`text-2xl font-bold mt-0.5 ${isRec ? 'text-blue-700' : 'text-slate-900'}`}>
                  {fmtEur(subtotal)}<span className="text-sm font-normal text-slate-400">/mês</span>
                </p>
              </div>
            )}
            {b.prestacao && (
              <p className="text-xs text-slate-500 mt-1">Sem seguros: {fmtEur(parse(b.prestacao))}/mês</p>
            )}
            {b.tan && <p className="text-xs text-slate-500 mt-0.5">TAN: {fmtPct(b.tan)}</p>}
          </div>
        );
      })}
    </div>
  );
}

function BarChart({ banks }: { banks: BankData[] }) {
  const values = banks.map((b) => parse(b.prestacao));
  const max = Math.max(...values, 1);
  const barH = 28;
  const gap = 10;
  const labelW = 72;
  const barMaxW = 160;
  const valW = 72;
  const rowH = barH + gap;
  const svgH = banks.length * rowH + 4;

  return (
    <svg width="100%" height={svgH} viewBox={`0 0 ${labelW + barMaxW + valW + 16} ${svgH}`} className="overflow-visible">
      {banks.map((b, i) => {
        const val = values[i];
        const bw = val > 0 ? (val / max) * barMaxW : 0;
        const y = i * rowH;
        const isRec = b.recommended || b.highlight;
        const fill = isRec ? '#3b82f6' : '#94a3b8';
        return (
          <g key={b.name} transform={`translate(0,${y})`}>
            <text x={labelW - 6} y={barH / 2 + 4} textAnchor="end" fontSize="11" fill="#64748b" fontWeight={isRec ? '600' : '400'}>
              {b.name}
            </text>
            <rect x={labelW} y={2} width={bw} height={barH - 4} rx="4" fill={fill} />
            {val > 0 && (
              <text x={labelW + bw + 8} y={barH / 2 + 4} fontSize="11" fill={isRec ? '#1d4ed8' : '#334155'} fontWeight={isRec ? '600' : '400'}>
                {fmtEur(val)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function PortalPropostaCard({ proposta, portalToken }: { proposta: Proposta; portalToken: string }) {
  const banks = (proposta.comparison_data as BankData[] | null) ?? [];
  const ins = (proposta.insurance_data as InsuranceData | null) ?? {};
  const oneTime = (proposta.one_time_charges as ChargeRow[] | null) ?? [];
  const monthly = (proposta.monthly_charges as ChargeRow[] | null) ?? [];

  const hasBanks = banks.length > 0;
  const hasChart = hasBanks && banks.some((b) => parse(b.prestacao) > 0);
  const banksWithPdf = banks.filter((b) => b.doc_path);

  return (
    <div className="space-y-5">
      <div className="flex items-baseline gap-3">
        <h3 className="font-bold text-base text-slate-900">{proposta.title || 'Proposta'}</h3>
      </div>

      {!hasBanks && (
        <p className="text-sm text-slate-400 text-center py-8">Sem dados de comparação disponíveis.</p>
      )}

      {hasBanks && (
        <>
          {/* Comparison table */}
          <ComparisonTable banks={banks} ins={ins} oneTime={oneTime} monthly={monthly} />

          {/* Summary cards */}
          <SummaryCards banks={banks} ins={ins} />

          {/* Bar chart */}
          {hasChart && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">Prestação mensal (sem seguros)</p>
              <BarChart banks={banks} />
            </div>
          )}

          {/* PDF downloads per bank */}
          {banksWithPdf.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Documentos dos bancos</p>
              <div className="flex flex-wrap gap-2">
                {banksWithPdf.map((b) => (
                  <a
                    key={b.name}
                    href={`/api/portal/${portalToken}/propostas/${proposta.id}/bank-doc?bank=${encodeURIComponent(b.name)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    PDF — {b.name}
                  </a>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Broker notes */}
      {proposta.notes && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <p className="text-xs font-semibold text-blue-500 uppercase tracking-wide mb-1.5">Notas do mediador</p>
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{proposta.notes}</p>
        </div>
      )}
    </div>
  );
}

interface PortalViewProps {
  clientName: string;
  portalToken: string;
  termsAcceptedAt: string | null;
  officeName: string;
  documentRequests: DocRequest[];
  uploads: PortalUpload[];
  propostas: Proposta[];
}

function StatusChip({ status }: { status: string }) {
  const t = useTranslations('portal');
  const configs: Record<string, { icon: React.ReactNode; className: string }> = {
    approved: {
      icon: <CheckCircle className="h-3.5 w-3.5" />,
      className: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    },
    rejected: {
      icon: <XCircle className="h-3.5 w-3.5" />,
      className: 'bg-red-50 text-red-700 border border-red-200',
    },
    em_analise: {
      icon: <Clock className="h-3.5 w-3.5" />,
      className: 'bg-amber-50 text-amber-700 border border-amber-200',
    },
    pending: {
      icon: <AlertCircle className="h-3.5 w-3.5" />,
      className: 'bg-slate-100 text-slate-600 border border-slate-200',
    },
  };
  const cfg = configs[status] ?? configs.pending;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.className}`}>
      {cfg.icon}
      {t(`status.${status}` as Parameters<typeof t>[0])}
    </span>
  );
}

export function PortalView({
  clientName,
  portalToken,
  termsAcceptedAt,
  officeName,
  documentRequests,
  uploads,
  propostas,
}: PortalViewProps) {
  const t = useTranslations('portal');
  const tCommon = useTranslations('common');

  const [showTerms, setShowTerms] = useState(!termsAcceptedAt);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [acceptingTerms, setAcceptingTerms] = useState(false);

  const [uploadingIds, setUploadingIds] = useState<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [replacingIds, setReplacingIds] = useState<Set<string>>(new Set());

  const [localUploads, setLocalUploads] = useState<PortalUpload[]>(uploads);
  const [localStatuses, setLocalStatuses] = useState<Record<string, string>>(
    Object.fromEntries(documentRequests.map((r) => [r.id, r.status]))
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeRequestIdRef = useRef<string | null>(null);

  function getUploadsForRequest(requestId: string) {
    return localUploads.filter((u) => u.document_request_id === requestId);
  }

  function triggerUpload(requestId: string) {
    activeRequestIdRef.current = requestId;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0 || !activeRequestIdRef.current) return;

    const requestId = activeRequestIdRef.current;
    activeRequestIdRef.current = null;

    setUploadingIds((prev) => new Set(prev).add(requestId));
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('request_id', requestId);

        const res = await fetch(`/api/portal/${portalToken}/upload`, {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          const data = (await res.json()) as { id: string };
          const newUpload: PortalUpload = {
            id: data.id ?? crypto.randomUUID(),
            document_request_id: requestId,
            file_name: file.name,
            storage_path: '',
            uploaded_at: new Date().toISOString(),
          };
          setLocalUploads((prev) => [...prev, newUpload]);
          setLocalStatuses((prev) => ({ ...prev, [requestId]: 'em_analise' }));
        } else {
          toast.error(tCommon('error'));
        }
      }
      toast.success(t('uploadSuccess'));
    } finally {
      setUploadingIds((prev) => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleDeleteUpload(uploadId: string, requestId: string) {
    setDeletingIds((prev) => new Set(prev).add(uploadId));
    try {
      const res = await fetch(`/api/portal/${portalToken}/uploads/${uploadId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        const { remaining } = (await res.json()) as { remaining: number };
        setLocalUploads((prev) => prev.filter((u) => u.id !== uploadId));
        setLocalStatuses((prev) => ({
          ...prev,
          [requestId]: remaining === 0 ? 'pending' : 'em_analise',
        }));
      } else {
        toast.error(tCommon('error'));
      }
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(uploadId);
        return next;
      });
    }
  }

  /** Delete all existing uploads for the request, then open the file dialog */
  async function handleReplaceFiles(requestId: string) {
    const existingUploads = getUploadsForRequest(requestId);
    setReplacingIds((prev) => new Set(prev).add(requestId));
    try {
      await Promise.all(
        existingUploads.map((u) =>
          fetch(`/api/portal/${portalToken}/uploads/${u.id}`, { method: 'DELETE' })
        )
      );
      setLocalUploads((prev) => prev.filter((u) => u.document_request_id !== requestId));
      setLocalStatuses((prev) => ({ ...prev, [requestId]: 'pending' }));
    } finally {
      setReplacingIds((prev) => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
    }
    // Open file picker after clearing
    triggerUpload(requestId);
  }

  async function handleAcceptTerms() {
    if (!termsAccepted) return;
    setAcceptingTerms(true);
    try {
      const res = await fetch(`/api/portal/${portalToken}/accept-terms`, { method: 'POST' });
      if (res.ok) {
        setShowTerms(false);
      } else {
        toast.error(tCommon('error'));
      }
    } finally {
      setAcceptingTerms(false);
    }
  }

  const pendingCount = documentRequests.filter((r) => {
    const status = localStatuses[r.id] ?? r.status;
    return status === 'pending' || status === 'rejected';
  }).length;

  // Terms screen
  if (showTerms) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-blue-500 to-blue-600" />
          <div className="p-6 sm:p-8">
            <div className="flex items-center gap-2.5 mb-6">
              <div className="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center text-white">
                <HomeFluxLogoMark size={20} />
              </div>
              <span className="font-bold text-slate-900 text-base">{officeName || 'HomeFlux'}</span>
            </div>

            <h1 className="text-xl font-bold text-slate-900 mb-1">{t('termsTitle')}</h1>
            <p className="text-sm text-slate-500 mb-5">{t('termsSubtitle')}</p>

            <div className="bg-slate-50 rounded-xl p-4 h-44 overflow-y-auto text-sm text-slate-600 leading-relaxed mb-5 border border-slate-100">
              <p className="font-semibold text-slate-800 mb-2">{t('termsHeader')}</p>
              <p>{t('termsBody')}</p>
            </div>

            <label className="flex items-start gap-3 cursor-pointer mb-5">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
              />
              <span className="text-sm text-slate-700">{t('termsCheckbox')}</span>
            </label>

            <button
              className="w-full h-10 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition-colors"
              disabled={!termsAccepted || acceptingTerms}
              onClick={handleAcceptTerms}
            >
              {acceptingTerms ? tCommon('loading') : t('acceptAndContinue')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white shrink-0">
              <HomeFluxLogoMark size={18} />
            </div>
            <div>
              <p className="font-bold text-[13px] text-slate-900 leading-none">{officeName || 'HomeFlux'}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{t('welcome', { name: clientName })}</p>
            </div>
          </div>
          {pendingCount > 0 && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full">
              <AlertCircle className="h-3.5 w-3.5" />
              {pendingCount} {t('pendingDocs')}
            </span>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <Tabs defaultValue="documents">
          <TabsList className="bg-white border border-slate-200 rounded-xl p-1 gap-0.5 h-auto w-full mb-4">
            <TabsTrigger
              value="documents"
              className="flex-1 rounded-lg text-sm font-medium py-1.5 text-slate-500 data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all"
            >
              {t('documentsTab')}
              {pendingCount > 0 && (
                <span className="ml-1.5 bg-amber-500 text-white text-[10px] font-bold rounded-full w-4 h-4 inline-flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="propostas"
              className="flex-1 rounded-lg text-sm font-medium py-1.5 text-slate-500 data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all"
            >
              {t('propostasTab')}
              {propostas.length > 0 && (
                <span className="ml-1.5 bg-blue-500 text-white text-[10px] font-bold rounded-full w-4 h-4 inline-flex items-center justify-center">
                  {propostas.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-2.5">
            {documentRequests.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl py-14 text-center">
                <FileText className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                <p className="text-sm text-slate-400">{t('noDocuments')}</p>
              </div>
            ) : (
              documentRequests.map((req) => {
                const status = localStatuses[req.id] ?? req.status;
                const reqUploads = getUploadsForRequest(req.id);
                const isUploading = uploadingIds.has(req.id);
                const isReplacing = replacingIds.has(req.id);

                return (
                  <div key={req.id} className="bg-white border border-slate-200 rounded-xl p-4">
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <p className="font-medium text-sm text-slate-900 leading-snug">{req.label}</p>
                      <StatusChip status={status} />
                    </div>

                    {/* Rejection reason */}
                    {status === 'rejected' && req.broker_notes && (
                      <div className="mb-3 flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                        <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-red-700">{req.broker_notes}</p>
                      </div>
                    )}

                    {/* Uploaded files list */}
                    {reqUploads.length > 0 && (
                      <div className="mb-3 space-y-1.5">
                        {reqUploads.map((u) => (
                          <div key={u.id} className="flex items-center gap-2 text-xs">
                            {status === 'approved' ? (
                              <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                            ) : (
                              <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            )}
                            <span className="truncate max-w-[220px] text-slate-700">
                              {u.file_name ?? u.storage_path.split('/').pop()}
                            </span>
                            <span className="shrink-0 text-slate-400">· {formatDate(u.uploaded_at)}</span>
                            {status === 'em_analise' && (
                              <button
                                onClick={() => handleDeleteUpload(u.id, req.id)}
                                disabled={deletingIds.has(u.id)}
                                className="ml-auto shrink-0 text-slate-400 hover:text-red-500 disabled:opacity-40 transition-colors"
                                aria-label={t('deleteFile')}
                              >
                                {deletingIds.has(u.id) ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
                                )}
                              </button>
                            )}
                          </div>
                        ))}

                        {/* File count — only shown when max_files > 1 */}
                        {req.max_files > 1 && (
                          <p className="text-[11px] text-slate-400 mt-1">
                            {t('filesCount', { count: reqUploads.length, max: req.max_files })}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex items-center gap-2">
                      {/* Upload button: only for pending or rejected */}
                      {(status === 'pending' || status === 'rejected') && (
                        <button
                          onClick={() => triggerUpload(req.id)}
                          disabled={isUploading}
                          className="flex items-center gap-1.5 h-8 px-3 text-xs font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                        >
                          {isUploading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Upload className="h-3.5 w-3.5" />
                          )}
                          {status === 'rejected' ? t('uploadAgain') : t('upload')}
                        </button>
                      )}

                      {/* Substituir ficheiro: only for em_analise */}
                      {status === 'em_analise' && (
                        <button
                          onClick={() => handleReplaceFiles(req.id)}
                          disabled={isReplacing || isUploading}
                          className="flex items-center gap-1.5 h-8 px-3 text-xs font-medium bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-slate-600 rounded-lg transition-colors"
                        >
                          {isReplacing ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3.5 w-3.5" />
                          )}
                          {t('substituirFicheiro')}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </TabsContent>

          {/* Propostas Tab */}
          <TabsContent value="propostas" className="space-y-6">
            {propostas.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl py-14 text-center">
                <FileText className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                <p className="text-sm text-slate-400">{t('noPropostas')}</p>
              </div>
            ) : (
              propostas.map((proposta, idx) => (
                <div key={proposta.id} className={idx > 0 ? 'pt-6 border-t border-slate-200' : ''}>
                  <PortalPropostaCard proposta={proposta} portalToken={portalToken} />
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Hidden file input — multiple allowed */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileSelected}
        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
      />
    </div>
  );
}
