'use client';

import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import {
  Upload,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  Download,
  AlertCircle,
  Trash2,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { formatDate, formatDateTime } from '@/lib/utils';
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

type Proposta = {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
};

interface PortalViewProps {
  clientId: string;
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
  clientId,
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
          <TabsContent value="propostas" className="space-y-2.5">
            {propostas.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl py-14 text-center">
                <FileText className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                <p className="text-sm text-slate-400">{t('noPropostas')}</p>
              </div>
            ) : (
              propostas.map((proposta) => (
                <div
                  key={proposta.id}
                  className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between gap-3"
                >
                  <div>
                    <p className="font-medium text-sm text-slate-900">
                      {proposta.title || t('untitledProposta')}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">{formatDateTime(proposta.updated_at)}</p>
                  </div>
                  <a
                    href={`/api/portal/${portalToken}/propostas/${proposta.id}/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 h-8 px-3 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors shrink-0"
                  >
                    <Download className="h-3.5 w-3.5" />
                    PDF
                  </a>
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
