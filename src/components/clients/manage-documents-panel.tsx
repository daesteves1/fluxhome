'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Settings2, Info } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { TRANSFER_MORTGAGE_TYPES } from '@/lib/document-defaults';
import type { OfficeDocTemplate } from '@/lib/document-defaults';
import type { DocumentRequest, DocumentUpload } from './client-detail-tabs';

interface Props {
  clientId: string;
  mortgageType: string | null;
  hasP2: boolean;
  documentRequests: DocumentRequest[];
  uploads: DocumentUpload[];
  officeDocTemplate: OfficeDocTemplate[];
}

function hasUploads(req: DocumentRequest, uploads: DocumentUpload[]): boolean {
  return uploads.some((u) => u.document_request_id === req.id);
}

/** Find existing document_request(s) for a template doc */
function findExisting(doc: OfficeDocTemplate, documentRequests: DocumentRequest[]): DocumentRequest[] {
  if (doc.proponente === 'per_proponente') {
    return documentRequests.filter(
      (r) => r.doc_type === `p1_${doc.doc_type}` || r.doc_type === `p2_${doc.doc_type}`
    );
  }
  return documentRequests.filter((r) => r.doc_type === doc.doc_type);
}

export function ManageDocumentsPanel({
  clientId, mortgageType, hasP2, documentRequests, uploads, officeDocTemplate,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  const isTransferProcess = mortgageType !== null && TRANSFER_MORTGAGE_TYPES.includes(mortgageType);

  const perProponenteDocs = officeDocTemplate.filter((d) => d.proponente === 'per_proponente');
  const sharedDocs = officeDocTemplate.filter((d) => d.proponente === 'shared');

  async function toggleOn(doc: OfficeDocTemplate) {
    setLoadingKey(doc.doc_type);
    try {
      const proponentes: Array<{ proponente: 'p1' | 'p2' | 'shared'; doc_type: string }> =
        doc.proponente === 'per_proponente'
          ? [
              { proponente: 'p1', doc_type: `p1_${doc.doc_type}` },
              ...(hasP2 ? [{ proponente: 'p2' as const, doc_type: `p2_${doc.doc_type}` }] : []),
            ]
          : [{ proponente: 'shared', doc_type: doc.doc_type }];

      for (const { proponente, doc_type } of proponentes) {
        const res = await fetch(`/api/clients/${clientId}/documents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            doc_type,
            label: doc.label,
            proponente,
            is_mandatory: doc.is_mandatory,
            max_files: doc.max_files,
            sort_order: officeDocTemplate.indexOf(doc),
          }),
        });
        if (!res.ok) {
          toast.error('Erro ao adicionar documento');
          return;
        }
      }
      router.refresh();
    } finally {
      setLoadingKey(null);
    }
  }

  async function toggleOff(doc: OfficeDocTemplate, existing: DocumentRequest[]) {
    setLoadingKey(doc.doc_type);
    try {
      for (const req of existing) {
        const res = await fetch(`/api/clients/${clientId}/documents/${req.id}`, { method: 'DELETE' });
        if (!res.ok) {
          const data = await res.json();
          toast.error(data.error ?? 'Erro ao remover documento');
          return;
        }
      }
      router.refresh();
    } finally {
      setLoadingKey(null);
    }
  }

  function renderDocList(docs: OfficeDocTemplate[]) {
    return docs.map((doc) => {
      const existing = findExisting(doc, documentRequests);
      const enabled = existing.length > 0;
      const blocked = enabled && existing.some((r) => hasUploads(r, uploads));
      const loading = loadingKey === doc.doc_type;

      return (
        <ToggleRow
          key={doc.doc_type}
          label={doc.label}
          mandatory={doc.is_mandatory}
          enabled={enabled}
          blocked={blocked}
          loading={loading}
          onEnable={() => toggleOn(doc)}
          onDisable={() => toggleOff(doc, existing)}
        />
      );
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-1.5 h-8 px-3 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors">
          <Settings2 className="h-3.5 w-3.5" />
          Gerir documentos
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerir documentos do processo</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Mortgage type auto-docs note */}
          {isTransferProcess && (
            <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg">
              <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700">
                Documentos adicionados automaticamente para processo de <strong>{mortgageType}</strong>
              </p>
            </div>
          )}

          {/* Per-proponente docs */}
          {perProponenteDocs.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Documentos pessoais {hasP2 ? '(P1 + P2)' : '(P1)'}
              </p>
              <div className="space-y-2">{renderDocList(perProponenteDocs)}</div>
            </div>
          )}

          {/* Shared docs */}
          {sharedDocs.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Documentos do processo
              </p>
              <div className="space-y-2">{renderDocList(sharedDocs)}</div>
            </div>
          )}

          {officeDocTemplate.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-4">
              Nenhum documento configurado para este escritório.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ToggleRowProps {
  label: string;
  mandatory: boolean;
  enabled: boolean;
  blocked: boolean;
  loading: boolean;
  onEnable: () => void;
  onDisable: () => void;
}

function ToggleRow({ label, enabled, blocked, loading, onEnable, onDisable }: ToggleRowProps) {
  const canToggleOff = enabled && !blocked;
  const title = blocked ? 'Tem ficheiros carregados — não é possível remover' : undefined;

  return (
    <div className="flex items-center justify-between gap-3 py-2 px-3 bg-slate-50 rounded-lg">
      <span className="text-sm text-slate-800 leading-tight">{label}</span>
      <button
        onClick={enabled ? onDisable : onEnable}
        disabled={loading || (enabled && !canToggleOff)}
        title={title}
        className={[
          'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200',
          'focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40',
          enabled ? 'bg-blue-600' : 'bg-slate-300',
        ].join(' ')}
      >
        <span
          className={[
            'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out',
            enabled ? 'translate-x-4' : 'translate-x-0',
          ].join(' ')}
        />
      </button>
    </div>
  );
}
