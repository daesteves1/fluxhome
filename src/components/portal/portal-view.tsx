'use client';

import { useState, useRef, useEffect } from 'react';
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
  Info,
  Eye,
  ExternalLink,
  Download,
  Check,
  X,
  ChevronDown,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { HomeFluxLogoMark } from '@/components/layout/homeflux-logo';
import { ComparisonTable } from '@/components/propostas/comparison-table';
import { MonthlyTotalBarChart, EuriborSensitivityChart } from '@/components/propostas/propostas-charts';
import type { BankProposta, MapaComparativo } from '@/types/proposta';
import {
  calcTotalRecomendado,
  calcPrestacaoCompleta,
  calcPrestacaoTotalBanco,
  calcPrestacaoTotalExterno,
  calcTotalEncargosUnicos,
  fmtEur,
  fmtPct,
} from '@/types/proposta';
import type { PlatformSettings } from '@/lib/settings';
import { PLATFORM_DEFAULTS } from '@/lib/settings';
import { PLATFORM_DEFAULT_DOCUMENTS } from '@/lib/document-defaults';

// ─── Types ────────────────────────────────────────────────────────────────────

type DocRequest = {
  id: string;
  doc_type?: string | null;
  label: string;
  description?: string | null;
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
  proposta_id: string;
  bank_name: string;
  insurance_choice: 'banco' | 'externa';
  confirmed_at: string;
} | null;

type StagedFile = { file: File; error: string | null };

type ExpandedRow = { id: string; mode: 'upload' | 'replace' } | null;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getTemplate(docType: string | null | undefined) {
  if (!docType) return undefined;
  return PLATFORM_DEFAULT_DOCUMENTS.find((t) => t.doc_type === docType);
}

function formatTypeLabels(types: string[]): string {
  const map: Record<string, string> = {
    'application/pdf': 'PDF',
    'image/jpeg': 'JPG',
    'image/png': 'PNG',
  };
  return types.map((t) => map[t] ?? t).join(', ');
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatUploadDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

// Renders plain text with inline markdown [text](url) links
function RichText({ children }: { children: string }) {
  const parts: (string | { text: string; url: string })[] = [];
  const re = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(children)) !== null) {
    if (m.index > last) parts.push(children.slice(last, m.index));
    parts.push({ text: m[1], url: m[2] });
    last = m.index + m[0].length;
  }
  if (last < children.length) parts.push(children.slice(last));
  return (
    <>
      {parts.map((p, i) =>
        typeof p === 'string' ? (
          <span key={i}>{p}</span>
        ) : (
          <a
            key={i}
            href={p.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            {p.text}
          </a>
        )
      )}
    </>
  );
}

// ─── Status Icon (row left column) ───────────────────────────────────────────

function DocStatusIcon({ status }: { status: string }) {
  const cfg: Record<string, { icon: React.ReactNode; bg: string; color: string }> = {
    approved: { icon: <Check className="h-4 w-4" />, bg: 'bg-emerald-100', color: 'text-emerald-600' },
    rejected: { icon: <X className="h-4 w-4" />, bg: 'bg-red-100', color: 'text-red-500' },
    em_analise: { icon: <Clock className="h-4 w-4" />, bg: 'bg-amber-100', color: 'text-amber-500' },
    pending: { icon: <Download className="h-4 w-4" />, bg: 'bg-slate-100', color: 'text-slate-400' },
  };
  const c = cfg[status] ?? cfg.pending;
  return (
    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${c.bg} ${c.color}`}>
      {c.icon}
    </div>
  );
}

// ─── Status Chip ──────────────────────────────────────────────────────────────

function StatusChip({ status }: { status: string }) {
  const t = useTranslations('portal');
  const cfg: Record<string, { icon: React.ReactNode; className: string }> = {
    approved: {
      icon: <CheckCircle className="h-3 w-3" />,
      className: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    },
    rejected: {
      icon: <XCircle className="h-3 w-3" />,
      className: 'bg-red-50 text-red-600 border border-red-200',
    },
    em_analise: {
      icon: <Clock className="h-3 w-3" />,
      className: 'bg-amber-50 text-amber-700 border border-amber-200',
    },
    pending: {
      icon: <AlertCircle className="h-3 w-3" />,
      className: 'bg-slate-100 text-slate-500 border border-slate-200',
    },
  };
  const c = cfg[status] ?? cfg.pending;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${c.className}`}
    >
      {c.icon}
      {t(`status.${status}` as Parameters<typeof t>[0])}
    </span>
  );
}

// ─── Upload Accordion ─────────────────────────────────────────────────────────

function UploadAccordion({
  req,
  allowedTypes,
  expectedFiles,
  maxFileSizeMb,
  existingUploads,
  isReplaceMode,
  portalToken,
  onSuccess,
  onClose,
}: {
  req: DocRequest;
  allowedTypes: string[];
  expectedFiles: number;
  maxFileSizeMb: number;
  existingUploads: PortalUpload[];
  isReplaceMode: boolean;
  portalToken: string;
  onSuccess: (uploads: PortalUpload[]) => void;
  onClose: () => void;
}) {
  const [staged, setStaged] = useState<StagedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const maxBytes = maxFileSizeMb * 1024 * 1024;
  const typeLabels = formatTypeLabels(allowedTypes);
  const acceptAttr = allowedTypes.join(',');
  const validStaged = staged.filter((s) => !s.error);
  const hasErrors = staged.some((s) => s.error);

  function validate(file: File): string | null {
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
      return `Tipo não permitido. Use: ${typeLabels}`;
    }
    if (file.size > maxBytes) return `Máximo ${maxFileSizeMb} MB`;
    return null;
  }

  function addFiles(files: FileList | File[]) {
    setStaged((prev) => [
      ...prev,
      ...Array.from(files).map((f) => ({ file: f, error: validate(f) })),
    ]);
  }

  function removeStaged(idx: number) {
    setStaged((prev) => prev.filter((_, i) => i !== idx));
  }

  async function doSubmit() {
    const toUpload = staged.filter((s) => !s.error);
    if (toUpload.length === 0) return;
    setIsSubmitting(true);
    try {
      const results: PortalUpload[] = [];

      if (isReplaceMode) {
        // replace-upload deletes all existing, uploads one file
        const fd = new FormData();
        fd.append('file', toUpload[0].file);
        fd.append('request_id', req.id);
        const res = await fetch(`/api/portal/${portalToken}/replace-upload`, { method: 'POST', body: fd });
        if (!res.ok) { toast.error('Erro ao substituir ficheiro.'); return; }
        const data = (await res.json()) as { id: string };
        results.push({ id: data.id, document_request_id: req.id, file_name: toUpload[0].file.name, storage_path: '', uploaded_at: new Date().toISOString() });
        // remaining files via regular upload
        for (let i = 1; i < toUpload.length; i++) {
          const fd2 = new FormData();
          fd2.append('file', toUpload[i].file);
          fd2.append('request_id', req.id);
          const r2 = await fetch(`/api/portal/${portalToken}/upload`, { method: 'POST', body: fd2 });
          if (r2.ok) {
            const d2 = (await r2.json()) as { id: string };
            results.push({ id: d2.id, document_request_id: req.id, file_name: toUpload[i].file.name, storage_path: '', uploaded_at: new Date().toISOString() });
          }
        }
      } else {
        for (const { file } of toUpload) {
          const fd = new FormData();
          fd.append('file', file);
          fd.append('request_id', req.id);
          const res = await fetch(`/api/portal/${portalToken}/upload`, { method: 'POST', body: fd });
          if (res.ok) {
            const data = (await res.json()) as { id: string };
            results.push({ id: data.id, document_request_id: req.id, file_name: file.name, storage_path: '', uploaded_at: new Date().toISOString() });
          } else {
            const err = (await res.json()) as { error?: string };
            toast.error(err.error ?? 'Erro ao carregar ficheiro.');
          }
        }
      }

      if (results.length > 0) onSuccess(results);
    } finally {
      setIsSubmitting(false);
      setShowConfirm(false);
    }
  }

  function handleSubmit() {
    if (validStaged.length === 0) return;
    if (validStaged.length < expectedFiles) {
      setShowConfirm(true);
    } else {
      doSubmit();
    }
  }

  return (
    <div className="space-y-3">
      {/* Existing files — replace mode */}
      {isReplaceMode && existingUploads.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
            Ficheiros actuais
          </p>
          <div className="space-y-1">
            {existingUploads.map((u) => (
              <div
                key={u.id}
                className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg opacity-60"
              >
                <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span className="text-xs text-slate-500 truncate">{u.file_name ?? 'ficheiro'}</span>
                <span className="text-[11px] text-slate-400 ml-auto shrink-0">
                  {formatUploadDate(u.uploaded_at)}
                </span>
              </div>
            ))}
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-3 mb-1.5">
            Novo ficheiro
          </p>
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); addFiles(e.dataTransfer.files); }}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors select-none ${
          isDragging ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
        }`}
      >
        <Upload className={`h-5 w-5 mx-auto mb-2 ${isDragging ? 'text-blue-500' : 'text-slate-300'}`} />
        <p className="text-sm text-slate-600">
          Arraste para aqui ou{' '}
          <span className="text-blue-600 font-medium">clique para selecionar</span>
        </p>
        <p className="text-xs text-slate-400 mt-0.5">
          {typeLabels} · máx. {maxFileSizeMb} MB
        </p>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          multiple={expectedFiles > 1}
          accept={acceptAttr}
          onChange={(e) => {
            if (e.target.files) { addFiles(e.target.files); e.target.value = ''; }
          }}
        />
      </div>

      {/* Staged file list */}
      {staged.length > 0 && (
        <div className="space-y-1">
          {staged.map(({ file, error }, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                error ? 'border-red-200 bg-red-50' : 'border-slate-100 bg-white'
              }`}
            >
              <FileText className={`h-3.5 w-3.5 shrink-0 ${error ? 'text-red-400' : 'text-slate-400'}`} />
              <span className={`text-xs truncate flex-1 ${error ? 'text-red-600' : 'text-slate-700'}`}>
                {file.name}
              </span>
              <span className="text-[11px] text-slate-400 shrink-0">{formatFileSize(file.size)}</span>
              {error && (
                <span className="text-[10px] text-red-500 shrink-0 max-w-[140px] text-right leading-tight">
                  {error}
                </span>
              )}
              <button
                onClick={() => removeStaged(i)}
                className="text-slate-300 hover:text-slate-500 shrink-0 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Counter + actions */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <span className="text-xs text-slate-400">
          {validStaged.length} de {expectedFiles} ficheiro{expectedFiles !== 1 ? 's' : ''} carregado{validStaged.length !== 1 ? 's' : ''}
          {hasErrors && (
            <span className="text-red-500 ml-1">· {staged.filter((s) => s.error).length} com erro</span>
          )}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="h-8 px-3 text-xs text-slate-500 hover:text-slate-700 border border-slate-200 bg-white rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={validStaged.length === 0 || isSubmitting}
            className="h-8 px-4 text-xs font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-colors inline-flex items-center gap-1.5"
          >
            {isSubmitting && <Loader2 className="h-3 w-3 animate-spin" />}
            Submeter
          </button>
        </div>
      </div>

      {/* Incomplete files confirmation */}
      <Dialog open={showConfirm} onOpenChange={(v) => { if (!v) setShowConfirm(false); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Submeter com poucos ficheiros?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600 mt-1">
            Só carregou {validStaged.length} de {expectedFiles} ficheiro{expectedFiles !== 1 ? 's' : ''} esperado{expectedFiles !== 1 ? 's' : ''}. Tem a certeza que quer submeter assim mesmo?
          </p>
          <DialogFooter className="mt-4 flex gap-2 justify-end">
            <button
              onClick={() => setShowConfirm(false)}
              className="h-9 px-4 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={doSubmit}
              disabled={isSubmitting}
              className="h-9 px-4 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors inline-flex items-center gap-1.5"
            >
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Submeter assim mesmo
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Doc Info Sheet ───────────────────────────────────────────────────────────

function DocInfoSheet({
  doc,
  open,
  onClose,
}: {
  doc: DocRequest | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!doc) return null;
  const template = getTemplate(doc.doc_type);
  const description = doc.description || template?.description;
  const instructions = template?.instructions;
  const sourceLabel = template?.source_label;
  const sourceUrl = template?.source_url;
  const allowedTypes = template?.allowed_types ?? ['application/pdf', 'image/jpeg', 'image/png'];
  const maxFileSizeMb = template?.max_file_size_mb ?? 15;
  const expectedFiles = template?.expected_files ?? 1;

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-5">
          <SheetTitle className="text-base font-bold text-slate-900 leading-snug pr-6">
            {doc.label}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-5 pb-8">
          {/* File types accepted */}
          <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 flex flex-wrap gap-x-4 gap-y-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Formatos aceites</p>
              <p className="text-sm font-medium text-slate-700">{formatTypeLabels(allowedTypes)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Tamanho máximo</p>
              <p className="text-sm font-medium text-slate-700">{maxFileSizeMb} MB</p>
            </div>
            {expectedFiles > 1 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Ficheiros esperados</p>
                <p className="text-sm font-medium text-slate-700">{expectedFiles}</p>
              </div>
            )}
          </div>

          {description && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Descrição</p>
              <p className="text-sm text-slate-600 leading-relaxed">{description}</p>
            </div>
          )}

          {instructions && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Como obter</p>
              <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                <RichText>{instructions}</RichText>
              </div>
            </div>
          )}

          {sourceLabel && sourceUrl && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Fonte</p>
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 hover:underline font-medium"
              >
                {sourceLabel}
                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
              </a>
            </div>
          )}

          {!description && !instructions && !sourceLabel && (
            <p className="text-sm text-slate-400 italic">
              Sem informação adicional disponível para este documento.
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function DocProgressBar({
  docs,
  localStatuses,
}: {
  docs: DocRequest[];
  localStatuses: Record<string, string>;
}) {
  if (docs.length === 0) return null;

  const counts = { approved: 0, em_analise: 0, rejected: 0, pending: 0 };
  for (const d of docs) {
    const s = (localStatuses[d.id] ?? d.status) as keyof typeof counts;
    counts[s] = (counts[s] ?? 0) + 1;
  }
  const entregues = counts.em_analise + counts.approved + counts.rejected;

  const segColor = (s: string) => {
    if (s === 'approved') return 'bg-emerald-500';
    if (s === 'em_analise') return 'bg-amber-400';
    if (s === 'rejected') return 'bg-red-400';
    return 'bg-slate-200';
  };

  const legend = [
    counts.approved > 0 && {
      label: `${counts.approved} aprovado${counts.approved !== 1 ? 's' : ''}`,
      dot: 'bg-emerald-500',
      text: 'text-slate-600',
    },
    counts.em_analise > 0 && {
      label: `${counts.em_analise} em análise`,
      dot: 'bg-amber-400',
      text: 'text-slate-600',
    },
    counts.rejected > 0 && {
      label: `${counts.rejected} rejeitado${counts.rejected !== 1 ? 's' : ''}`,
      dot: 'bg-red-400',
      text: 'text-slate-600',
    },
    counts.pending > 0 && {
      label: `${counts.pending} por entregar`,
      dot: 'bg-slate-200',
      text: 'text-slate-500',
    },
  ].filter(Boolean) as { label: string; dot: string; text: string }[];

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-slate-700">Progresso de documentos</span>
        <span className="text-sm text-slate-500">
          <span className="font-semibold text-slate-900">{entregues}</span> de {docs.length} entregues
        </span>
      </div>
      <div className="flex gap-0.5 h-2.5 rounded-full overflow-hidden">
        {docs.map((d) => (
          <div key={d.id} className={`flex-1 ${segColor(localStatuses[d.id] ?? d.status)}`} />
        ))}
      </div>
      {legend.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-2">
          {legend.map((l) => (
            <span key={l.label} className={`flex items-center gap-1.5 text-xs ${l.text}`}>
              <span className={`w-2 h-2 rounded-full shrink-0 ${l.dot}`} />
              {l.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── First Month Cost Block ───────────────────────────────────────────────────

function FirstMonthCostBlock({
  propostas,
  recommendedId,
  hasP2,
}: {
  propostas: BankProposta[];
  recommendedId: string | null;
  hasP2: boolean;
}) {
  if (!propostas.length) return null;

  const rows = propostas.map((p) => {
    const base = p.monthly_payment ?? 0;
    const vida1 = p.vida_p1_recomendada === 'banco' ? (p.vida_p1_banco ?? 0) : (p.vida_p1_externa ?? 0);
    const vida2 = hasP2
      ? (p.vida_p2_recomendada === 'banco' ? (p.vida_p2_banco ?? 0) : (p.vida_p2_externa ?? 0))
      : 0;
    const multi = p.multiriscos_recomendada === 'banco' ? (p.multiriscos_banco ?? 0) : (p.multiriscos_externa ?? 0);
    const conta = p.manutencao_conta ?? 0;
    const total = base + vida1 + vida2 + multi + conta;
    return { p, base, vida1, vida2, multi, conta, total };
  });

  if (rows.every((r) => r.total <= 0)) return null;
  const maxTotal = Math.max(...rows.map((r) => r.total), 1);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-1">
        <h3 className="text-sm font-semibold text-slate-900">Custo do primeiro mês</h3>
        <span title="Decomposição da prestação completa no mês 1: prestação base + seguros recomendados + manutenção de conta" className="text-[10px] text-slate-400 cursor-help border-b border-dashed border-slate-300">ⓘ</span>
      </div>
      <p className="text-xs text-slate-500 mb-4">Prestação base + seguros recomendados + manutenção de conta</p>
      <div className="space-y-5">
        {rows.map(({ p, base, vida1, vida2, multi, conta, total }) => {
          const isRec = p.id === recommendedId;
          const pct = (v: number) => total > 0 ? (v / total) * 100 : 0;
          const barWidth = (total / maxTotal) * 100;
          return (
            <div key={p.id}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-800">{p.bank_name}</span>
                  {isRec && <span className="text-[10px] font-bold text-white bg-blue-600 px-1.5 py-0.5 rounded-full">Rec.</span>}
                </div>
                <span className={`text-sm font-bold ${isRec ? 'text-blue-700' : 'text-slate-900'}`}>{fmtEur(total)}/mês</span>
              </div>
              <div className="h-6 rounded-lg overflow-hidden flex" style={{ width: `${barWidth}%` }}>
                {base > 0 && <div className="bg-blue-500" style={{ width: `${pct(base)}%` }} title={`Prestação base: ${fmtEur(base)}`} />}
                {vida1 > 0 && <div className="bg-violet-400" style={{ width: `${pct(vida1)}%` }} title={`Seguro vida${hasP2 ? ' P1' : ''}: ${fmtEur(vida1)}`} />}
                {vida2 > 0 && <div className="bg-violet-300" style={{ width: `${pct(vida2)}%` }} title={`Seguro vida P2: ${fmtEur(vida2)}`} />}
                {multi > 0 && <div className="bg-emerald-400" style={{ width: `${pct(multi)}%` }} title={`Seguro multirriscos: ${fmtEur(multi)}`} />}
                {conta > 0 && <div className="bg-slate-400" style={{ width: `${pct(conta)}%` }} title={`Manutenção conta: ${fmtEur(conta)}`} />}
              </div>
              <div className="flex gap-3 mt-1.5 flex-wrap">
                {base > 0 && <span className="flex items-center gap-1 text-[10px] text-slate-500"><span className="w-2 h-2 rounded-sm bg-blue-500 shrink-0" />Prestação {fmtEur(base)}</span>}
                {vida1 > 0 && <span className="flex items-center gap-1 text-[10px] text-slate-500"><span className="w-2 h-2 rounded-sm bg-violet-400 shrink-0" />{hasP2 ? 'Vida P1' : 'Vida'} {fmtEur(vida1)}</span>}
                {hasP2 && vida2 > 0 && <span className="flex items-center gap-1 text-[10px] text-slate-500"><span className="w-2 h-2 rounded-sm bg-violet-300 shrink-0" />Vida P2 {fmtEur(vida2)}</span>}
                {multi > 0 && <span className="flex items-center gap-1 text-[10px] text-slate-500"><span className="w-2 h-2 rounded-sm bg-emerald-400 shrink-0" />Multirriscos {fmtEur(multi)}</span>}
                {conta > 0 && <span className="flex items-center gap-1 text-[10px] text-slate-500"><span className="w-2 h-2 rounded-sm bg-slate-400 shrink-0" />Conta {fmtEur(conta)}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Esforço Financeiro Block ─────────────────────────────────────────────────

function EsforcoFinanceiroBlock({
  propostas,
  recommendedId,
  hasP2,
  portalToken,
}: {
  propostas: BankProposta[];
  recommendedId: string | null;
  hasP2: boolean;
  portalToken: string;
}) {
  const storageKey = `homeflux_portal_rendimento_${portalToken}`;
  const [income, setIncome] = useState<string>('');

  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored) setIncome(stored);
  }, [storageKey]);

  function handleIncomeChange(val: string) {
    setIncome(val);
    if (val) localStorage.setItem(storageKey, val);
    else localStorage.removeItem(storageKey);
  }

  const incomeNum = parseFloat(income.replace(',', '.')) || 0;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-1">
        <h3 className="text-sm font-semibold text-slate-900">Esforço financeiro</h3>
        <span title="Taxa de esforço = prestação mensal total ÷ rendimento mensal líquido do agregado" className="text-[10px] text-slate-400 cursor-help border-b border-dashed border-slate-300">ⓘ</span>
      </div>
      <p className="text-xs text-slate-500 mb-4">Percentagem do rendimento mensal líquido afeto ao crédito</p>
      <div className="flex items-center gap-3 mb-5">
        <label className="text-xs text-slate-600 whitespace-nowrap shrink-0">Rendimento mensal líquido</label>
        <div className="relative flex-1 max-w-[200px]">
          <input
            type="number"
            value={income}
            onChange={(e) => handleIncomeChange(e.target.value)}
            placeholder="ex: 3500"
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-1.5 pr-8 focus:outline-none focus:ring-1 focus:ring-slate-300 text-slate-800"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">€</span>
        </div>
      </div>
      {incomeNum > 0 ? (
        <div className="space-y-4">
          {propostas.map((p) => {
            const total = calcPrestacaoCompleta(p, hasP2);
            const pct = total > 0 && incomeNum > 0 ? (total / incomeNum) * 100 : 0;
            const isRec = p.id === recommendedId;
            const barColor = pct <= 35 ? 'bg-emerald-500' : pct <= 50 ? 'bg-amber-500' : 'bg-red-500';
            const textColor = pct <= 35 ? 'text-emerald-700' : pct <= 50 ? 'text-amber-700' : 'text-red-700';
            const zone = pct <= 35 ? 'Confortável' : pct <= 50 ? 'Elevado' : 'Muito elevado';
            return (
              <div key={p.id}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-slate-700">{p.bank_name}</span>
                    {isRec && <span className="text-[10px] font-bold text-white bg-blue-600 px-1.5 py-0.5 rounded-full">Rec.</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold ${textColor}`}>{zone}</span>
                    <span className={`text-sm font-bold ${textColor}`}>{pct.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${Math.min(100, pct)}%` }} />
                </div>
                <div className="relative flex text-[9px] text-slate-400 mt-1">
                  <span style={{ width: '35%' }}>0–35% ✓</span>
                  <span style={{ width: '15%' }} className="text-center">35–50%</span>
                  <span className="text-right flex-1">{'>'}50% ⚠</span>
                </div>
              </div>
            );
          })}
          <p className="text-[10px] text-slate-400 pt-2 border-t border-slate-100">
            O Banco de Portugal recomenda que a taxa de esforço não exceda 35% do rendimento líquido mensal do agregado familiar.
          </p>
        </div>
      ) : (
        <div className="py-6 text-center text-sm text-slate-400">
          Introduza o rendimento para ver o esforço financeiro por proposta
        </div>
      )}
    </div>
  );
}

// ─── Custo Total Crédito Block ────────────────────────────────────────────────

function CustoTotalCreditoBlock({
  propostas,
  recommendedId,
  hasP2,
}: {
  propostas: BankProposta[];
  recommendedId: string | null;
  hasP2: boolean;
}) {
  const fmtK = (v: number) => {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M€`;
    if (v >= 1_000) return `${Math.round(v / 1_000)}k€`;
    return fmtEur(v);
  };

  const rows = propostas.map((p) => {
    const capital = p.loan_amount ?? 0;
    const prazo = p.term_months ?? 0;
    let juros = p.juros_totais ?? 0;
    if (!juros && p.mtic && capital) {
      juros = Math.max(0, p.mtic - capital - calcTotalEncargosUnicos(p));
    }
    const vida1 = p.vida_p1_recomendada === 'banco' ? (p.vida_p1_banco ?? 0) : (p.vida_p1_externa ?? 0);
    const vida2 = hasP2 ? (p.vida_p2_recomendada === 'banco' ? (p.vida_p2_banco ?? 0) : (p.vida_p2_externa ?? 0)) : 0;
    const multi = p.multiriscos_recomendada === 'banco' ? (p.multiriscos_banco ?? 0) : (p.multiriscos_externa ?? 0);
    const seguros = (vida1 + vida2 + multi) * prazo;
    const conta = (p.manutencao_conta ?? 0) * prazo;
    const encargos = calcTotalEncargosUnicos(p);
    const total = capital + juros + seguros + conta + encargos;
    return { p, capital, juros, seguros, conta, encargos, total };
  });

  if (rows.every((r) => r.total <= 0)) return null;
  const maxTotal = Math.max(...rows.map((r) => r.total), 1);

  const segments: { key: keyof typeof rows[0]; label: string; color: string }[] = [
    { key: 'capital', label: 'Capital', color: 'bg-blue-500' },
    { key: 'juros', label: 'Juros', color: 'bg-amber-400' },
    { key: 'seguros', label: 'Seguros', color: 'bg-violet-400' },
    { key: 'conta', label: 'Manutenção', color: 'bg-slate-400' },
    { key: 'encargos', label: 'Encargos únicos', color: 'bg-rose-400' },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-slate-900 mb-1">Custo total do crédito</h3>
      <p className="text-xs text-slate-500 mb-4">Capital + juros + seguros + manutenção + encargos ao longo de todo o prazo</p>
      <div className="space-y-5">
        {rows.map(({ p, total, ...vals }) => {
          const isRec = p.id === recommendedId;
          const barWidth = (total / maxTotal) * 100;
          const pct = (v: number) => total > 0 ? (v / total) * 100 : 0;
          return (
            <div key={p.id}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-800">{p.bank_name}</span>
                  {isRec && <span className="text-[10px] font-bold text-white bg-blue-600 px-1.5 py-0.5 rounded-full">Rec.</span>}
                </div>
                <span className={`text-sm font-bold ${isRec ? 'text-blue-700' : 'text-slate-900'}`}>{fmtK(total)}</span>
              </div>
              <div className="h-6 rounded-lg overflow-hidden flex" style={{ width: `${barWidth}%` }}>
                {segments.map(({ key, color }) => {
                  const v = vals[key as keyof typeof vals] as number;
                  const w = pct(v);
                  if (w < 0.5 || v <= 0) return null;
                  return <div key={key} className={color} style={{ width: `${w}%` }} title={`${key}: ${fmtK(v)}`} />;
                })}
              </div>
              <div className="flex gap-3 mt-1.5 flex-wrap">
                {segments.map(({ key, label, color }) => {
                  const v = vals[key as keyof typeof vals] as number;
                  if (v <= 0) return null;
                  return (
                    <span key={key} className="flex items-center gap-1 text-[10px] text-slate-500">
                      <span className={`w-2 h-2 rounded-sm ${color} shrink-0`} />
                      {label} {fmtK(v)}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-slate-400 mt-3 pt-2 border-t border-slate-100">Juros totais extraídos da FINE quando disponíveis; caso contrário estimados a partir do MTIC.</p>
    </div>
  );
}

// ─── Simulador de Amortização Antecipada ──────────────────────────────────────

function SimuladorAmortizacaoAntecipada({
  propostas,
  recommendedId,
}: {
  propostas: BankProposta[];
  recommendedId: string | null;
}) {
  const [amount, setAmount] = useState(10000);
  const [year, setYear] = useState(5);

  const validPropostas = propostas.filter((p) => p.loan_amount && p.term_months && p.tan);
  if (!validPropostas.length) return null;

  const maxTerm = Math.max(...validPropostas.map((p) => Math.floor((p.term_months ?? 0) / 12)));

  function simulate(p: BankProposta) {
    const principal = p.loan_amount!;
    const n = p.term_months!;
    const monthlyRate = (p.tan!) / 100 / 12;
    const monthsPassed = year * 12;
    if (monthsPassed >= n) return null;
    const remainingMonths = n - monthsPassed;

    let pmt: number;
    if (monthlyRate <= 0) {
      pmt = principal / n;
    } else {
      pmt = (monthlyRate * principal) / (1 - Math.pow(1 + monthlyRate, -n));
    }

    let remainingBalance: number;
    if (monthlyRate <= 0) {
      remainingBalance = principal - (pmt * monthsPassed);
    } else {
      remainingBalance = principal * Math.pow(1 + monthlyRate, monthsPassed)
        - pmt * (Math.pow(1 + monthlyRate, monthsPassed) - 1) / monthlyRate;
    }
    remainingBalance = Math.max(0, remainingBalance);

    const futureInterestWithout = pmt * remainingMonths - remainingBalance;

    const newBalance = Math.max(0, remainingBalance - amount);
    let newPmt: number;
    if (monthlyRate <= 0) {
      newPmt = newBalance / remainingMonths;
    } else {
      newPmt = (monthlyRate * newBalance) / (1 - Math.pow(1 + monthlyRate, -remainingMonths));
    }
    const futureInterestWith = newPmt * remainingMonths - newBalance;

    const jurosPoupados = Math.max(0, futureInterestWithout - futureInterestWith);
    const isVariable = p.rate_type === 'variavel' || p.rate_type === 'mista';
    const commissionRate = isVariable && year < 10 ? 0.02 : 0.005;
    const comissao = amount * commissionRate;
    const ganhoLiquido = jurosPoupados - comissao;

    return { jurosPoupados, comissao, ganhoLiquido, commissionRate };
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-slate-900 mb-1">Simulador de amortização antecipada</h3>
      <p className="text-xs text-slate-500 mb-4">Calcule quanto poupa ao amortizar antecipadamente parte do capital</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        <div>
          <label className="block text-xs text-slate-600 mb-1.5">Montante a amortizar</label>
          <input
            type="range"
            min={1000}
            max={50000}
            step={1000}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="w-full accent-blue-600 mb-1"
          />
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400">1.000€</span>
            <span className="text-base font-bold text-blue-700">{fmtEur(amount)}</span>
            <span className="text-xs text-slate-400">50.000€</span>
          </div>
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1.5">No ano</label>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300"
          >
            {Array.from({ length: Math.min(maxTerm - 1, 29) }, (_, i) => i + 1).map((y) => (
              <option key={y} value={y}>Ano {y}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="space-y-3">
        {validPropostas.map((p) => {
          const isRec = p.id === recommendedId;
          const result = simulate(p);
          if (!result) return null;
          const { jurosPoupados, comissao, ganhoLiquido, commissionRate } = result;
          return (
            <div key={p.id} className={`rounded-xl border p-4 ${isRec ? 'border-blue-200 bg-blue-50/40' : 'border-slate-200 bg-slate-50/30'}`}>
              <div className="flex items-center gap-1.5 mb-3">
                <span className="text-xs font-semibold text-slate-800">{p.bank_name}</span>
                {isRec && <span className="text-[10px] font-bold text-white bg-blue-600 px-1.5 py-0.5 rounded-full">Rec.</span>}
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-[10px] text-slate-500 mb-0.5">Juros poupados</p>
                  <p className="text-sm font-bold text-emerald-700">{fmtEur(jurosPoupados)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 mb-0.5">Comissão ({(commissionRate * 100).toFixed(1)}%)</p>
                  <p className="text-sm font-bold text-rose-600">{fmtEur(comissao)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 mb-0.5">Ganho líquido</p>
                  <p className={`text-sm font-bold ${ganhoLiquido >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>{fmtEur(ganhoLiquido)}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-slate-400 mt-3">
        Comissão de amortização antecipada: 2% (taxa variável, primeiros 10 anos) · 0,5% (variável após 10 anos ou taxa fixa). Valores estimados.
      </p>
    </div>
  );
}

// ─── Summary Cards ────────────────────────────────────────────────────────────

function SummaryCards({
  propostas,
  recommendedId,
  hasP2,
}: {
  propostas: BankProposta[];
  recommendedId: string | null;
  hasP2: boolean;
}) {
  const MONTHS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const fmtDate = (s: string) => {
    const [y, m, d] = s.split('-').map(Number);
    return `${d} ${MONTHS_PT[m - 1]} ${y}`;
  };

  return (
    <div
      style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}
    >
      {propostas.map((p) => {
        const isRec = p.id === recommendedId;
        const totalRec = calcTotalRecomendado(p, hasP2) + (p.manutencao_conta ?? 0);
        const initials = p.bank_name
          .split(/\s+/)
          .map((w: string) => w[0])
          .join('')
          .slice(0, 2)
          .toUpperCase();
        const rateLabel =
          p.rate_type === 'variavel'
            ? 'Variável'
            : p.rate_type === 'fixa'
            ? 'Fixa'
            : p.rate_type === 'mista'
            ? 'Mista'
            : null;
        const now = new Date();
        const expiryDate = p.validade_ate ? new Date(p.validade_ate) : null;
        const isExpired = expiryDate ? expiryDate < now : false;
        const daysUntilExpiry =
          expiryDate && !isExpired
            ? Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
            : null;
        const expiresSoon = daysUntilExpiry !== null && daysUntilExpiry <= 14;

        return (
          <div
            key={p.id}
            className="bg-white"
            style={{
              padding: '12px',
              borderRadius: '12px',
              border: isRec ? '2px solid #3b82f6' : '1px solid #e2e8f0',
              boxShadow: isRec ? '0 4px 16px rgba(59,130,246,0.15)' : undefined,
            }}
          >
            <div className="flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0 ${
                  isRec ? 'bg-blue-600' : 'bg-slate-700'
                }`}
              >
                {initials}
              </div>
              <span className="text-sm font-semibold text-slate-900 truncate flex-1">{p.bank_name}</span>
              {rateLabel && (
                <span className="text-[10px] font-medium bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded shrink-0">
                  {rateLabel}
                </span>
              )}
              {isRec && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-white bg-blue-600 px-2 py-0.5 rounded-full shrink-0">
                  <Star className="h-2.5 w-2.5 fill-current" />
                  Recomendado
                </span>
              )}
            </div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mt-2" title="Inclui prestação base, seguros recomendados e manutenção de conta">
              Prestação mensal
            </p>
            <p className="text-xl font-bold text-slate-900 leading-tight">
              {totalRec > 0 ? fmtEur(totalRec) : '—'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {[p.tan ? `TAN: ${fmtPct(p.tan)}` : null, p.spread ? `Spread: ${fmtPct(p.spread)}` : null]
                .filter(Boolean)
                .join(' · ')}
            </p>
            {p.validade_ate && (
              <p
                className={`text-xs mt-1 ${
                  isExpired
                    ? 'text-red-600 font-medium'
                    : expiresSoon
                    ? 'text-amber-600 font-medium'
                    : 'text-slate-400'
                }`}
              >
                {isExpired
                  ? '⚠ Expirada'
                  : expiresSoon
                  ? `⚠ Expira em ${daysUntilExpiry} dias`
                  : `Válida até ${fmtDate(p.validade_ate)}`}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Portal Mapa Card ─────────────────────────────────────────────────────────

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
  const [selectedBankId, setSelectedBankId] = useState<string>(
    anyChoice ? (currentChoice?.proposta_id ?? '') : ''
  );
  const [insuranceChoice, setInsuranceChoice] = useState<'banco' | 'externa' | ''>(
    anyChoice ? (currentChoice?.insurance_choice ?? '') : ''
  );
  const [notes, setNotes] = useState('');
  const [confirming, setConfirming] = useState(false);

  const selectedBank = propostas.find((p) => p.id === selectedBankId);
  const hasAnalysis =
    chartsEnabled && propostas.some((p) => (p.monthly_payment ?? 0) > 0 || (p.spread ?? 0) > 0);
  const showChoiceForm = !anyChoice || editing;

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
        setEditing(false);
      }
    } finally {
      setConfirming(false);
    }
  }

  const insuranceLabel =
    currentChoice?.insurance_choice === 'banco' ? 'seguros do banco' : 'seguros externos';
  const choiceBank = propostas.find((p) => p.id === currentChoice?.proposta_id);
  const choiceMonthly = choiceBank
    ? currentChoice?.insurance_choice === 'banco'
      ? calcPrestacaoTotalBanco(choiceBank)
      : calcPrestacaoTotalExterno(choiceBank)
    : 0;

  return (
    <div className="space-y-5">
      <SummaryCards propostas={propostas} recommendedId={mapa.recommended_proposta_id} hasP2={hasP2} />
      <FirstMonthCostBlock propostas={propostas} recommendedId={mapa.recommended_proposta_id} hasP2={hasP2} />
      <EsforcoFinanceiroBlock propostas={propostas} recommendedId={mapa.recommended_proposta_id} hasP2={hasP2} portalToken={portalToken} />
      <ComparisonTable
        propostas={propostas}
        recommendedId={mapa.recommended_proposta_id}
        hasP2={hasP2}
        mode="client"
      />
      {mapa.broker_notes && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <p className="text-xs font-semibold text-blue-500 uppercase tracking-wide mb-1.5">
            Notas do mediador
          </p>
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{mapa.broker_notes}</p>
        </div>
      )}
      <div className="max-w-[600px] mx-auto bg-white rounded-xl border border-slate-200 p-5">
        <p className="text-base font-bold text-slate-800 mb-1">A minha preferência</p>
        <p className="text-xs text-slate-500 mb-4">
          Indique ao seu mediador qual a proposta que prefere. Isto não é vinculativo.
        </p>
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
            <button
              onClick={() => setEditing(true)}
              className="mt-2 text-xs text-green-600 hover:text-green-800 underline"
            >
              Alterar preferência
            </button>
          </div>
        )}
        {showChoiceForm && (
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                Escolha o banco
              </p>
              <div className="overflow-x-auto">
                <div className="flex gap-3 pb-2" style={{ minWidth: 'max-content' }}>
                  {propostas.map((p) => {
                    const isRec = p.id === mapa.recommended_proposta_id;
                    const total = calcPrestacaoTotalBanco(p);
                    const initials = p.bank_name
                      .split(/\s+/)
                      .map((w: string) => w[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase();
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
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold text-white mb-2 ${
                            isSelected ? 'bg-blue-600' : 'bg-[#1E3A5F]'
                          }`}
                        >
                          {initials}
                          {isSelected && <CheckCircle className="h-4 w-4 absolute text-blue-600" />}
                        </div>
                        <p className="text-xs font-semibold text-slate-800 text-center leading-tight mb-1">
                          {p.bank_name}
                        </p>
                        {total > 0 && <p className="text-[10px] text-slate-500">{fmtEur(total)}/mês</p>}
                        {isRec && (
                          <span className="text-[9px] font-bold text-blue-600 mt-1">★ Recomendado</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            {selectedBankId && selectedBank && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                  Tipo de seguros
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    {
                      value: 'banco' as const,
                      label: 'Seguros do banco',
                      sublabel: 'Fornecidos pelo banco credor',
                      total: calcPrestacaoTotalBanco(selectedBank),
                    },
                    {
                      value: 'externa' as const,
                      label: 'Seguros externos',
                      sublabel: 'Ex: Asisa, Lusitania',
                      total: calcPrestacaoTotalExterno(selectedBank),
                    },
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
                        {insuranceChoice === value ? (
                          <CheckCircle className="h-4 w-4 text-blue-600 shrink-0" />
                        ) : (
                          <div className="h-4 w-4 rounded-full border-2 border-slate-300 shrink-0" />
                        )}
                        <p className="text-sm font-semibold text-slate-800">{label}</p>
                      </div>
                      <p className="text-[11px] text-slate-500 pl-6">{sublabel}</p>
                      {total > 0 && (
                        <p className="text-sm font-bold text-slate-900 pl-6 mt-1">{fmtEur(total)}/mês</p>
                      )}
                      {(selectedBank.manutencao_conta ?? 0) > 0 && (
                        <p className="text-[10px] text-slate-400 pl-6 mt-0.5">
                          Manutenção de conta: {fmtEur(selectedBank.manutencao_conta)}/mês
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {selectedBankId && insuranceChoice && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                  Observações (opcional)
                </p>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Tem alguma questão ou comentário para o seu mediador?"
                  className="w-full text-sm border border-slate-200 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
                  rows={2}
                />
              </div>
            )}
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
                <button
                  onClick={() => setEditing(false)}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  Cancelar
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Análise detalhada — collapsible */}
      {hasAnalysis && (
        <details className="group">
          <summary className="flex items-center gap-2 cursor-pointer py-3 px-5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors list-none select-none">
            <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180 shrink-0" />
            Ver análise detalhada
            <span className="text-xs font-normal text-slate-400 ml-1">Para quem quer perceber em profundidade</span>
          </summary>
          <div className="mt-4 space-y-4">
            <MonthlyTotalBarChart propostas={propostas} recommendedId={mapa.recommended_proposta_id} />
            <CustoTotalCreditoBlock propostas={propostas} recommendedId={mapa.recommended_proposta_id} hasP2={hasP2} />
            <EuriborSensitivityChart propostas={propostas} recommendedId={mapa.recommended_proposta_id} />
            <SimuladorAmortizacaoAntecipada propostas={propostas} recommendedId={mapa.recommended_proposta_id} />
          </div>
        </details>
      )}
    </div>
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
  const [savedChoice, setSavedChoice] = useState<PropostaChoice>(
    (propostaChoice as PropostaChoice) ?? null
  );

  const [viewingIds, setViewingIds] = useState<Set<string>>(new Set());
  const [localUploads, setLocalUploads] = useState<PortalUpload[]>(uploads);
  const [localStatuses, setLocalStatuses] = useState<Record<string, string>>(
    Object.fromEntries(documentRequests.map((r) => [r.id, r.status]))
  );
  const [localBrokerNotes, setLocalBrokerNotes] = useState<Record<string, string | null>>(
    Object.fromEntries(documentRequests.map((r) => [r.id, r.broker_notes]))
  );

  const hasP2 = Boolean(p2Name);
  const [activeProponente, setActiveProponente] = useState<'p1' | 'p2' | 'shared'>('p1');
  const [approvedExpanded, setApprovedExpanded] = useState(false);
  const [infoDocId, setInfoDocId] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<ExpandedRow>(null);

  const orderedPropostas = mapa
    ? (mapa.proposta_ids
        .map((pid) => bankPropostas.find((p) => p.id === pid))
        .filter(Boolean) as BankProposta[])
    : [];

  const hasVisibleMapa = mapa && mapa.is_visible_to_client && orderedPropostas.length > 0;

  function getUploadsForRequest(requestId: string) {
    return localUploads.filter((u) => u.document_request_id === requestId);
  }

  async function handleViewClick(requestId: string) {
    const reqUploads = getUploadsForRequest(requestId);
    if (reqUploads.length === 0) return;
    const upload = reqUploads[reqUploads.length - 1];
    setViewingIds((prev) => new Set(prev).add(requestId));
    try {
      const res = await fetch(`/api/portal/${portalToken}/uploads/${upload.id}`);
      if (res.ok) {
        const { url } = (await res.json()) as { url: string };
        window.open(url, '_blank');
      } else {
        toast.error(tCommon('error'));
      }
    } catch {
      toast.error(tCommon('error'));
    } finally {
      setViewingIds((prev) => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
    }
  }

  async function handleAcceptTerms() {
    if (!termsAccepted) return;
    setAcceptingTerms(true);
    try {
      const res = await fetch(`/api/portal/${portalToken}/accept-terms`, { method: 'POST' });
      if (res.ok) setShowTerms(false);
      else toast.error(tCommon('error'));
    } finally {
      setAcceptingTerms(false);
    }
  }

  function handleUploadSuccess(
    requestId: string,
    newUploads: PortalUpload[],
    isReplace: boolean
  ) {
    if (isReplace) {
      setLocalUploads((prev) => [
        ...prev.filter((u) => u.document_request_id !== requestId),
        ...newUploads,
      ]);
      setLocalBrokerNotes((prev) => ({ ...prev, [requestId]: null }));
    } else {
      setLocalUploads((prev) => [...prev, ...newUploads]);
    }
    setLocalStatuses((prev) => ({ ...prev, [requestId]: 'em_analise' }));
    setExpandedRow(null);
    toast.success(t('uploadSuccess'));
  }

  const pendingCount = documentRequests.filter((r) => {
    const s = localStatuses[r.id] ?? r.status;
    return s === 'pending' || s === 'rejected';
  }).length;

  const infoDoc = infoDocId ? documentRequests.find((r) => r.id === infoDocId) ?? null : null;

  // ── Terms screen ────────────────────────────────────────────────────────────
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

  // ── Main portal ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f8f9fb]">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
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
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full">
              <AlertCircle className="h-3.5 w-3.5" />
              {pendingCount} {t('pendingDocs')}
            </span>
          )}
        </div>
      </header>

      <main className="w-full py-8">
        {/* Page title */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 mb-6">
          <h1 className="text-2xl font-bold text-slate-900">O seu processo de crédito</h1>
          <p className="text-sm text-slate-500 mt-1">
            Carregue os documentos solicitados pelo seu mediador para avançarmos para a fase de propostas.
          </p>
        </div>

        <Tabs defaultValue={effectiveSettings.documents_tab_enabled ? 'documents' : 'propostas'}>
          {/* Tab nav */}
          {effectiveSettings.documents_tab_enabled && effectiveSettings.propostas_tab_enabled && (
            <div className="max-w-5xl mx-auto px-4 sm:px-6 mb-1">
              <TabsList className="bg-white border border-slate-200 rounded-xl p-1 gap-0.5 h-auto w-full sm:w-auto mb-0">
                {effectiveSettings.documents_tab_enabled && (
                  <TabsTrigger
                    value="documents"
                    className="flex-1 sm:flex-none rounded-lg text-sm font-medium py-1.5 px-5 text-slate-500 data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all"
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
                    className="flex-1 sm:flex-none rounded-lg text-sm font-medium py-1.5 px-5 text-slate-500 data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all"
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

          {/* ── Documents Tab ─────────────────────────────────────────────────── */}
          <TabsContent value="documents">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-4 mt-4">

              {/* Progress bar */}
              {(() => {
                const visibleDocs = hasP2
                  ? documentRequests.filter((r) => r.proponente === activeProponente)
                  : documentRequests;
                return (
                  <div className="bg-white rounded-xl border border-slate-200 px-5 py-4">
                    <DocProgressBar docs={visibleDocs} localStatuses={localStatuses} />
                  </div>
                );
              })()}

              {/* Proponente sub-nav */}
              {hasP2 && (
                <div className="flex rounded-xl bg-white border border-slate-200 p-1 gap-0.5">
                  {(['p1', 'p2', 'shared'] as const).map((tab) => {
                    const label =
                      tab === 'p1' ? clientName : tab === 'p2' ? p2Name! : 'Partilhados';
                    const cnt = documentRequests.filter((r) => {
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
                        {cnt > 0 && (
                          <span
                            className={`ml-1.5 text-[10px] font-bold rounded-full w-4 h-4 inline-flex items-center justify-center ${
                              activeProponente === tab
                                ? 'bg-amber-400 text-slate-900'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {cnt}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Document list */}
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

                const statusOrder: Record<string, number> = {
                  rejected: 0, pending: 1, em_analise: 2, approved: 3,
                };
                const sorted = [...filtered].sort((a, b) => {
                  const sa = localStatuses[a.id] ?? a.status;
                  const sb = localStatuses[b.id] ?? b.status;
                  return (statusOrder[sa] ?? 1) - (statusOrder[sb] ?? 1);
                });
                const activeDocs = sorted.filter(
                  (r) => (localStatuses[r.id] ?? r.status) !== 'approved'
                );
                const approvedDocs = sorted.filter(
                  (r) => (localStatuses[r.id] ?? r.status) === 'approved'
                );

                const renderRow = (req: DocRequest, isApproved = false) => {
                  const status = localStatuses[req.id] ?? req.status;
                  const reqUploads = getUploadsForRequest(req.id);
                  const latestUpload = reqUploads[reqUploads.length - 1];
                  const isViewing = viewingIds.has(req.id);
                  const hasUploads = reqUploads.length > 0;
                  const brokerNote = localBrokerNotes[req.id] ?? req.broker_notes;
                  const template = getTemplate(req.doc_type);
                  const allowedTypes = template?.allowed_types ?? ['application/pdf', 'image/jpeg', 'image/png'];
                  const expectedFiles = template?.expected_files ?? 1;
                  const maxFileSizeMb = template?.max_file_size_mb ?? 15;

                  const isExpanded = expandedRow?.id === req.id;
                  const isReplaceMode = expandedRow?.mode === 'replace';

                  // File hint shown in the row
                  const fileHint =
                    hasUploads && latestUpload && status !== 'pending'
                      ? `${latestUpload.file_name ?? 'ficheiro'} · ${formatUploadDate(latestUpload.uploaded_at)}`
                      : `${formatTypeLabels(allowedTypes)} · máx. ${maxFileSizeMb} MB`;

                  return (
                    <div
                      key={req.id}
                      className={isApproved ? 'opacity-75' : undefined}
                    >
                      {/* Row */}
                      <div className="flex items-center px-3 sm:px-5 py-3 sm:py-3.5 gap-2 sm:gap-4">
                        {/* Status icon */}
                        <DocStatusIcon status={status} />

                        {/* Doc name + hint */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 flex-wrap">
                            <p className="font-semibold text-sm text-slate-900 leading-snug">
                              {req.label}
                            </p>
                            {req.is_mandatory && (
                              <span className="text-red-400 text-sm leading-none">*</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5 truncate">{fileHint}</p>
                          {status === 'rejected' && brokerNote && (
                            <p className="text-xs text-red-500 mt-0.5 leading-snug">{brokerNote}</p>
                          )}
                        </div>

                        {/* Mandatory column — hidden on small screens */}
                        <span className="hidden sm:block text-xs text-slate-400 w-[88px] text-center shrink-0">
                          {req.is_mandatory ? 'Obrigatório' : 'Opcional'}
                        </span>

                        {/* Status badge — desktop only */}
                        <div className="hidden sm:flex w-[108px] justify-center shrink-0">
                          <StatusChip status={status} />
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                          {/* Mobile: compact status chip */}
                          <span className="sm:hidden">
                            <StatusChip status={status} />
                          </span>

                          {status === 'pending' && (
                            <button
                              onClick={() =>
                                setExpandedRow(
                                  isExpanded ? null : { id: req.id, mode: 'upload' }
                                )
                              }
                              className={`flex items-center gap-1 sm:gap-1.5 h-8 px-2 sm:px-3 text-xs font-semibold rounded-lg transition-colors ${
                                isExpanded
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : 'bg-blue-600 hover:bg-blue-700 text-white'
                              }`}
                            >
                              <Upload className="h-3 w-3 shrink-0" />
                              <span className="hidden sm:inline">Carregar</span>
                            </button>
                          )}

                          {status === 'em_analise' && (
                            <>
                              <button
                                onClick={() => handleViewClick(req.id)}
                                disabled={isViewing || !hasUploads}
                                className="flex items-center gap-1 sm:gap-1.5 h-8 px-2 sm:px-3 text-xs font-medium border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-600 rounded-lg transition-colors"
                              >
                                {isViewing ? (
                                  <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                                ) : (
                                  <Eye className="h-3 w-3 shrink-0" />
                                )}
                                <span className="hidden sm:inline">Ver</span>
                              </button>
                              <button
                                onClick={() =>
                                  setExpandedRow(
                                    isExpanded && isReplaceMode
                                      ? null
                                      : { id: req.id, mode: 'replace' }
                                  )
                                }
                                className={`flex items-center gap-1 sm:gap-1.5 h-8 px-2 sm:px-3 text-xs font-medium border rounded-lg transition-colors ${
                                  isExpanded && isReplaceMode
                                    ? 'border-slate-300 bg-slate-100 text-slate-700'
                                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                                }`}
                              >
                                <RefreshCw className="h-3 w-3 shrink-0" />
                                <span className="hidden sm:inline">Substituir</span>
                              </button>
                            </>
                          )}

                          {status === 'approved' && (
                            <button
                              onClick={() => handleViewClick(req.id)}
                              disabled={isViewing || !hasUploads}
                              className="flex items-center gap-1 sm:gap-1.5 h-8 px-2 sm:px-3 text-xs font-medium border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-600 rounded-lg transition-colors"
                            >
                              {isViewing ? (
                                <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                              ) : (
                                <Eye className="h-3 w-3 shrink-0" />
                              )}
                              <span className="hidden sm:inline">Ver</span>
                            </button>
                          )}

                          {status === 'rejected' && (
                            <>
                              <button
                                onClick={() => handleViewClick(req.id)}
                                disabled={isViewing || !hasUploads}
                                className="flex items-center gap-1 sm:gap-1.5 h-8 px-2 sm:px-3 text-xs font-medium border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-600 rounded-lg transition-colors"
                              >
                                {isViewing ? (
                                  <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                                ) : (
                                  <Eye className="h-3 w-3 shrink-0" />
                                )}
                                <span className="hidden sm:inline">Ver</span>
                              </button>
                              <button
                                onClick={() =>
                                  setExpandedRow(
                                    isExpanded ? null : { id: req.id, mode: 'upload' }
                                  )
                                }
                                className={`flex items-center gap-1 sm:gap-1.5 h-8 px-2 sm:px-3 text-xs font-semibold rounded-lg transition-colors ${
                                  isExpanded
                                    ? 'bg-red-50 text-red-700 border border-red-200'
                                    : 'bg-red-600 hover:bg-red-700 text-white'
                                }`}
                              >
                                <Upload className="h-3 w-3 shrink-0" />
                                <span className="hidden sm:inline">Carregar novo</span>
                              </button>
                            </>
                          )}
                        </div>

                        {/* Info button */}
                        <button
                          onClick={() => setInfoDocId(req.id)}
                          title="Como obter este documento"
                          className="text-slate-300 hover:text-slate-500 transition-colors shrink-0"
                        >
                          <Info className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Accordion */}
                      {isExpanded && (
                        <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-4">
                          <UploadAccordion
                            req={req}
                            allowedTypes={allowedTypes}
                            expectedFiles={expectedFiles}
                            maxFileSizeMb={maxFileSizeMb}
                            existingUploads={reqUploads}
                            isReplaceMode={isReplaceMode}
                            portalToken={portalToken}
                            onSuccess={(newUploads) =>
                              handleUploadSuccess(req.id, newUploads, isReplaceMode)
                            }
                            onClose={() => setExpandedRow(null)}
                          />
                        </div>
                      )}
                    </div>
                  );
                };

                return (
                  <div className="space-y-2">
                    {/* Active docs */}
                    <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                      {activeDocs.length === 0 && approvedDocs.length > 0 && (
                        <div className="px-5 py-10 text-center text-sm text-slate-400">
                          Todos os documentos foram aprovados.
                        </div>
                      )}
                      {activeDocs.map((req) => renderRow(req))}
                    </div>

                    {/* Approved — collapsible */}
                    {approvedDocs.length > 0 && (
                      <div>
                        <button
                          onClick={() => setApprovedExpanded((v) => !v)}
                          className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl hover:bg-emerald-100 transition-colors"
                        >
                          <span className="flex items-center gap-1.5">
                            <CheckCircle className="h-4 w-4" />
                            {approvedDocs.length} documento{approvedDocs.length !== 1 ? 's' : ''}{' '}
                            aprovado{approvedDocs.length !== 1 ? 's' : ''}
                          </span>
                          <span className="text-emerald-500 text-base leading-none">
                            {approvedExpanded ? '▲' : '▼'}
                          </span>
                        </button>

                        {approvedExpanded && (
                          <div className="mt-1 bg-white rounded-xl border border-emerald-100 divide-y divide-slate-100 overflow-hidden">
                            {approvedDocs.map((req) => renderRow(req, true))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </TabsContent>

          {/* ── Propostas Tab ─────────────────────────────────────────────────── */}
          <TabsContent value="propostas">
            <div className="max-w-[1280px] mx-auto px-4 md:px-6 space-y-6 mt-4">
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

      <DocInfoSheet
        doc={infoDoc}
        open={infoDocId !== null}
        onClose={() => setInfoDocId(null)}
      />
    </div>
  );
}
