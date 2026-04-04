'use client';

import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Plus, Upload, Check, X, FileText, Loader2, Download, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import type { DocumentRequest, DocumentUpload } from './client-detail-tabs';
import { ManageDocumentsPanel } from './manage-documents-panel';
import { DownloadDocumentsModal } from './download-documents-modal';
import { DocumentViewer } from '@/components/documents/document-viewer';

interface Client {
  id: string;
  p1_name: string;
  p2_name: string | null;
  mortgage_type?: string | null;
  [key: string]: unknown;
}

interface Props {
  client: Client;
  documentRequests: DocumentRequest[];
  uploads: DocumentUpload[];
  officeId: string;
}

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

const STATUS_SORT: Record<string, number> = {
  rejected: 0,
  pending: 1,
  em_analise: 2,
  approved: 3,
};

export function DocumentsTab({ client, documentRequests, uploads, officeId }: Props) {
  const t = useTranslations('documents');
  const router = useRouter();

  // Add document dialog
  const [addOpen, setAddOpen] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newProponente, setNewProponente] = useState<'p1' | 'p2' | 'shared'>('shared');
  const [newMandatory, setNewMandatory] = useState(true);
  const [newMaxFiles, setNewMaxFiles] = useState(5);
  const [addingDoc, setAddingDoc] = useState(false);

  // Action loading states
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [undoingId, setUndoingId] = useState<string | null>(null);

  // Reject inline form
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [submittingReject, setSubmittingReject] = useState(false);

  // Document viewer
  const [viewer, setViewer] = useState<{ uploadId: string; fileName: string | null; label: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeUploadReqRef = useRef<string | null>(null);

  const groups = {
    p1:     documentRequests.filter((r) => r.proponente === 'p1'),
    p2:     documentRequests.filter((r) => r.proponente === 'p2'),
    shared: documentRequests.filter((r) => r.proponente === 'shared'),
  };

  const uploadsForRequest = (requestId: string) =>
    uploads.filter((u) => u.document_request_id === requestId);

  // ── Add document ──────────────────────────────────────────────────────────
  async function addDocumentRequest() {
    if (!newLabel.trim()) return;
    setAddingDoc(true);
    try {
      const res = await fetch(`/api/clients/${client.id}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: newLabel, proponente: newProponente, is_mandatory: newMandatory, max_files: newMaxFiles }),
      });
      if (res.ok) {
        toast.success(t('addRequest'));
        setAddOpen(false);
        setNewLabel('');
        router.refresh();
      }
    } finally {
      setAddingDoc(false);
    }
  }

  // ── Broker-side file upload ───────────────────────────────────────────────
  function triggerUpload(requestId: string) {
    activeUploadReqRef.current = requestId;
    if (fileInputRef.current) { fileInputRef.current.value = ''; fileInputRef.current.click(); }
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    const requestId = activeUploadReqRef.current;
    if (!files || files.length === 0 || !requestId) return;
    activeUploadReqRef.current = null;
    setUploadingFor(requestId);
    try {
      for (const file of Array.from(files)) {
        const path = `${officeId}/${client.id}/${requestId}/${Date.now()}_${file.name}`;
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        const { error: uploadError } = await supabase.storage.from('client-documents').upload(path, file);
        if (uploadError) { toast.error(uploadError.message); continue; }
        await fetch(`/api/clients/${client.id}/documents/${requestId}/uploads`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ storage_path: path, file_name: file.name, file_size: file.size, mime_type: file.type, uploaded_by: 'broker' }),
        });
      }
      toast.success(t('uploadFile'));
      router.refresh();
    } finally {
      setUploadingFor(null);
    }
  }

  // ── Approve ───────────────────────────────────────────────────────────────
  async function handleApprove(requestId: string) {
    setApprovingId(requestId);
    try {
      const res = await fetch(`/api/clients/${client.id}/documents/${requestId}/approve`, { method: 'PATCH' });
      const json = await res.json() as { ok?: boolean; advanced?: boolean; error?: string };
      if (!res.ok) { toast.error(json.error ?? 'Erro'); return; }
      toast.success('Documento aprovado');
      if (json.advanced) {
        toast.success('Todos os documentos obrigatórios aprovados — processo avançado para Docs. Completos', { duration: 5000 });
      }
      router.refresh();
    } finally {
      setApprovingId(null);
    }
  }

  // ── Reject ────────────────────────────────────────────────────────────────
  function openReject(requestId: string) {
    setRejectingId(requestId);
    setRejectReason('');
  }
  function cancelReject() { setRejectingId(null); setRejectReason(''); }

  async function confirmReject(requestId: string) {
    if (!rejectReason.trim()) { toast.error('Introduza o motivo da rejeição'); return; }
    setSubmittingReject(true);
    try {
      const res = await fetch(`/api/clients/${client.id}/documents/${requestId}/reject`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason }),
      });
      if (!res.ok) { const j = await res.json() as { error?: string }; toast.error(j.error ?? 'Erro'); return; }
      toast.success('Documento rejeitado');
      setRejectingId(null);
      setRejectReason('');
      router.refresh();
    } finally {
      setSubmittingReject(false);
    }
  }

  // ── Undo ──────────────────────────────────────────────────────────────────
  async function handleUndo(requestId: string) {
    setUndoingId(requestId);
    try {
      const res = await fetch(`/api/clients/${client.id}/documents/${requestId}/undo`, { method: 'PATCH' });
      if (!res.ok) { const j = await res.json() as { error?: string }; toast.error(j.error ?? 'Erro'); return; }
      toast.success('Anulado');
      router.refresh();
    } finally {
      setUndoingId(null);
    }
  }

  // ── Download single file ───────────────────────────────────────────────────
  async function downloadFile(uploadId: string, fileName: string) {
    const res = await fetch(`/api/documents/${uploadId}/signed-url`);
    const json = await res.json() as { url?: string };
    if (json.url) {
      const a = document.createElement('a');
      a.href = json.url;
      a.download = fileName;
      a.target = '_blank';
      a.click();
    }
  }

  // ── Row render ────────────────────────────────────────────────────────────
  function renderDocRow(req: DocumentRequest) {
    const reqUploads = uploadsForRequest(req.id);
    const isRejecting = rejectingId === req.id;

    return (
      <div key={req.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {/* Header row */}
        <div className="flex items-start gap-3 px-4 py-3">
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-gray-900">{req.label}</span>
              {req.is_mandatory
                ? <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">Obrigatório</span>
                : <span className="text-[11px] text-gray-400">Opcional</span>
              }
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${STATUS_CLASSES[req.status] ?? STATUS_CLASSES.pending}`}>
                {STATUS_LABELS[req.status] ?? req.status}
              </span>
            </div>

            {/* Uploaded files */}
            {reqUploads.length > 0 && (
              <div className="space-y-1 pt-1">
                {reqUploads.map((u) => (
                  <div key={u.id} className="flex items-center gap-2 text-xs text-gray-500">
                    <FileText className="h-3 w-3 shrink-0 text-gray-400" />
                    <span className="truncate flex-1 max-w-[200px]">{u.file_name ?? '—'}</span>
                    <span className="text-gray-400 shrink-0">{u.uploaded_at ? new Date(u.uploaded_at).toLocaleDateString('pt-PT') : ''}</span>
                    <button
                      onClick={() => setViewer({ uploadId: u.id, fileName: u.file_name, label: req.label })}
                      className="text-blue-600 hover:underline shrink-0"
                    >
                      Ver
                    </button>
                    <button
                      onClick={() => downloadFile(u.id, u.file_name ?? 'file')}
                      className="text-blue-600 hover:underline shrink-0"
                    >
                      <Download className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
            {/* Upload — always shown */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => triggerUpload(req.id)}
              disabled={uploadingFor === req.id}
              title="Carregar ficheiro"
            >
              {uploadingFor === req.id
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Upload className="h-3.5 w-3.5" />
              }
            </Button>

            {/* em_analise actions */}
            {req.status === 'em_analise' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-green-600 hover:text-green-700 hover:border-green-300"
                  onClick={() => handleApprove(req.id)}
                  disabled={approvingId === req.id}
                  title="Aprovar"
                >
                  {approvingId === req.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-500 hover:text-red-600 hover:border-red-300"
                  onClick={() => openReject(req.id)}
                  title="Rejeitar"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </>
            )}

            {/* approved actions */}
            {req.status === 'approved' && reqUploads.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-gray-600 text-xs"
                onClick={() => handleUndo(req.id)}
                disabled={undoingId === req.id}
                title="Anular aprovação"
              >
                {undoingId === req.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
              </Button>
            )}

            {/* rejected actions */}
            {req.status === 'rejected' && (
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-gray-600 text-xs"
                onClick={() => handleUndo(req.id)}
                disabled={undoingId === req.id}
                title="Anular rejeição"
              >
                {undoingId === req.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
              </Button>
            )}
          </div>
        </div>

        {/* Rejection reason shown when rejected */}
        {req.status === 'rejected' && req.broker_notes && !isRejecting && (
          <div className="px-4 pb-3">
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              <span className="font-medium">Motivo:</span> {req.broker_notes}
            </p>
          </div>
        )}

        {/* Inline reject form */}
        {isRejecting && (
          <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-2">
            <Label className="text-xs font-medium text-gray-700">Motivo da rejeição *</Label>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Explique o motivo da rejeição para o cliente…"
              rows={2}
              className="text-sm"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={cancelReject}>Cancelar</Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => confirmReject(req.id)}
                disabled={submittingReject || !rejectReason.trim()}
              >
                {submittingReject ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                Confirmar rejeição
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderGroup(label: string, requests: DocumentRequest[]) {
    if (requests.length === 0) return null;
    const sorted = [...requests].sort((a, b) => {
      const ag = STATUS_SORT[a.status] ?? 99;
      const bg = STATUS_SORT[b.status] ?? 99;
      if (ag !== bg) return ag - bg;
      return a.sort_order - b.sort_order;
    });
    const hasMultipleGroups = documentRequests.some((r) => r.proponente !== 'shared');
    return (
      <div className="space-y-2">
        {hasMultipleGroups && (
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</h3>
        )}
        {sorted.map((req) => renderDocRow(req))}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-5">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ManageDocumentsPanel
              clientId={client.id}
              mortgageType={(client.mortgage_type as string | null) ?? null}
              documentRequests={documentRequests}
              uploads={uploads}
            />

            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-1.5" />
                  {t('addRequest')}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('addDocumentRequest')}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-2">
                  <div className="space-y-2">
                    <Label>{t('label')}</Label>
                    <Input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('proponente')}</Label>
                    <Select value={newProponente} onValueChange={(v) => setNewProponente(v as typeof newProponente)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="shared">{t('shared')}</SelectItem>
                        <SelectItem value="p1">{t('p1')}</SelectItem>
                        {client.p2_name && <SelectItem value="p2">{t('p2')}</SelectItem>}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch checked={newMandatory} onCheckedChange={setNewMandatory} />
                    <Label>{t('isMandatory')}</Label>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('maxFiles')}</Label>
                    <Input type="number" min={1} max={20} value={newMaxFiles} onChange={(e) => setNewMaxFiles(Number(e.target.value))} />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setAddOpen(false)}>Cancelar</Button>
                    <Button onClick={addDocumentRequest} disabled={addingDoc || !newLabel.trim()}>
                      {addingDoc ? <Loader2 className="h-4 w-4 animate-spin" /> : t('addRequest')}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <DownloadDocumentsModal
            clientId={client.id}
            clientName={client.p1_name}
            documentRequests={documentRequests}
            uploads={uploads}
          />
        </div>

        {/* Document groups */}
        {documentRequests.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">{t('noDocuments')}</div>
        ) : (
          <div className="space-y-6">
            {renderGroup(t('shared'), groups.shared)}
            {renderGroup(client.p1_name, groups.p1)}
            {client.p2_name ? renderGroup(client.p2_name, groups.p2) : null}
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.doc,.docx"
        onChange={handleFileSelected}
      />

      {/* Document viewer slide-over */}
      {viewer && (
        <DocumentViewer
          uploadId={viewer.uploadId}
          fileName={viewer.fileName}
          label={viewer.label}
          onClose={() => setViewer(null)}
        />
      )}
    </>
  );
}
