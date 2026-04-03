'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Plus, Download, Upload, Check, X, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { DocumentRequest, DocumentUpload } from './client-detail-tabs';
import { ManageDocumentsPanel } from './manage-documents-panel';

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

const STATUS_CONFIG = {
  pending:    { label: 'pending',    className: 'bg-gray-100 text-gray-700' },
  em_analise: { label: 'em_analise', className: 'bg-amber-100 text-amber-700' },
  approved:   { label: 'approved',   className: 'bg-green-100 text-green-700' },
  rejected:   { label: 'rejected',   className: 'bg-red-100 text-red-700' },
} as const;

const STATUS_SORT: Record<string, number> = {
  rejected: 0,
  pending: 1,
  em_analise: 2,
  approved: 3,
};

export function DocumentsTab({ client, documentRequests, uploads, officeId }: Props) {
  const t = useTranslations('documents');
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newProponente, setNewProponente] = useState<'p1' | 'p2' | 'shared'>('shared');
  const [newMandatory, setNewMandatory] = useState(true);
  const [newMaxFiles, setNewMaxFiles] = useState(5);
  const [addingDoc, setAddingDoc] = useState(false);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);

  const groups = {
    p1: documentRequests.filter((r) => r.proponente === 'p1'),
    p2: documentRequests.filter((r) => r.proponente === 'p2'),
    shared: documentRequests.filter((r) => r.proponente === 'shared'),
  };

  const uploadsForRequest = (requestId: string) =>
    uploads.filter((u) => u.document_request_id === requestId);

  async function addDocumentRequest() {
    if (!newLabel.trim()) return;
    setAddingDoc(true);
    try {
      const res = await fetch(`/api/clients/${client.id}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: newLabel,
          proponente: newProponente,
          is_mandatory: newMandatory,
          max_files: newMaxFiles,
        }),
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

  async function handleFileUpload(requestId: string, files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploadingFor(requestId);
    const supabase = createClient();
    try {
      for (const file of Array.from(files)) {
        const path = `${officeId}/${client.id}/${requestId}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('client-documents')
          .upload(path, file);
        if (uploadError) {
          toast.error(uploadError.message);
          continue;
        }
        await fetch(`/api/clients/${client.id}/documents/${requestId}/uploads`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            storage_path: path,
            file_name: file.name,
            file_size: file.size,
            mime_type: file.type,
            uploaded_by: 'broker',
          }),
        });
      }
      toast.success(t('uploadFile'));
      router.refresh();
    } finally {
      setUploadingFor(null);
    }
  }

  async function updateDocStatus(requestId: string, status: 'approved' | 'rejected') {
    await fetch(`/api/clients/${client.id}/documents/${requestId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    router.refresh();
  }

  async function downloadFile(storagePath: string, fileName: string) {
    const supabase = createClient();
    const { data } = await supabase.storage
      .from('client-documents')
      .createSignedUrl(storagePath, 3600);
    if (data?.signedUrl) {
      const a = document.createElement('a');
      a.href = data.signedUrl;
      a.download = fileName;
      a.click();
    }
  }

  async function downloadAll() {
    setDownloadingAll(true);
    try {
      const res = await fetch(`/api/clients/${client.id}/documents/download-all`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `homeflux-${client.p1_name}-docs.zip`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } finally {
      setDownloadingAll(false);
    }
  }

  function renderDocRow(req: DocumentRequest) {
    const reqUploads = uploadsForRequest(req.id);
    const statusConfig = STATUS_CONFIG[req.status] ?? STATUS_CONFIG.pending;
    return (
      <Card key={req.id} className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">{req.label}</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.className}`}>
                  {t(statusConfig.label as Parameters<typeof t>[0])}
                </span>
                {req.is_mandatory
                  ? <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{t('mandatory')}</span>
                  : <span className="text-xs text-muted-foreground">{t('optional')}</span>
                }
              </div>
              {req.description && (
                <p className="text-xs text-muted-foreground mt-1">{req.description}</p>
              )}
              {reqUploads.length > 0 && (
                <div className="mt-3 space-y-1">
                  {reqUploads.map((upload) => (
                    <div key={upload.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <FileText className="h-3 w-3 shrink-0" />
                      <span className="truncate">{upload.file_name}</span>
                      <button
                        onClick={() => downloadFile(upload.storage_path, upload.file_name ?? 'file')}
                        className="ml-auto text-primary hover:underline shrink-0"
                      >
                        {t('downloadFile')}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <label className="cursor-pointer">
                <input
                  type="file"
                  multiple
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                  onChange={(e) => handleFileUpload(req.id, e.target.files)}
                  disabled={uploadingFor === req.id}
                />
                <Button variant="outline" size="sm" asChild>
                  <span>
                    {uploadingFor === req.id
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <Upload className="h-3.5 w-3.5" />
                    }
                  </span>
                </Button>
              </label>
              {req.status === 'em_analise' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-green-600 hover:text-green-700"
                  onClick={() => updateDocStatus(req.id, 'approved')}
                >
                  <Check className="h-3.5 w-3.5" />
                </Button>
              )}
              {req.status === 'em_analise' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-500 hover:text-red-600"
                  onClick={() => updateDocStatus(req.id, 'rejected')}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
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
    return (
      <div className="space-y-3">
        {documentRequests.some((r) => r.proponente !== 'shared') && (
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{label}</h3>
        )}
        {sorted.map((req) => renderDocRow(req))}
      </div>
    );
  }

  return (
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
                  <Select
                    value={newProponente}
                    onValueChange={(v) => setNewProponente(v as typeof newProponente)}
                  >
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
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={newMaxFiles}
                    onChange={(e) => setNewMaxFiles(Number(e.target.value))}
                  />
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

        {uploads.length > 0 && (
          <Button variant="outline" size="sm" onClick={downloadAll} disabled={downloadingAll}>
            {downloadingAll
              ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              : <Download className="h-4 w-4 mr-1.5" />
            }
            {t('downloadAll')}
          </Button>
        )}
      </div>

      {/* Document groups */}
      {documentRequests.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          {t('noDocuments')}
        </div>
      ) : (
        <div className="space-y-6">
          {renderGroup(t('shared'), groups.shared)}
          {renderGroup(client.p1_name, groups.p1)}
          {client.p2_name ? renderGroup(client.p2_name, groups.p2) : null}
        </div>
      )}
    </div>
  );
}
