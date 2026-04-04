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
  Loader2,
  RefreshCw,
  Star,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import { HomeFluxLogoMark } from '@/components/layout/homeflux-logo';
import { ComparisonTable } from '@/components/propostas/comparison-table';
import type { BankProposta, MapaComparativo } from '@/types/proposta';
import { calcSubtotalBanco, calcSubtotalExterno, fmtEur, fmtPct } from '@/types/proposta';

type DocRequest = {
  id: string;
  label: string;
  status: string;
  broker_notes: string | null;
  max_files: number;
  created_at: string;
  proponente: string;
  is_mandatory: boolean;
};

type PortalUpload = {
  id: string;
  document_request_id: string;
  file_name: string | null;
  storage_path: string;
  uploaded_at: string;
};

type PropostaChoice = {
  proposta_id: string;  // bank_proposta id
  bank_name: string;
  insurance_choice: 'banco' | 'externa';
  confirmed_at: string;
} | null;

// ─── Summary Cards ────────────────────────────────────────────────────────────

function SummaryCards({ propostas, recommendedId }: { propostas: BankProposta[]; recommendedId: string | null }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {propostas.map((p) => {
        const isRec = p.id === recommendedId;
        const subBanco = calcSubtotalBanco(p);
        const subExt = calcSubtotalExterno(p);
        return (
          <div key={p.id} className={`rounded-xl border p-4 ${isRec ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white'}`}>
            <div className="flex items-start justify-between gap-2 mb-2">
              <p className="font-bold text-base text-slate-900">{p.bank_name}</p>
              {isRec && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-100 rounded-full px-2 py-0.5 shrink-0">
                  <Star className="h-3 w-3 fill-current" />
                  Recomendado
                </span>
              )}
            </div>
            {subBanco > 0 && (
              <div className="mt-1">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Com seguros banco</p>
                <p className={`text-2xl font-bold mt-0.5 ${isRec ? 'text-blue-700' : 'text-slate-900'}`}>
                  {fmtEur(subBanco)}<span className="text-sm font-normal text-slate-400">/mês</span>
                </p>
              </div>
            )}
            {subExt > 0 && (
              <p className="text-xs text-slate-500 mt-1">Com seguros externos: {fmtEur(subExt)}/mês</p>
            )}
            {p.tan && <p className="text-xs text-slate-500 mt-0.5">TAN: {fmtPct(p.tan)}</p>}
          </div>
        );
      })}
    </div>
  );
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────

function BarChart({ propostas, recommendedId }: { propostas: BankProposta[]; recommendedId: string | null }) {
  const values = propostas.map((p) => p.monthly_payment ?? 0);
  const max = Math.max(...values, 1);
  const barH = 28;
  const gap = 10;
  const labelW = 80;
  const barMaxW = 160;
  const valW = 80;
  const rowH = barH + gap;
  const svgH = propostas.length * rowH + 4;

  return (
    <svg width="100%" height={svgH} viewBox={`0 0 ${labelW + barMaxW + valW + 16} ${svgH}`} className="overflow-visible">
      {propostas.map((p, i) => {
        const val = values[i];
        const bw = val > 0 ? (val / max) * barMaxW : 0;
        const y = i * rowH;
        const isRec = p.id === recommendedId;
        const fill = isRec ? '#3b82f6' : '#94a3b8';
        return (
          <g key={p.id} transform={`translate(0,${y})`}>
            <text x={labelW - 6} y={barH / 2 + 4} textAnchor="end" fontSize="11" fill="#64748b" fontWeight={isRec ? '600' : '400'}>
              {p.bank_name}
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

// ─── Portal Mapa Card ──────────────────────────────────────────────────────────

function PortalMapaCard({
  mapa,
  propostas,
  portalToken,
  currentChoice,
  onChoiceSaved,
}: {
  mapa: MapaComparativo;
  propostas: BankProposta[];
  portalToken: string;
  currentChoice: PropostaChoice;
  onChoiceSaved: (c: PropostaChoice) => void;
}) {
  const isMyChoice = (pid: string) => currentChoice?.proposta_id === pid;
  const anyChoice = currentChoice !== null && propostas.some((p) => isMyChoice(p.id));

  const [selectedBankId, setSelectedBankId] = useState<string>(
    anyChoice ? (currentChoice?.proposta_id ?? '') : ''
  );
  const [insuranceChoice, setInsuranceChoice] = useState<'banco' | 'externa' | ''>(
    anyChoice ? (currentChoice?.insurance_choice ?? '') : ''
  );
  const [confirming, setConfirming] = useState(false);

  const selectedBank = propostas.find((p) => p.id === selectedBankId);
  const hasChart = propostas.some((p) => (p.monthly_payment ?? 0) > 0);

  async function handleConfirmChoice() {
    if (!selectedBankId || !insuranceChoice || !selectedBank) return;
    setConfirming(true);
    try {
      const res = await fetch(`/api/portal/${portalToken}/proposta-choice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposta_id: selectedBankId,
          bank_name: selectedBank.bank_name,
          insurance_choice: insuranceChoice,
        }),
      });
      if (res.ok) {
        onChoiceSaved({
          proposta_id: selectedBankId,
          bank_name: selectedBank.bank_name,
          insurance_choice: insuranceChoice,
          confirmed_at: new Date().toISOString(),
        });
      }
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <SummaryCards propostas={propostas} recommendedId={mapa.recommended_proposta_id} />

      {/* Comparison table */}
      <ComparisonTable propostas={propostas} recommendedId={mapa.recommended_proposta_id} />

      {/* Bar chart */}
      {hasChart && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">Prestação mensal (sem seguros)</p>
          <BarChart propostas={propostas} recommendedId={mapa.recommended_proposta_id} />
        </div>
      )}

      {/* Broker notes */}
      {mapa.broker_notes && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <p className="text-xs font-semibold text-blue-500 uppercase tracking-wide mb-1.5">Notas do mediador</p>
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{mapa.broker_notes}</p>
        </div>
      )}

      {/* A minha escolha */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <p className="text-sm font-semibold text-slate-800 mb-4">A minha escolha</p>

        {/* Bank selector */}
        <div className="mb-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Banco</p>
          <div className="space-y-2">
            {propostas.map((p) => {
              const isRec = p.id === mapa.recommended_proposta_id;
              return (
                <label key={p.id} className="flex items-center gap-2.5 cursor-pointer group">
                  <input
                    type="radio"
                    name="bank-choice"
                    value={p.id}
                    checked={selectedBankId === p.id}
                    onChange={() => setSelectedBankId(p.id)}
                    className="h-4 w-4 text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="text-sm text-slate-700 group-hover:text-slate-900">{p.bank_name}</span>
                  {isRec && <Star className="h-3.5 w-3.5 text-amber-500 shrink-0 fill-current" />}
                </label>
              );
            })}
          </div>
        </div>

        {/* Insurance choice */}
        <div className="mb-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Seguros</p>
          <div className="space-y-2">
            {(['banco', 'externa'] as const).map((opt) => (
              <label key={opt} className="flex items-center gap-2.5 cursor-pointer group">
                <input
                  type="radio"
                  name="insurance-choice"
                  value={opt}
                  checked={insuranceChoice === opt}
                  onChange={() => setInsuranceChoice(opt)}
                  className="h-4 w-4 text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                />
                <span className="text-sm text-slate-700 group-hover:text-slate-900">
                  {opt === 'banco' ? 'Seguros do banco' : 'Seguros externos (Asisa)'}
                </span>
              </label>
            ))}
          </div>
        </div>

        {anyChoice ? (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-3 py-1">
              <CheckCircle className="h-3.5 w-3.5" />
              Escolha confirmada — {currentChoice!.bank_name}
            </span>
            <button
              onClick={() => { setSelectedBankId(''); setInsuranceChoice(''); onChoiceSaved(null); }}
              className="text-xs text-slate-400 hover:text-slate-600 underline"
            >
              Alterar
            </button>
          </div>
        ) : (
          <button
            onClick={handleConfirmChoice}
            disabled={!selectedBankId || !insuranceChoice || confirming}
            className="h-9 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors inline-flex items-center gap-2"
          >
            {confirming && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Confirmar escolha
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Status Chip ──────────────────────────────────────────────────────────────

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

// ─── Portal View ──────────────────────────────────────────────────────────────

interface PortalViewProps {
  clientName: string;
  p2Name: string | null;
  portalToken: string;
  termsAcceptedAt: string | null;
  officeName: string;
  documentRequests: DocRequest[];
  uploads: PortalUpload[];
  mapa: MapaComparativo | null;
  bankPropostas: BankProposta[];
  propostaChoice: unknown;
}

export function PortalView({
  clientName,
  p2Name,
  portalToken,
  termsAcceptedAt,
  officeName,
  documentRequests,
  uploads,
  mapa,
  bankPropostas,
  propostaChoice,
}: PortalViewProps) {
  const t = useTranslations('portal');
  const tCommon = useTranslations('common');

  const [showTerms, setShowTerms] = useState(!termsAcceptedAt);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [acceptingTerms, setAcceptingTerms] = useState(false);
  const [savedChoice, setSavedChoice] = useState<PropostaChoice>(propostaChoice as PropostaChoice ?? null);

  const [uploadingIds, setUploadingIds] = useState<Set<string>>(new Set());
  const [replacingIds, setReplacingIds] = useState<Set<string>>(new Set());

  const [localUploads, setLocalUploads] = useState<PortalUpload[]>(uploads);
  const [localStatuses, setLocalStatuses] = useState<Record<string, string>>(
    Object.fromEntries(documentRequests.map((r) => [r.id, r.status]))
  );
  const [localBrokerNotes, setLocalBrokerNotes] = useState<Record<string, string | null>>(
    Object.fromEntries(documentRequests.map((r) => [r.id, r.broker_notes]))
  );

  // Sub-navigation: which proponente to show
  const hasP2 = Boolean(p2Name);
  const [activeProponente, setActiveProponente] = useState<'p1' | 'p2' | 'shared'>('p1');

  // Collapsed approved section
  const [approvedExpanded, setApprovedExpanded] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const activeRequestIdRef = useRef<string | null>(null);
  const replaceRequestIdRef = useRef<string | null>(null);

  // Ordered bank propostas for the mapa
  const orderedPropostas = mapa
    ? (mapa.proposta_ids
        .map((pid) => bankPropostas.find((p) => p.id === pid))
        .filter(Boolean) as BankProposta[])
    : [];

  const hasVisibleMapa = mapa && mapa.is_visible_to_client && orderedPropostas.length > 0;

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

  function handleReplaceClick(requestId: string) {
    replaceRequestIdRef.current = requestId;
    if (replaceInputRef.current) {
      replaceInputRef.current.value = '';
      replaceInputRef.current.click();
    }
  }

  async function handleReplaceFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !replaceRequestIdRef.current) return;
    const requestId = replaceRequestIdRef.current;
    replaceRequestIdRef.current = null;

    setReplacingIds((prev) => new Set(prev).add(requestId));
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('request_id', requestId);

      const res = await fetch(`/api/portal/${portalToken}/replace-upload`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = (await res.json()) as { id: string };
        setLocalUploads((prev) => [
          ...prev.filter((u) => u.document_request_id !== requestId),
          {
            id: data.id,
            document_request_id: requestId,
            file_name: file.name,
            storage_path: '',
            uploaded_at: new Date().toISOString(),
          },
        ]);
        setLocalStatuses((prev) => ({ ...prev, [requestId]: 'em_analise' }));
        setLocalBrokerNotes((prev) => ({ ...prev, [requestId]: null }));
        toast.success(t('uploadSuccess'));
      } else {
        toast.error(tCommon('error'));
      }
    } finally {
      setReplacingIds((prev) => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
      if (replaceInputRef.current) replaceInputRef.current.value = '';
    }
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
              {hasVisibleMapa && (
                <span className="ml-1.5 bg-blue-500 text-white text-[10px] font-bold rounded-full w-4 h-4 inline-flex items-center justify-center">
                  {orderedPropostas.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-3">
            {/* Sub-navigation for multi-proponente */}
            {hasP2 && (
              <div className="flex rounded-xl bg-white border border-slate-200 p-1 gap-0.5">
                {(['p1', 'p2', 'shared'] as const).map((tab) => {
                  const label = tab === 'p1' ? clientName : tab === 'p2' ? p2Name! : 'Partilhados';
                  const pendingForTab = documentRequests.filter((r) => {
                    const s = localStatuses[r.id] ?? r.status;
                    return r.proponente === tab && (s === 'pending' || s === 'rejected');
                  }).length;
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveProponente(tab)}
                      className={`flex-1 text-xs font-medium py-1.5 rounded-lg transition-colors ${
                        activeProponente === tab
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {label}
                      {pendingForTab > 0 && (
                        <span className={`ml-1.5 text-[10px] font-bold rounded-full w-4 h-4 inline-flex items-center justify-center ${
                          activeProponente === tab ? 'bg-amber-400 text-slate-900' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {pendingForTab}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Document cards */}
            {(() => {
              const filtered = hasP2
                ? documentRequests.filter((r) => r.proponente === activeProponente)
                : documentRequests;

              if (filtered.length === 0) {
                return (
                  <div className="bg-white border border-slate-200 rounded-xl py-14 text-center">
                    <FileText className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-sm text-slate-400">{t('noDocuments')}</p>
                  </div>
                );
              }

              const statusOrder: Record<string, number> = { rejected: 0, pending: 1, em_analise: 2, approved: 3 };
              const sorted = [...filtered].sort((a, b) => {
                const sa = localStatuses[a.id] ?? a.status;
                const sb = localStatuses[b.id] ?? b.status;
                return (statusOrder[sa] ?? 1) - (statusOrder[sb] ?? 1);
              });

              const activeDocs = sorted.filter((r) => (localStatuses[r.id] ?? r.status) !== 'approved');
              const approvedDocs = sorted.filter((r) => (localStatuses[r.id] ?? r.status) === 'approved');

              return (
                <div className="space-y-2.5">
                  {activeDocs.map((req) => {
                    const status = localStatuses[req.id] ?? req.status;
                    const reqUploads = getUploadsForRequest(req.id);
                    const isUploading = uploadingIds.has(req.id);
                    const isReplacing = replacingIds.has(req.id);
                    const brokerNote = localBrokerNotes[req.id] ?? req.broker_notes;

                    return (
                      <div
                        key={req.id}
                        className={`bg-white border rounded-xl p-4 ${
                          status === 'rejected' ? 'border-red-200' : 'border-slate-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-slate-900 leading-snug">{req.label}</p>
                            {req.is_mandatory && (
                              <span className="text-[10px] text-slate-400 font-medium">Obrigatório</span>
                            )}
                          </div>
                          <StatusChip status={status} />
                        </div>

                        {/* REJECTED */}
                        {status === 'rejected' && (
                          <>
                            {brokerNote && (
                              <div className="mb-3 flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                                <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                                <p className="text-xs text-red-700">{brokerNote}</p>
                              </div>
                            )}
                            <button
                              onClick={() => triggerUpload(req.id)}
                              disabled={isUploading}
                              className="w-full sm:w-auto flex items-center justify-center gap-1.5 h-9 px-4 text-sm font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                            >
                              {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                              {t('uploadAgain')}
                            </button>
                          </>
                        )}

                        {/* PENDING */}
                        {status === 'pending' && (
                          <>
                            <p className="text-xs text-slate-400 mb-3">PDF, JPG, PNG · Máx. 15MB</p>
                            <button
                              onClick={() => triggerUpload(req.id)}
                              disabled={isUploading}
                              className="w-full sm:w-auto flex items-center justify-center gap-1.5 h-9 px-4 text-sm font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                            >
                              {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                              {t('upload')}
                            </button>
                          </>
                        )}

                        {/* EM_ANALISE */}
                        {status === 'em_analise' && (
                          <>
                            {reqUploads.length > 0 && (
                              <div className="mb-3 space-y-1.5">
                                {reqUploads.map((u) => (
                                  <div key={u.id} className="flex items-center gap-2 text-xs text-slate-600">
                                    <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                    <span className="truncate">{u.file_name ?? u.storage_path.split('/').pop()}</span>
                                    <span className="shrink-0 text-slate-400">· {formatDate(u.uploaded_at)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => handleReplaceClick(req.id)}
                                disabled={isReplacing || isUploading}
                                className="flex items-center gap-1.5 h-8 px-3 text-xs font-medium bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-slate-600 rounded-lg transition-colors"
                              >
                                {isReplacing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                                {t('substituirFicheiro')}
                              </button>
                              <p className="text-xs text-slate-400">Em análise pelo mediador</p>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}

                  {/* Approved section — collapsible */}
                  {approvedDocs.length > 0 && (
                    <div>
                      <button
                        onClick={() => setApprovedExpanded((v) => !v)}
                        className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl hover:bg-emerald-100 transition-colors"
                      >
                        <span className="flex items-center gap-1.5">
                          <CheckCircle className="h-4 w-4" />
                          {approvedDocs.length} documento{approvedDocs.length !== 1 ? 's' : ''} aprovado{approvedDocs.length !== 1 ? 's' : ''}
                        </span>
                        <span className="text-emerald-500 text-base leading-none">{approvedExpanded ? '▲' : '▼'}</span>
                      </button>

                      {approvedExpanded && (
                        <div className="mt-1.5 space-y-1.5">
                          {approvedDocs.map((req) => {
                            const reqUploads = getUploadsForRequest(req.id);
                            return (
                              <div key={req.id} className="bg-white border border-emerald-100 rounded-xl p-4 opacity-75">
                                <div className="flex items-start justify-between gap-3 mb-2">
                                  <p className="font-medium text-sm text-slate-700">{req.label}</p>
                                  <StatusChip status="approved" />
                                </div>
                                {reqUploads.length > 0 && (
                                  <div className="space-y-1">
                                    {reqUploads.map((u) => (
                                      <div key={u.id} className="flex items-center gap-2 text-xs text-slate-500">
                                        <CheckCircle className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                                        <span className="truncate">{u.file_name ?? u.storage_path.split('/').pop()}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
          </TabsContent>

          {/* Propostas Tab */}
          <TabsContent value="propostas" className="space-y-6">
            {!hasVisibleMapa ? (
              <div className="bg-white border border-slate-200 rounded-xl py-14 text-center">
                <FileText className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                <p className="text-sm text-slate-400">{t('noPropostas')}</p>
              </div>
            ) : (
              <PortalMapaCard
                mapa={mapa!}
                propostas={orderedPropostas}
                portalToken={portalToken}
                currentChoice={savedChoice}
                onChoiceSaved={setSavedChoice}
              />
            )}
          </TabsContent>
        </Tabs>
      </main>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileSelected}
        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
      />
      <input
        ref={replaceInputRef}
        type="file"
        className="hidden"
        onChange={handleReplaceFileSelected}
        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
      />
    </div>
  );
}
