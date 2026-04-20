'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Copy, Check, ExternalLink, Mail, ChevronLeft, ChevronRight, Pencil } from 'lucide-react';
import { ProcessStepBadge } from '@/components/dashboard/process-step-badge';
import { EditClientDialog } from './edit-client-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { ProcessStep } from '@/types/database';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const MORTGAGE_TYPE_PT: Record<string, string> = {
  acquisition:   'Aquisição',
  transfer:      'Transferência',
  renegotiation: 'Renegociação',
};

interface StepMeta {
  key: ProcessStep;
  label: string;
  short: string;
  circle: string;
  line: string;
  ring: string;
}

const STEP_META: StepMeta[] = [
  { key: 'docs_pending',   label: 'Docs. Pendentes',    short: 'Docs. Pend.', circle: 'bg-amber-500',  line: 'bg-amber-400',  ring: 'ring-amber-300'  },
  { key: 'docs_complete',  label: 'Docs. Completos',    short: 'Docs. Comp.', circle: 'bg-blue-500',   line: 'bg-blue-400',   ring: 'ring-blue-300'   },
  { key: 'propostas_sent', label: 'Propostas Enviadas', short: 'Propostas',   circle: 'bg-purple-500', line: 'bg-purple-400', ring: 'ring-purple-300' },
  { key: 'approved',       label: 'Aprovado',           short: 'Aprovado',    circle: 'bg-green-500',  line: 'bg-green-400',  ring: 'ring-green-300'  },
  { key: 'closed',         label: 'Fechado',            short: 'Fechado',     circle: 'bg-slate-600',  line: 'bg-slate-500',  ring: 'ring-slate-400'  },
];

interface Client {
  id: string;
  p1_name: string;
  p2_name: string | null;
  p1_email: string | null;
  p1_phone: string | null;
  loan_amount: number | null;
  property_value: number | null;
  term_months: number | null;
  property_address: string | null;
  mortgage_type: string | null;
  process_step: ProcessStep;
  portal_token: string;
  [key: string]: unknown;
}

interface Props {
  client: Client;
  portalBaseUrl: string;
}

export function ClientDetailHeader({ client, portalBaseUrl }: Props) {
  const t = useTranslations('clients');
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [currentStep, setCurrentStep] = useState<ProcessStep>(client.process_step);
  const [updatingStep, setUpdatingStep] = useState(false);
  const [pendingStep, setPendingStep] = useState<StepMeta | null>(null);

  const portalUrl = `${portalBaseUrl}/portal/${client.portal_token}`;

  async function sendPortalLink() {
    setSendingEmail(true);
    const res = await fetch(`/api/clients/${client.id}/send-portal-link`, { method: 'POST' });
    setSendingEmail(false);
    if (res.ok) {
      toast.success(t('portalLinkSent'));
    } else {
      const data = await res.json();
      toast.error(data.error ?? 'Erro ao enviar email');
    }
  }

  async function copyPortalLink() {
    await navigator.clipboard.writeText(portalUrl);
    setCopied(true);
    toast.success(t('linkCopied'));
    setTimeout(() => setCopied(false), 2000);
  }

  async function confirmStepChange() {
    if (!pendingStep) return;
    setUpdatingStep(true);
    setPendingStep(null);
    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ process_step: pendingStep.key }),
      });
      if (res.ok) {
        setCurrentStep(pendingStep.key);
        router.refresh();
      }
    } finally {
      setUpdatingStep(false);
    }
  }

  const fmtEur = (val: number) =>
    new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val);

  const mortgageTypeLabel = client.mortgage_type
    ? (MORTGAGE_TYPE_PT[client.mortgage_type] ?? client.mortgage_type)
    : null;

  const currentIdx = STEP_META.findIndex((s) => s.key === currentStep);

  return (
    <div>
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-3"
      >
        <ChevronLeft className="h-4 w-4" />
        {t('backToClients')}
      </button>

      <div className="bg-white rounded-2xl border border-slate-200 px-4 pt-4 pb-5 sm:px-6 sm:pt-5">

        {/* ── Top row: name + badge + desktop action buttons ── */}
        <div className="flex items-start justify-between gap-3">
          {/* Name + p2 + step badge */}
          <div className="flex items-center gap-2.5 flex-wrap min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">{client.p1_name}</h1>
            {client.p2_name && (
              <span className="text-sm text-slate-400 font-normal">+ {client.p2_name}</span>
            )}
            <ProcessStepBadge step={currentStep} />
          </div>

          {/* Desktop action buttons — same row as name */}
          <div className="hidden sm:flex items-center gap-1 shrink-0">
            <button
              onClick={copyPortalLink}
              className="inline-flex items-center gap-1 h-8 px-3 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-800 rounded-lg transition-colors"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
              Copiar link
            </button>

            <button
              onClick={sendPortalLink}
              disabled={sendingEmail}
              className="inline-flex items-center gap-1 h-8 px-3 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-800 rounded-lg transition-colors disabled:opacity-40"
            >
              <Mail className="h-3.5 w-3.5" />
              Enviar link
            </button>

            <a
              href={portalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 h-8 px-3 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-800 rounded-lg transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Portal
            </a>

            <EditClientDialog
              client={client as Parameters<typeof EditClientDialog>[0]['client']}
              iconOnly
              customTrigger={
                <button className="inline-flex items-center gap-1 h-8 px-3 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-800 rounded-lg transition-colors">
                  <Pencil className="h-3.5 w-3.5" />
                  Editar
                </button>
              }
            />
          </div>
        </div>

        {/* Mobile action buttons — 2×2 grid below name */}
        <div className="sm:hidden grid grid-cols-2 gap-1.5 mt-3">
          <button
            onClick={copyPortalLink}
            className="inline-flex items-center justify-center gap-1.5 h-9 px-3 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
            Copiar link
          </button>

          <button
            onClick={sendPortalLink}
            disabled={sendingEmail}
            className="inline-flex items-center justify-center gap-1.5 h-9 px-3 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors disabled:opacity-40"
          >
            <Mail className="h-3.5 w-3.5" />
            Enviar link
          </button>

          <a
            href={portalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 h-9 px-3 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Portal
          </a>

          <EditClientDialog
            client={client as Parameters<typeof EditClientDialog>[0]['client']}
            iconOnly
            customTrigger={
              <button className="inline-flex items-center justify-center gap-1.5 h-9 px-3 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors w-full">
                <Pencil className="h-3.5 w-3.5" />
                Editar
              </button>
            }
          />
        </div>

        {/* ── Detail info grid ── */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 mt-4">
          {client.p1_email && (
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Email</p>
              <p className="text-sm text-slate-700">{client.p1_email}</p>
            </div>
          )}
          {client.p1_phone && (
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Telefone</p>
              <p className="text-sm text-slate-700">{client.p1_phone}</p>
            </div>
          )}
          {mortgageTypeLabel && (
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Tipo de processo</p>
              <p className="text-sm text-slate-700">{mortgageTypeLabel}</p>
            </div>
          )}
          {client.loan_amount ? (
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Financiamento</p>
              <p className="text-sm text-slate-700">{fmtEur(client.loan_amount)}</p>
            </div>
          ) : null}
          {client.property_value ? (
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Valor do imóvel</p>
              <p className="text-sm text-slate-700">{fmtEur(client.property_value)}</p>
            </div>
          ) : null}
          {client.term_months ? (
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Prazo</p>
              <p className="text-sm text-slate-700">{client.term_months} meses</p>
            </div>
          ) : null}
          {client.property_address && (
            <div className="col-span-2">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Endereço do imóvel</p>
              <p className="text-sm text-slate-700">{client.property_address}</p>
            </div>
          )}
        </div>

        {/* ── Process stepper ── */}
        <div className="mt-5 pt-4 border-t border-slate-100">

          {/* Mobile: compact prev / label / next */}
          <div className="flex md:hidden items-center justify-between gap-3">
            <button
              onClick={() => currentIdx > 0 && !updatingStep && setPendingStep(STEP_META[currentIdx - 1])}
              disabled={currentIdx === 0 || updatingStep}
              className="w-10 h-10 flex items-center justify-center rounded-full border border-slate-200 disabled:opacity-30 hover:bg-slate-50 transition-colors"
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
              className="w-10 h-10 flex items-center justify-center rounded-full border border-slate-200 disabled:opacity-30 hover:bg-slate-50 transition-colors"
            >
              <ChevronRight className="h-4 w-4 text-slate-600" />
            </button>
          </div>

          {/*
            Desktop stepper — each step is flex-1 with the circle centered.
            Connector lines are absolutely positioned within each cell:
              left half  → left-0  to left-1/2  (connects from previous step)
              right half → left-1/2 to right-0  (connects to next step)
            Circle sits above the connector via relative z-10.
            top-3 (12px) = vertical center of the 24px circle.
          */}
          <div className="hidden md:flex items-start">
            {STEP_META.map((step, i) => {
              const isCompleted = i < currentIdx;
              const isCurrent   = i === currentIdx;
              const isFuture    = i > currentIdx;
              const isFirst     = i === 0;
              const isLast      = i === STEP_META.length - 1;

              // Colour of the left-side connector entering this step
              const leftLineClass = i > 0 && (i - 1) < currentIdx
                ? STEP_META[i - 1].line
                : 'bg-slate-200';

              // Colour of the right-side connector leaving this step
              const rightLineClass = isCompleted ? step.line : 'bg-slate-200';

              return (
                <div key={step.key} className="flex-1 flex flex-col items-center relative">
                  {/* Left connector */}
                  {!isFirst && (
                    <div
                      className={cn('absolute top-3 left-0 right-1/2 h-0.5 -translate-y-px', leftLineClass)}
                    />
                  )}
                  {/* Right connector */}
                  {!isLast && (
                    <div
                      className={cn('absolute top-3 left-1/2 right-0 h-0.5 -translate-y-px', rightLineClass)}
                    />
                  )}

                  {/* Circle button */}
                  <button
                    onClick={() => !isCurrent && !updatingStep && setPendingStep(step)}
                    disabled={isCurrent || updatingStep}
                    className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center transition-all relative z-10',
                      isCompleted && `${step.circle} shadow-sm`,
                      isCurrent  && `${step.circle} ring-4 ${step.ring} shadow-sm`,
                      isFuture   && 'bg-white border-2 border-slate-200 hover:border-slate-300',
                    )}
                  >
                    {isCompleted && <Check className="h-3 w-3 text-white" />}
                  </button>

                  {/* Label */}
                  <span
                    className={cn(
                      'mt-1.5 text-[10px] text-center leading-tight w-full px-1 truncate',
                      isCurrent  ? 'font-semibold text-slate-800' : '',
                      isCompleted ? 'text-slate-500' : '',
                      isFuture   ? 'text-slate-400' : '',
                    )}
                  >
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
          <DialogHeader>
            <DialogTitle>Alterar etapa</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600 mt-1">
            Avançar para <span className="font-semibold text-slate-900">{pendingStep?.label}</span>?
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setPendingStep(null)}>
              Cancelar
            </Button>
            <Button onClick={confirmStepChange}>
              Confirmar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
