'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Copy, Check, ExternalLink, Mail, ChevronLeft } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProcessStepBadge } from '@/components/dashboard/process-step-badge';
import { EditClientDialog } from './edit-client-dialog';
import type { ProcessStep } from '@/types/database';
import { toast } from 'sonner';

const PROCESS_STEPS: ProcessStep[] = [
  'lead', 'docs_pending', 'docs_complete', 'propostas_sent', 'approved', 'closed'
];

interface Client {
  id: string;
  p1_name: string;
  p2_name: string | null;
  p1_email: string | null;
  p1_phone: string | null;
  loan_amount: number | null;
  property_value: number | null;
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
  const tSteps = useTranslations('processSteps');
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [currentStep, setCurrentStep] = useState<ProcessStep>(client.process_step);
  const [updatingStep, setUpdatingStep] = useState(false);

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

  async function handleStepChange(step: ProcessStep) {
    setUpdatingStep(true);
    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ process_step: step }),
      });
      if (res.ok) {
        setCurrentStep(step);
        router.refresh();
      }
    } finally {
      setUpdatingStep(false);
    }
  }

  const fmtEur = (val: number) =>
    new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val);

  return (
    <div>
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-4"
      >
        <ChevronLeft className="h-4 w-4" />
        {t('backToClients')}
      </button>

      {/* Header card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          {/* Client info */}
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold shrink-0">
                {client.p1_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 leading-tight">
                  {client.p1_name}
                </h1>
                {client.p2_name && (
                  <p className="text-sm text-slate-500 mt-0.5">+ {client.p2_name}</p>
                )}
              </div>
            </div>

            {/* Contact + details */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-sm text-slate-500">
              {client.p1_email && <span>{client.p1_email}</span>}
              {client.p1_phone && <span>{client.p1_phone}</span>}
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {client.mortgage_type && (
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                  {client.mortgage_type}
                </span>
              )}
              {client.loan_amount && (
                <span className="text-xs text-slate-500">
                  Financiamento: <span className="font-medium text-slate-700">{fmtEur(client.loan_amount)}</span>
                </span>
              )}
              {client.property_value && (
                <span className="text-xs text-slate-500">
                  Imóvel: <span className="font-medium text-slate-700">{fmtEur(client.property_value)}</span>
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-start gap-2 shrink-0">
            <Select
              value={currentStep}
              onValueChange={(v) => handleStepChange(v as ProcessStep)}
              disabled={updatingStep}
            >
              <SelectTrigger className="h-8 text-xs w-44 bg-white border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROCESS_STEPS.map((step) => (
                  <SelectItem key={step} value={step} className="text-xs">
                    {tSteps(step)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <button
              onClick={copyPortalLink}
              className="flex items-center gap-1.5 h-8 px-3 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
              {t('copyPortalLink')}
            </button>

            <button
              onClick={sendPortalLink}
              disabled={sendingEmail}
              className="flex items-center gap-1.5 h-8 px-3 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <Mail className="h-3.5 w-3.5" />
              {sendingEmail ? '...' : t('sendPortalLink')}
            </button>

            <a
              href={portalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 h-8 px-3 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Portal
            </a>

            <EditClientDialog client={client as Parameters<typeof EditClientDialog>[0]['client']} />
          </div>
        </div>

        {/* Step badge */}
        <div className="mt-4 pt-4 border-t border-slate-100">
          <ProcessStepBadge step={currentStep} />
        </div>
      </div>
    </div>
  );
}
