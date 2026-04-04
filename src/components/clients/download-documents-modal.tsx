'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import type { DocumentRequest, DocumentUpload } from './client-detail-tabs';

const STATUS_LABELS: Record<string, string> = {
  pending:    'Pendente',
  em_analise: 'Em análise',
  approved:   'Aprovado',
  rejected:   'Rejeitado',
};

const STATUS_CLASSES: Record<string, string> = {
  pending:    'bg-gray-100 text-gray-600',
  em_analise: 'bg-amber-100 text-amber-700',
  approved:   'bg-green-100 text-green-700',
  rejected:   'bg-red-100 text-red-700',
};

const PROPONENTE_LABELS: Record<string, string> = {
  p1:     'P1',
  p2:     'P2',
  shared: 'Partilhado',
};

interface RowItem {
  request: DocumentRequest;
  uploadIds: string[];
  fileCount: number;
}

interface Props {
  clientId: string;
  clientName: string;
  documentRequests: DocumentRequest[];
  uploads: DocumentUpload[];
}

export function DownloadDocumentsModal({ clientId, clientName, documentRequests, uploads }: Props) {
  // One row per document_request that has ≥1 upload
  const rows: RowItem[] = documentRequests
    .map((req) => {
      const reqUploads = uploads.filter((u) => u.document_request_id === req.id);
      return { request: req, uploadIds: reqUploads.map((u) => u.id), fileCount: reqUploads.length };
    })
    .filter((r) => r.fileCount > 0);

  const allUploadIds = rows.flatMap((r) => r.uploadIds);

  const [open, setOpen] = useState(false);
  const [selectedRequestIds, setSelectedRequestIds] = useState<Set<string>>(new Set(rows.map((r) => r.request.id)));
  const [downloading, setDownloading] = useState(false);

  if (rows.length === 0) return null;

  const allSelected = selectedRequestIds.size === rows.length;
  void allUploadIds;

  function handleOpenChange(v: boolean) {
    setOpen(v);
    if (v) setSelectedRequestIds(new Set(rows.map((r) => r.request.id)));
  }

  function toggleAll() {
    setSelectedRequestIds(allSelected ? new Set() : new Set(rows.map((r) => r.request.id)));
  }

  function toggleRequest(reqId: string) {
    const next = new Set(selectedRequestIds);
    if (next.has(reqId)) next.delete(reqId); else next.add(reqId);
    setSelectedRequestIds(next);
  }

  // Collect upload IDs from selected requests
  const selectedUploadIds = rows
    .filter((r) => selectedRequestIds.has(r.request.id))
    .flatMap((r) => r.uploadIds);

  const totalFiles = rows
    .filter((r) => selectedRequestIds.has(r.request.id))
    .reduce((sum, r) => sum + r.fileCount, 0);

  async function handleDownload() {
    if (selectedUploadIds.length === 0) return;
    setDownloading(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/documents/download-zip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadIds: selectedUploadIds }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `HomeFlux_${clientName}_documentos.zip`;
        a.click();
        URL.revokeObjectURL(url);
        setOpen(false);
      }
    } finally {
      setDownloading(false);
    }
  }

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
          {/* Select all */}
          <label className="flex items-center gap-3 px-3 py-2 bg-slate-50 rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="h-4 w-4 rounded border-slate-300"
            />
            <span className="text-sm font-medium text-slate-700 flex-1">Selecionar todos</span>
            <span className="text-xs text-slate-400">
              {rows.reduce((s, r) => s + r.fileCount, 0)} ficheiro{rows.reduce((s, r) => s + r.fileCount, 0) !== 1 ? 's' : ''}
            </span>
          </label>

          {/* Request rows */}
          <div className="max-h-72 overflow-y-auto space-y-0.5 border border-slate-100 rounded-lg">
            {rows.map(({ request, fileCount }) => (
              <label
                key={request.id}
                className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedRequestIds.has(request.id)}
                  onChange={() => toggleRequest(request.id)}
                  className="h-4 w-4 rounded border-slate-300 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-800 truncate">{request.label}</p>
                  <p className="text-xs text-slate-400">
                    {fileCount} ficheiro{fileCount !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                    {PROPONENTE_LABELS[request.proponente] ?? request.proponente}
                  </span>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${STATUS_CLASSES[request.status] ?? STATUS_CLASSES.pending}`}>
                    {STATUS_LABELS[request.status] ?? request.status}
                  </span>
                </div>
              </label>
            ))}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-sm text-slate-400">
              {totalFiles} ficheiro{totalFiles !== 1 ? 's' : ''} selecionado{totalFiles !== 1 ? 's' : ''}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button size="sm" onClick={handleDownload} disabled={downloading || totalFiles === 0}>
                {downloading ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Download className="h-4 w-4 mr-1.5" />}
                Descarregar {totalFiles} ficheiro{totalFiles !== 1 ? 's' : ''}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
