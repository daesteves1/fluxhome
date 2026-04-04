'use client';

import { useEffect, useState } from 'react';
import { X, Download, Loader2, FileText, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DocumentViewerProps {
  uploadId: string | null;
  fileName: string | null;
  label: string;
  onClose: () => void;
}

type ViewerState =
  | { type: 'loading' }
  | { type: 'ready'; url: string; mimeHint: string }
  | { type: 'error'; message: string };

function getMimeHint(fileName: string | null): string {
  if (!fileName) return 'other';
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf') return 'pdf';
  if (['jpg', 'jpeg', 'png', 'webp', 'heic', 'gif'].includes(ext)) return 'image';
  return 'other';
}

export function DocumentViewer({ uploadId, fileName, label, onClose }: DocumentViewerProps) {
  const [state, setState] = useState<ViewerState>({ type: 'loading' });

  useEffect(() => {
    if (!uploadId) return;
    setState({ type: 'loading' });
    fetch(`/api/documents/${uploadId}/signed-url`)
      .then((r) => r.json())
      .then((json: { url?: string; error?: string }) => {
        if (json.url) {
          setState({ type: 'ready', url: json.url, mimeHint: getMimeHint(fileName) });
        } else {
          setState({ type: 'error', message: json.error ?? 'Erro ao carregar ficheiro' });
        }
      })
      .catch(() => setState({ type: 'error', message: 'Erro de rede' }));
  }, [uploadId, fileName]);

  function handleDownload() {
    if (state.type !== 'ready') return;
    const a = document.createElement('a');
    a.href = state.url;
    a.download = fileName ?? 'document';
    a.target = '_blank';
    a.click();
  }

  if (!uploadId) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div className={cn(
        'fixed top-0 right-0 h-full z-50 flex flex-col bg-white shadow-2xl',
        'w-full md:w-[600px]',
        'transition-transform duration-300 ease-out'
      )}>
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b bg-white shrink-0">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 truncate">{label}</p>
            <p className="text-sm font-semibold text-gray-900 truncate">{fileName ?? 'Documento'}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {state.type === 'ready' && (
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-1.5" />
                Descarregar
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden bg-gray-100">
          {state.type === 'loading' && (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          )}

          {state.type === 'error' && (
            <div className="h-full flex flex-col items-center justify-center gap-3 px-8 text-center">
              <AlertCircle className="h-10 w-10 text-red-400" />
              <p className="text-sm text-gray-600">{state.message}</p>
            </div>
          )}

          {state.type === 'ready' && state.mimeHint === 'pdf' && (
            <iframe
              src={state.url}
              className="w-full h-full border-0"
              title={fileName ?? 'PDF'}
            />
          )}

          {state.type === 'ready' && state.mimeHint === 'image' && (
            <div className="h-full flex items-center justify-center overflow-auto p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={state.url}
                alt={fileName ?? 'Imagem'}
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
              />
            </div>
          )}

          {state.type === 'ready' && state.mimeHint === 'other' && (
            <div className="h-full flex flex-col items-center justify-center gap-4 px-8 text-center">
              <FileText className="h-12 w-12 text-gray-300" />
              <div>
                <p className="text-sm font-medium text-gray-600">Pré-visualização não disponível para este formato</p>
                <p className="text-xs text-gray-400 mt-1">{fileName}</p>
              </div>
              <Button onClick={handleDownload}>
                <Download className="h-4 w-4 mr-1.5" />
                Descarregar ficheiro
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
