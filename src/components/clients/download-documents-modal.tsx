'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { DocumentRequest, DocumentUpload } from './client-detail-tabs';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  em_analise: 'Em análise',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
};

const STATUS_CLASSES: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-600',
  em_analise: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

interface Row {
  upload: DocumentUpload;
  request: DocumentRequest;
}

interface Props {
  clientId: string;
  clientName: string;
  documentRequests: DocumentRequest[];
  uploads: DocumentUpload[];
}

export function DownloadDocumentsModal({ clientId, clientName, documentRequests, uploads }: Props) {
  // Only show requests that have at least one upload
  const requestsWithUploads = documentRequests.filter((req) =>
    uploads.some((u) => u.document_request_id === req.id)
  );

  // Flat list: one row per upload file
  const rows: Row[] = requestsWithUploads.flatMap((req) =>
    uploads
      .filter((u) => u.document_request_id === req.id)
      .map((u) => ({ upload: u, request: req }))
  );

  const allIds = rows.map((r) => r.upload.id);

  const [open, setOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(allIds));
  const [downloading, setDownloading] = useState(false);

  if (rows.length === 0) return null;

  const allSelected = selectedIds.size === allIds.length && allIds.length > 0;

  function handleOpenChange(v: boolean) {
    setOpen(v);
    if (v) {
      // Reset selection when opening
      setSelectedIds(new Set(allIds));
    }
  }

  function toggleAll() {
    setSelectedIds(allSelected ? new Set() : new Set(allIds));
  }

  function toggleId(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  }

  async function handleDownload() {
    if (selectedIds.size === 0) return;
    setDownloading(true);
    try {
      const ids = Array.from(selectedIds).join(',');
      const res = await fetch(
        `/api/clients/${clientId}/documents/download-all?ids=${ids}`
      );
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `homeflux-${clientName}-documentos.zip`;
        a.click();
        URL.revokeObjectURL(url);
        setOpen(false);
      }
    } finally {
      setDownloading(false);
    }
  }

  const n = selectedIds.size;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-1.5" />
          Descarregar todos
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Descarregar documentos</DialogTitle>
        </DialogHeader>

        <div className="mt-2 space-y-3">
          {/* Select all row */}
          <label className="flex items-center gap-3 px-3 py-2 bg-slate-50 rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="h-4 w-4 rounded border-slate-300"
            />
            <span className="text-sm font-medium text-slate-700 flex-1">Selecionar todos</span>
            <span className="text-xs text-slate-400">
              {rows.length} ficheiro{rows.length !== 1 ? 's' : ''}
            </span>
          </label>

          {/* File rows */}
          <div className="max-h-64 overflow-y-auto space-y-0.5 border border-slate-100 rounded-lg">
            {rows.map(({ upload, request }) => (
              <label
                key={upload.id}
                className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(upload.id)}
                  onChange={() => toggleId(upload.id)}
                  className="h-4 w-4 rounded border-slate-300 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-800 truncate">{request.label}</p>
                  <p className="text-xs text-slate-400 truncate">
                    {upload.file_name ?? '—'}
                  </p>
                </div>
                <span
                  className={`shrink-0 text-[11px] font-medium px-1.5 py-0.5 rounded-full ${
                    STATUS_CLASSES[request.status] ?? STATUS_CLASSES.pending
                  }`}
                >
                  {STATUS_LABELS[request.status] ?? request.status}
                </span>
              </label>
            ))}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-sm text-slate-400">
              {n} de {rows.length} selecionado{n !== 1 ? 's' : ''}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleDownload}
                disabled={downloading || n === 0}
              >
                {downloading ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-1.5" />
                )}
                Descarregar {n} ficheiro{n !== 1 ? 's' : ''}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
