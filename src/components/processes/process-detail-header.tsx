'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Check, Calendar } from 'lucide-react';
import { ProcessStepBadge } from '@/components/dashboard/process-step-badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn, formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import type { ProcessStep, ProcessTipo } from '@/types/database';

const TIPO_LABELS: Record<ProcessTipo, string> = {
  credito_habitacao: 'Crédito Habitação',
  renegociacao: 'Renegociação',
  construcao: 'Construção',
  outro: 'Outro',
};

const TIPO_COLORS: Record<ProcessTipo, string> = {
  credito_habitacao: 'bg-blue-100 text-blue-700',
  renegociacao: 'bg-amber-100 text-amber-700',
  construcao: 'bg-teal-100 text-teal-700',
  outro: 'bg-slate-100 text-slate-600',
};

const STEP_META = [
  { key: 'docs_pending' as ProcessStep,   label: 'Docs. Pendentes',    short: 'Docs. Pend.', circle: 'bg-amber-500',  line: 'bg-amber-400',  ring: 'ring-amber-300' },
  { key: 'docs_complete' as ProcessStep,  label: 'Docs. Completos',    short: 'Docs. Comp.', circle: 'bg-blue-500',   line: 'bg-blue-400',   ring: 'ring-blue-300' },
  { key: 'propostas_sent' as ProcessStep, label: 'Propostas Enviadas', short: 'Propostas',   circle: 'bg-purple-500', line: 'bg-purple-400', ring: 'ring-purple-300' },
  { key: 'approved' as ProcessStep,       label: 'Aprovado',           short: 'Aprovado',    circle: 'bg-green-500',  line: 'bg-green-400',  ring: 'ring-green-300' },
  { key: 'closed' as ProcessStep,         label: 'Fechado',            short: 'Fechado',     circle: 'bg-slate-600',  line: 'bg-slate-500',  ring: 'ring-slate-400' },
];

interface Props {
  process: {
    id: string;
    tipo: ProcessTipo;
    process_step: ProcessStep;
    montante_solicitado: number | null;
    prazo_meses: number | null;
    valor_imovel: number | null;
    followup_at: string | null;
    followup_note: string | null;
  };
  client: {
    id: string;
    p1_name: string;
    p2_name: string | null;
  };
}

export function ProcessDetailHeader({ process, client }: Props) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<ProcessStep>(process.process_step);
  const [updatingStep, setUpdatingStep] = useState(false);
  const [pendingStep, setPendingStep] = useState<typeof STEP_META[0] | null>(null);
  const [followupOpen, setFollowupOpen] = useState(false);
  const [followupDate, setFollowupDate] = useState('');
  const [followupNote, setFollowupNote] = useState('');

  const currentIdx = STEP_META.findIndex((s) => s.key === currentStep);

  async function confirmStepChange() {
    if (!pendingStep) return;
    setUpdatingStep(true);
    setPendingStep(null);
    try {
      const res = await fetch(`/api/processes/${process.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ process_step: pendingStep.key }),
      });
      if (res.ok) {
        setCurrentStep(pendingStep.key);
        if (pendingStep.key === 'closed') setFollowupOpen(true);
        router.refresh();
      }
    } finally {
      setUpdatingStep(false);
    }
  }

  async function saveFollowup() {
    if (!followupDate) { toast.error('Selecione uma data'); return; }
    await fetch(`/api/processes/${process.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ followup_at: new Date(followupDate).toISOString(), followup_note: followupNote || null }),
    });
    toast.success('Lembrete definido');
    setFollowupOpen(false);
    router.refresh();
  }

  function quickDate(months: number) {
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    setFollowupDate(d.toISOString().split('T')[0]);
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm text-slate-500 mb-3">
        <Link href="/dashboard/clients" className="hover:text-slate-700">Clientes</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href={`/dashboard/clients/${client.id}`} className="hover:text-slate-700">{client.p1_name}</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-slate-700 font-medium">{TIPO_LABELS[process.tipo]}</span>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 px-4 pt-4 pb-5 sm:px-6 sm:pt-5 space-y-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5 flex-wrap min-w-0">
            <Link href={`/dashboard/clients/${client.id}`} className="text-lg sm:text-xl font-bold text-slate-900 hover:text-blue-600 leading-tight">
              {client.p1_name}
            </Link>
            {client.p2_name && <span className="text-sm text-slate-400">+ {client.p2_name}</span>}
            <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', TIPO_COLORS[process.tipo])}>
              {TIPO_LABELS[process.tipo]}
            </span>
            <ProcessStepBadge step={currentStep} />
          </div>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600"
          >
            <ChevronLeft className="h-4 w-4" /> Voltar
          </button>
        </div>

        {/* Details */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {process.montante_solicitado ? (
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Montante</p>
              <p className="text-sm text-slate-700">{formatCurrency(process.montante_solicitado)}</p>
            </div>
          ) : null}
          {process.prazo_meses ? (
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Prazo</p>
              <p className="text-sm text-slate-700">{process.prazo_meses} meses</p>
            </div>
          ) : null}
          {process.valor_imovel ? (
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Valor imóvel</p>
              <p className="text-sm text-slate-700">{formatCurrency(process.valor_imovel)}</p>
            </div>
          ) : null}
          {process.followup_at && (
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Seguimento</p>
              <p className="text-sm text-amber-600 flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(process.followup_at).toLocaleDateString('pt-PT')}
              </p>
            </div>
          )}
        </div>

        {/* Process stepper */}
        <div className="pt-3 border-t border-slate-100">
          {/* Mobile */}
          <div className="flex md:hidden items-center justify-between gap-3">
            <button
              onClick={() => currentIdx > 0 && !updatingStep && setPendingStep(STEP_META[currentIdx - 1])}
              disabled={currentIdx === 0 || updatingStep}
              className="w-10 h-10 flex items-center justify-center rounded-full border border-slate-200 disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4 text-slate-600" />
            </button>
            <div className="text-center flex-1">
              <p className="text-[10px] text-slate-400 mb-0.5">Etapa {currentIdx + 1} de {STEP_META.length}</p>
              <p className="text-sm font-semibold text-slate-800">{STEP_META[currentIdx].label}</p>
            </div>
            <button
              onClick={() => currentIdx < STEP_META.length - 1 && !updatingStep && setPendingStep(STEP_META[currentIdx + 1])}
              disabled={currentIdx === STEP_META.length - 1 || updatingStep}
              className="w-10 h-10 flex items-center justify-center rounded-full border border-slate-200 disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4 text-slate-600" />
            </button>
          </div>

          {/* Desktop */}
          <div className="hidden md:flex items-start">
            {STEP_META.map((step, i) => {
              const isCompleted = i < currentIdx;
              const isCurrent = i === currentIdx;
              const isFuture = i > currentIdx;
              const leftLine = i > 0 && (i - 1) < currentIdx ? STEP_META[i - 1].line : 'bg-slate-200';
              const rightLine = isCompleted ? step.line : 'bg-slate-200';
              return (
                <div key={step.key} className="flex-1 flex flex-col items-center relative">
                  {i > 0 && <div className={cn('absolute top-3 left-0 right-1/2 h-0.5 -translate-y-px', leftLine)} />}
                  {i < STEP_META.length - 1 && <div className={cn('absolute top-3 left-1/2 right-0 h-0.5 -translate-y-px', rightLine)} />}
                  <button
                    onClick={() => !isCurrent && !updatingStep && setPendingStep(step)}
                    disabled={isCurrent || updatingStep}
                    className={cn('w-6 h-6 rounded-full flex items-center justify-center transition-all relative z-10',
                      isCompleted && `${step.circle} shadow-sm`,
                      isCurrent && `${step.circle} ring-4 ${step.ring} shadow-sm`,
                      isFuture && 'bg-white border-2 border-slate-200 hover:border-slate-300'
                    )}
                  >
                    {isCompleted && <Check className="h-3 w-3 text-white" />}
                  </button>
                  <span className={cn('mt-1.5 text-[10px] text-center leading-tight w-full px-1 truncate',
                    isCurrent ? 'font-semibold text-slate-800' : isCompleted ? 'text-slate-500' : 'text-slate-400'
                  )}>
                    {step.short}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Step confirm dialog */}
      <Dialog open={!!pendingStep} onOpenChange={(v) => { if (!v) setPendingStep(null); }}>
        <DialogContent className="max-w-xs">
          <DialogHeader><DialogTitle>Alterar etapa</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-600 mt-1">
            Avançar para <span className="font-semibold text-slate-900">{pendingStep?.label}</span>?
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setPendingStep(null)}>Cancelar</Button>
            <Button onClick={confirmStepChange}>Confirmar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Follow-up dialog (shown after closing a process) */}
      <Dialog open={followupOpen} onOpenChange={setFollowupOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Processo fechado. Definir lembrete de seguimento?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500">Quando quer ser lembrado de contactar este cliente novamente?</p>
          <div className="space-y-3 mt-2">
            <div className="flex flex-wrap gap-2">
              <button onClick={() => quickDate(6)} className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50">Daqui a 6 meses</button>
              <button onClick={() => quickDate(12)} className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50">Daqui a 1 ano</button>
              <button onClick={() => quickDate(24)} className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50">Daqui a 2 anos</button>
            </div>
            <input
              type="date"
              value={followupDate}
              onChange={(e) => setFollowupDate(e.target.value)}
              className="w-full h-9 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
            <textarea
              value={followupNote}
              onChange={(e) => setFollowupNote(e.target.value)}
              placeholder="ex: Verificar condições para renegociação"
              rows={2}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none"
            />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" onClick={() => setFollowupOpen(false)}>Agora não</Button>
            <Button onClick={saveFollowup}>Definir lembrete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
