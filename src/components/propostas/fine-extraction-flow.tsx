'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileText, Loader2, AlertCircle, X, Cpu, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExtractedPropostaData {
  bank_name: string | null;
  rate_type: 'variavel' | 'fixa' | 'mista' | null;
  euribor_index: number | null;
  spread: number | null;
  tan_fixa: number | null;
  prazo_fixo_anos: number | null;
  periodo_fixo_anos: number | null;
  tan_periodo_fixo: number | null;
  spread_pos_fixo: number | null;
  loan_amount: number | null;
  term_months: number | null;
  valor_avaliacao: number | null;
  monthly_payment: number | null;
  tan: number | null;
  taeg: number | null;
  mtic: number | null;
  validade_ate: string | null;
  vida_p1_banco: number | null;
  vida_p1_externa: number | null;
  multiriscos_banco: number | null;
  multiriscos_externa: number | null;
  manutencao_conta: number | null;
  comissao_abertura: number | null;
  comissao_formalizacao: number | null;
  despesas_avaliacao: number | null;
  comissao_avaliacao: number | null;
  despesas_escritura: number | null;
  imposto_selo: number | null;
  registo_predial: number | null;
  condicoes_spread: string[];
  condicoes_pos_fixo: string | null;
}

export interface ExtractionResult {
  id: string;
  status: 'pending' | 'processing' | 'complete' | 'failed';
  extracted_data: ExtractedPropostaData | null;
  confidence_data: Record<string, number> | null;
  error_message: string | null;
  pdf_path: string | null;
}

// ─── Method Choice (Step 0) ────────────────────────────────────────────────────

interface MethodChoiceProps {
  onChooseManual: () => void;
  onChooseFine: () => void;
}

export function MethodChoiceStep({ onChooseManual, onChooseFine }: MethodChoiceProps) {
  const [selected, setSelected] = useState<'fine' | 'manual' | null>(null);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* FINE Upload card */}
        <button
          type="button"
          onClick={() => setSelected('fine')}
          className={cn(
            'text-left p-5 rounded-xl border-2 transition-all flex flex-col gap-3',
            selected === 'fine'
              ? 'border-primary bg-primary/5'
              : 'border-slate-200 bg-white hover:border-slate-300'
          )}
        >
          <div className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center',
            selected === 'fine' ? 'bg-primary/10' : 'bg-slate-100'
          )}>
            <Cpu className={cn('h-5 w-5', selected === 'fine' ? 'text-primary' : 'text-slate-500')} />
          </div>
          <div>
            <p className="font-semibold text-slate-900 text-sm">Upload de FINE (automático)</p>
            <p className="text-xs text-slate-500 mt-1">Carrega o PDF da FINE e extraímos os dados automaticamente.</p>
          </div>
          {selected === 'fine' && (
            <div className="flex justify-end">
              <CheckCircle2 className="h-4 w-4 text-primary" />
            </div>
          )}
        </button>

        {/* Manual entry card */}
        <button
          type="button"
          onClick={() => setSelected('manual')}
          className={cn(
            'text-left p-5 rounded-xl border-2 transition-all flex flex-col gap-3',
            selected === 'manual'
              ? 'border-primary bg-primary/5'
              : 'border-slate-200 bg-white hover:border-slate-300'
          )}
        >
          <div className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center',
            selected === 'manual' ? 'bg-primary/10' : 'bg-slate-100'
          )}>
            <FileText className={cn('h-5 w-5', selected === 'manual' ? 'text-primary' : 'text-slate-500')} />
          </div>
          <div>
            <p className="font-semibold text-slate-900 text-sm">Inserção manual</p>
            <p className="text-xs text-slate-500 mt-1">Preenche cada campo manualmente.</p>
          </div>
          {selected === 'manual' && (
            <div className="flex justify-end">
              <CheckCircle2 className="h-4 w-4 text-primary" />
            </div>
          )}
        </button>
      </div>

      <div className="flex justify-end">
        <Button
          type="button"
          disabled={!selected}
          onClick={() => {
            if (selected === 'fine') onChooseFine();
            else if (selected === 'manual') onChooseManual();
          }}
        >
          Continuar →
        </Button>
      </div>
    </div>
  );
}

// ─── FINE Dropzone ─────────────────────────────────────────────────────────────

interface FineUploadStepProps {
  processId: string;
  onExtractionStarted: (extractionId: string, fileName: string) => void;
  onBack: () => void;
}

export function FineUploadStep({ processId, onExtractionStarted, onBack }: FineUploadStepProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(f: File) {
    if (f.type !== 'application/pdf') {
      toast.error('Apenas ficheiros PDF são aceites');
      return;
    }
    setFile(f);
  }

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('process_id', processId);
      const res = await fetch('/api/proposta-extractions', { method: 'POST', body: fd });
      if (!res.ok) {
        const err = await res.json() as { error?: string };
        throw new Error(err.error ?? 'Erro ao iniciar extração');
      }
      const { extraction_id } = await res.json() as { extraction_id: string };
      onExtractionStarted(extraction_id, file.name);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao fazer upload');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Dropzone */}
      <div
        className={cn(
          'border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer',
          dragOver ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-slate-300 bg-slate-50'
        )}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
        {file ? (
          <div className="flex items-center justify-center gap-3">
            <FileText className="h-8 w-8 text-primary shrink-0" />
            <div className="text-left">
              <p className="text-sm font-medium text-slate-900 truncate max-w-xs">{file.name}</p>
              <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(0)} KB</p>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setFile(null); }}
              className="ml-2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <Upload className="h-8 w-8 text-slate-400 mx-auto" />
            <p className="text-sm font-medium text-slate-700">Arrasta o PDF da FINE aqui</p>
            <p className="text-xs text-slate-400">ou clica para selecionar o ficheiro</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <button type="button" onClick={onBack} className="text-sm text-slate-400 hover:text-slate-600">
          ← Voltar
        </button>
        <Button type="button" disabled={!file || uploading} onClick={handleUpload}>
          {uploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />A enviar…</> : 'Analisar FINE →'}
        </Button>
      </div>
    </div>
  );
}

// ─── Processing Screen ─────────────────────────────────────────────────────────

interface ProcessingScreenProps {
  extractionId: string;
  fileName: string;
  backUrl: string;
  onComplete: (result: ExtractionResult) => void;
}

export function ExtractionProcessingScreen({
  extractionId,
  fileName,
  backUrl,
  onComplete,
}: ProcessingScreenProps) {
  const router = useRouter();
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const [failed, setFailed] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleStatus = useCallback((status: string, data: ExtractionResult) => {
    if (status === 'complete') {
      onCompleteRef.current(data);
    } else if (status === 'failed') {
      setFailed(true);
      setErrorMsg(data.error_message ?? 'Erro desconhecido');
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    const checkStatus = async (): Promise<boolean> => {
      try {
        const res = await fetch(`/api/proposta-extractions/${extractionId}`, {
          cache: 'no-store',
        });
        if (!res.ok) return false;
        const data = await res.json() as ExtractionResult;
        if (data.status === 'complete' || data.status === 'failed') {
          handleStatus(data.status, data);
          return true;
        }
      } catch { /* network error — retry */ }
      return false;
    };

    // Check immediately on mount (catches already-complete extractions)
    void (async () => {
      if (cancelled) return;
      const done = await checkStatus();
      if (done || cancelled) return;

      // Poll every 3s as fallback
      const poll = async () => {
        if (cancelled) return;
        const done = await checkStatus();
        if (!done && !cancelled) setTimeout(poll, 3000);
      };
      setTimeout(poll, 3000);
    })();

    // Also listen via Realtime for faster detection
    const channel = supabase
      .channel(`extraction-${extractionId}`)
      .on(
        'postgres_changes' as any,
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'proposta_extractions',
          filter: `id=eq.${extractionId}`,
        },
        (payload: any) => {
          const row = payload.new as ExtractionResult & { status: string };
          if (row.status === 'complete' || row.status === 'failed') {
            handleStatus(row.status, row as ExtractionResult);
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [extractionId, handleStatus]);

  if (failed) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
        <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
          <AlertCircle className="h-7 w-7 text-red-500" />
        </div>
        <h2 className="text-lg font-semibold text-slate-900">Falhou a análise da FINE</h2>
        <p className="text-sm text-slate-500 max-w-sm">{errorMsg}</p>
        <div className="flex gap-3 mt-2">
          <Button variant="outline" onClick={() => router.push(backUrl)}>Voltar ao processo</Button>
          <Button onClick={() => window.location.reload()}>Tentar novamente</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-5 text-center">
      <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-slate-900">A analisar FINE…</h2>
        <p className="text-sm text-slate-500 mt-1 max-w-sm">
          Isto pode demorar 10–30 segundos. Podes esperar nesta página ou voltar mais tarde — a proposta vai aparecer no processo quando estiver pronta para validação.
        </p>
      </div>
      <p className="text-xs text-slate-400 font-medium truncate max-w-xs">{fileName}</p>
      <div className="flex gap-3 mt-2">
        <Button variant="outline" size="sm" onClick={() => router.push(backUrl)}>
          Voltar ao processo
        </Button>
        <Button variant="ghost" size="sm" disabled className="text-slate-400 cursor-default">
          Continuar a aguardar
        </Button>
      </div>
    </div>
  );
}
