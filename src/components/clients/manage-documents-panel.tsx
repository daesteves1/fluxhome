'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Settings2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  SHARED_TEMPLATES,
  getApplicableSpecific,
  type DocTemplate,
} from '@/lib/document-templates';
import type { DocumentRequest, DocumentUpload } from './client-detail-tabs';

interface Props {
  clientId: string;
  mortgageType: string | null;
  documentRequests: DocumentRequest[];
  uploads: DocumentUpload[];
}

function findExistingRequest(
  tpl: DocTemplate,
  documentRequests: DocumentRequest[]
): DocumentRequest | undefined {
  return documentRequests.find((r) => r.doc_type === tpl.key);
}

function hasUploads(req: DocumentRequest, uploads: DocumentUpload[]): boolean {
  return uploads.some((u) => u.document_request_id === req.id);
}

export function ManageDocumentsPanel({ clientId, mortgageType, documentRequests, uploads }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  const specificTemplates = getApplicableSpecific(mortgageType);
  const allTemplates = [...SHARED_TEMPLATES, ...specificTemplates];

  async function toggleOn(tpl: DocTemplate) {
    setLoadingKey(tpl.key);
    try {
      const res = await fetch(`/api/clients/${clientId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doc_type: tpl.key,
          label: tpl.label,
          proponente: 'shared',
          is_mandatory: tpl.is_mandatory,
          max_files: tpl.max_files,
          sort_order: tpl.sort_order,
        }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        toast.error('Erro ao adicionar documento');
      }
    } finally {
      setLoadingKey(null);
    }
  }

  async function toggleOff(req: DocumentRequest) {
    setLoadingKey(req.doc_type ?? req.id);
    try {
      const res = await fetch(`/api/clients/${clientId}/documents/${req.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json();
        toast.error(data.error ?? 'Erro ao remover documento');
      }
    } finally {
      setLoadingKey(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-1.5 h-8 px-3 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors">
          <Settings2 className="h-3.5 w-3.5" />
          Gerir documentos
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Gerir documentos do processo</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Shared docs */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Documentos do imóvel
            </p>
            <div className="space-y-2">
              {SHARED_TEMPLATES.map((tpl) => {
                const existing = findExistingRequest(tpl, documentRequests);
                const enabled = Boolean(existing);
                const blocked = enabled && existing ? hasUploads(existing, uploads) : false;
                const loading = loadingKey === tpl.key;

                return (
                  <ToggleRow
                    key={tpl.key}
                    label={tpl.label}
                    mandatory={tpl.is_mandatory}
                    enabled={enabled}
                    blocked={blocked}
                    loading={loading}
                    onEnable={() => toggleOn(tpl)}
                    onDisable={() => existing && toggleOff(existing)}
                  />
                );
              })}
            </div>
          </div>

          {/* Specific docs (only shown if applicable) */}
          {specificTemplates.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Documentos específicos do processo
              </p>
              <div className="space-y-2">
                {specificTemplates.map((tpl) => {
                  const existing = findExistingRequest(tpl, documentRequests);
                  const enabled = Boolean(existing);
                  const blocked = enabled && existing ? hasUploads(existing, uploads) : false;
                  const loading = loadingKey === tpl.key;

                  return (
                    <ToggleRow
                      key={tpl.key}
                      label={tpl.label}
                      mandatory={tpl.is_mandatory}
                      enabled={enabled}
                      blocked={blocked}
                      loading={loading}
                      onEnable={() => toggleOn(tpl)}
                      onDisable={() => existing && toggleOff(existing)}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {allTemplates.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-4">
              Nenhum documento opcional disponível para este tipo de crédito.
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
