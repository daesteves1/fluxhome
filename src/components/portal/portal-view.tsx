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
import { PropostasCharts } from '@/components/propostas/propostas-charts';
import type { BankProposta, MapaComparativo } from '@/types/proposta';
import { calcTotalRecomendado, calcPrestacaoTotalBanco, calcPrestacaoTotalExterno, getRecomendadaLabel, fmtEur, fmtPct } from '@/types/proposta';
import type { PlatformSettings } from '@/lib/settings';
import { PLATFORM_DEFAULTS } from '@/lib/settings';

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

function SummaryCards({ propostas, recommendedId, hasP2 }: { propostas: BankProposta[]; recommendedId: string | null; hasP2: boolean }) {
  const minMonthly = Math.min(...propostas.map((p) => calcTotalRecomendado(p, hasP2)).filter((v) => v > 0));

  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
      {propostas.map((p) => {
        const isRec = p.id === recommendedId;
        const totalRec = calcTotalRecomendado(p, hasP2);
        const recLabel = getRecomendadaLabel(p, hasP2);
        const initials = p.bank_name.split(/\s+/).map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

        const now = new Date();
        const expiryDate = p.validade_ate ? new Date(p.validade_ate) : null;
        const isExpired = expiryDate ? expiryDate < now : false;
        const daysUntilExpiry = expiryDate && !isExpired
          ? Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          : null;
        const expiresSoon = daysUntilExpiry !== null && daysUntilExpiry <= 14;
        const isLowestPayment = totalRec > 0 && totalRec === minMonthly;

        const MONTHS_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
        const fmtDate = (s: string) => {
          const [y, m, d] = s.split('-').map(Number);
          return `${d} ${MONTHS_PT[m-1]} ${y}`;
        };

        let borderClass = 'border border-slate-200';
        if (isRec) borderClass = 'border-2 border-blue-500 shadow-md';
        else if (isExpired) borderClass = 'border border-slate-200 border-l-4 border-l-red-400';
        else if (isLowestPayment) borderClass = 'border border-slate-200 border-l-4 border-l-green-500';

        return (
          <div key={p.id} className={`rounded-xl bg-white p-4 ${borderClass}`}>
            {/* Recommended badge */}
            {isRec && (
              <div className="mb-3">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-blue-600 rounded-full px-2.5 py-1 w-full justify-center">
                  <Star className="h-3 w-3 fill-current" />
                  Recomendado
                </span>
              </div>
            )}

            {/* Header: logo + name + rate type */}
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 text-white ${isRec ? 'bg-blue-600' : 'bg-[#1E3A5F]'}`}>
                  {initials}
                </div>
                <p className="font-bold text-base text-slate-900 leading-tight">{p.bank_name}</p>
              </div>
              {p.rate_type && (
                <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded shrink-0">
                  {p.rate_type === 'variavel' ? 'Variável' : p.rate_type === 'fixa' ? 'Fixa' : 'Mista'}
                </span>
              )}
            </div>

            {/* Total recomendado */}
            {totalRec > 0 && (
              <div className="mb-3">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Prestação recomendada</p>
                <p className={`text-3xl font-bold ${isRec ? 'text-blue-700' : 'text-slate-900'}`}>
                  {fmtEur(totalRec)}<span className="text-sm font-normal text-slate-400">/mês</span>
                </p>
                {recLabel && (
                  <p className="text-[10px] text-slate-400 mt-0.5">{recLabel}</p>
                )}
              </div>
            )}

            {/* Prestação base (secondary) */}
            {p.monthly_payment && p.monthly_payment > 0 && (
              <div className="bg-slate-50 rounded-lg p-2 mb-3">
                <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Prestação base</p>
                <p className="text-sm font-bold text-slate-800">{fmtEur(p.monthly_payment)}<span className="text-[10px] font-normal text-slate-400">/mês</span></p>
              </div>
            )}

            <div className="h-px bg-slate-100 mb-3" />

            {/* Rate metrics */}
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 mb-2">
              {p.tan && <span>TAN: <strong className="text-slate-700">{fmtPct(p.tan)}</strong></span>}
              {p.taeg && <span>TAEG: <strong className="text-slate-700">{fmtPct(p.taeg)}</strong></span>}
              {p.spread && <span>Spread: <strong className="text-slate-700">{fmtPct(p.spread)}</strong></span>}
            </div>

            {/* Conditions */}
            {p.condicoes_spread && p.condicoes_spread.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {p.condicoes_spread.slice(0, 3).map((c: string) => (
                  <span key={c} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{c}</span>
                ))}
                {p.condicoes_spread.length > 3 && (
                  <span className="text-[10px] text-slate-400">+{p.condicoes_spread.length - 3} mais</span>
                )}
              </div>
            )}

            {/* Validity */}
            {p.validade_ate && (
              <p className={`text-[11px] ${isExpired ? 'text-red-600 font-medium' : expiresSoon ? 'text-amber-600 font-medium' : 'text-slate-400'}`}>
                {isExpired ? '⚠ Expirada' : expiresSoon ? `⚠ Expira em ${daysUntilExpiry} dias` : `Válida até ${fmtDate(p.validade_ate)}`}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Portal Mapa Card ──────────────────────────────────────────────────────────

function PortalMapaCard({
  mapa,
  propostas,
  portalToken,
  currentChoice,
  onChoiceSaved,
  p2Name,
  chartsEnabled = true,
}: {
  mapa: MapaComparativo;
  propostas: BankProposta[];
  portalToken: string;
  currentChoice: PropostaChoice;
  onChoiceSaved: (c: PropostaChoice) => void;
  p2Name: string | null;
  chartsEnabled?: boolean;
}) {
  const hasP2 = Boolean(p2Name);
  const anyChoice = currentChoice !== null && propostas.some((p) => p.id === currentChoice?.proposta_id);
  const [editing, setEditing] = useState(false);
  const [selectedBankId, setSelectedBankId] = useState<string>(anyChoice ? (currentChoice?.proposta_id ?? '') : '');
  const [insuranceChoice, setInsuranceChoice] = useState<'banco' | 'externa' | ''>(anyChoice ? (currentChoice?.insurance_choice ?? '') : '');
  const [notes, setNotes] = useState('');
  const [confirming, setConfirming] = useState(false);

  const selectedBank = propostas.find((p) => p.id === selectedBankId);
  const hasChart = chartsEnabled && propostas.some((p) => (p.monthly_payment ?? 0) > 0 || (p.spread ?? 0) > 0);
  const showChoiceForm = !anyChoice || editing;

  async function handleConfirmChoice() {
    if (!selectedBankId || !insuranceChoice || !selectedBank) return;
    setConfirming(true);
    try {
      const res = await fetch(`/api/portal/${portalToken}/proposta-choice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposta_id: selectedBankId, bank_name: selectedBank.bank_name, insurance_choice: insuranceChoice }),
      });
      if (res.ok) {
        onChoiceSaved({ proposta_id: selectedBankId, bank_name: selectedBank.bank_name, insurance_choice: insuranceChoice, confirmed_at: new Date().toISOString() });
        setEditing(false);
      }
    } finally {
      setConfirming(false);
    }
  }

  const insuranceLabel = currentChoice?.insurance_choice === 'banco' ? 'seguros do banco' : 'seguros externos';
  const choiceBank = propostas.find((p) => p.id === currentChoice?.proposta_id);
  const choiceMonthly = choiceBank
    ? (currentChoice?.insurance_choice === 'banco' ? calcPrestacaoTotalBanco(choiceBank) : calcPrestacaoTotalExterno(choiceBank))
    : 0;

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <SummaryCards propostas={propostas} recommendedId={mapa.recommended_proposta_id} hasP2={hasP2} />

      {/* Comparison table */}
      <ComparisonTable propostas={propostas} recommendedId={mapa.recommended_proposta_id} hasP2={hasP2} />

      {/* Charts section */}
      {hasChart && (
        <div className="border-t border-slate-200 pt-6">
          <p className="text-base font-bold text-slate-900 mb-1">Análise Comparativa</p>
          <p className="text-xs text-slate-500 mb-4">Visualize e compare as propostas para tomar a melhor decisão</p>
          <PropostasCharts propostas={propostas} recommendedId={mapa.recommended_proposta_id} />
        </div>
      )}

      {/* Broker notes */}
      {mapa.broker_notes && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <p className="text-xs font-semibold text-blue-500 uppercase tracking-wide mb-1.5">Notas do mediador</p>
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{mapa.broker_notes}</p>
        </div>
      )}

      {/* Client choice section */}
      <div className="max-w-[600px] mx-auto bg-white rounded-xl border border-slate-200 p-5">
        <p className="text-base font-bold text-slate-800 mb-1">A minha preferência</p>
        <p className="text-xs text-slate-500 mb-4">Indique ao seu mediador qual a proposta que prefere. Isto não é vinculativo.</p>

        {/* Success state */}
        {anyChoice && !editing && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-3">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-green-800">Preferência guardada</p>
                <p className="text-sm text-green-700 mt-0.5">
                  Optou por <strong>{currentChoice!.bank_name}</strong> com {insuranceLabel}
                  {choiceMonthly > 0 && ` — ${fmtEur(choiceMonthly)}/mês`}
                </p>
              </div>
            </div>
            <button onClick={() => setEditing(true)} className="mt-2 text-xs text-green-600 hover:text-green-800 underline">
              Alterar preferência
            </button>
          </div>
        )}

        {/* Bank selection form */}
        {showChoiceForm && (
          <div className="space-y-4">
            {/* Bank cards */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Escolha o banco</p>
              <div className="overflow-x-auto">
                <div className="flex gap-3 pb-2" style={{ minWidth: 'max-content' }}>
                  {propostas.map((p) => {
                    const isRec = p.id === mapa.recommended_proposta_id;
                    const total = calcPrestacaoTotalBanco(p);
                    const initials = p.bank_name.split(/\s+/).map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
                    const isSelected = selectedBankId === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => { setSelectedBankId(p.id); setInsuranceChoice(''); }}
                        className={`flex flex-col items-center p-3 rounded-xl border-2 w-[130px] shrink-0 transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold text-white mb-2 ${isSelected ? 'bg-blue-600' : 'bg-[#1E3A5F]'}`}>
                          {initials}
                          {isSelected && (
                            <CheckCircle className="h-4 w-4 absolute text-blue-600" />
                          )}
                        </div>
                        <p className="text-xs font-semibold text-slate-800 text-center leading-tight mb-1">{p.bank_name}</p>
                        {total > 0 && <p className="text-[10px] text-slate-500">{fmtEur(total)}/mês</p>}
                        {isRec && <span className="text-[9px] font-bold text-blue-600 mt-1">★ Recomendado</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Insurance choice */}
            {selectedBankId && selectedBank && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Tipo de seguros</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { value: 'banco' as const, label: 'Seguros do banco', sublabel: 'Fornecidos pelo banco credor', total: calcPrestacaoTotalBanco(selectedBank) },
                    { value: 'externa' as const, label: 'Seguros externos', sublabel: 'Ex: Asisa, Lusitania', total: calcPrestacaoTotalExterno(selectedBank) },
                  ].map(({ value, label, sublabel, total }) => (
                    <button
                      key={value}
                      onClick={() => setInsuranceChoice(value)}
                      className={`flex flex-col items-start p-3 rounded-xl border-2 transition-all text-left ${
                        insuranceChoice === value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {insuranceChoice === value
                          ? <CheckCircle className="h-4 w-4 text-blue-600 shrink-0" />
                          : <div className="h-4 w-4 rounded-full border-2 border-slate-300 shrink-0" />
                        }
                        <p className="text-sm font-semibold text-slate-800">{label}</p>
                      </div>
                      <p className="text-[11px] text-slate-500 pl-6">{sublabel}</p>
                      {total > 0 && <p className="text-sm font-bold text-slate-900 pl-6 mt-1">{fmtEur(total)}/mês</p>}
                      {(selectedBank.manutencao_conta ?? 0) > 0 && (
                        <p className="text-[10px] text-slate-400 pl-6 mt-0.5">Manutenção de conta: {fmtEur(selectedBank.manutencao_conta)}/mês</p>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Optional notes */}
            {selectedBankId && insuranceChoice && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Observações (opcional)</p>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Tem alguma questão ou comentário para o seu mediador?"
                  className="w-full text-sm border border-slate-200 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
                  rows={2}
                />
              </div>
            )}

            {/* Submit */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleConfirmChoice}
                disabled={!selectedBankId || !insuranceChoice || confirming}
                className="flex-1 sm:flex-none h-10 px-6 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors inline-flex items-center justify-center gap-2"
              >
                {confirming && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Confirmar preferência
              </button>
              {editing && (
                <button onClick={() => setEditing(false)} className="text-xs text-slate-400 hover:text-slate-600">
                  Cancelar
                </button>
              )}
            </div>
          </div>
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
  settings?: PlatformSettings;
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
  settings,
}: PortalViewProps) {
  const effectiveSettings = settings ?? PLATFORM_DEFAULTS;
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

      <main className="w-full py-6">
        <Tabs defaultValue={effectiveSettings.documents_tab_enabled ? 'documents' : 'propostas'}>
          {(effectiveSettings.documents_tab_enabled && effectiveSettings.propostas_tab_enabled) && (
          <div className="max-w-2xl mx-auto px-4">
          <TabsList className="bg-white border border-slate-200 rounded-xl p-1 gap-0.5 h-auto w-full mb-4">
            {effectiveSettings.documents_tab_enabled && (
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
            )}
            {effectiveSettings.propostas_tab_enabled && (
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
            )}
          </TabsList>
          </div>
          )}



          {/* Documents Tab */}
          <TabsContent value="documents">
            <div className="max-w-[680px] mx-auto px-4 space-y-3">
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
            </div>
          </TabsContent>

          {/* Propostas Tab */}
          <TabsContent value="propostas">
            <div className="max-w-[1280px] mx-auto px-4 md:px-6 space-y-6">
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
                p2Name={p2Name}
                chartsEnabled={effectiveSettings.charts_enabled}
              />
            )}
            </div>
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
