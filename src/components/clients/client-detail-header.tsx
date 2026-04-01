'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Copy, Check, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  const [currentStep, setCurrentStep] = useState<ProcessStep>(client.process_step);
  const [updatingStep, setUpdatingStep] = useState(false);

  const portalUrl = `${portalBaseUrl}/portal/${client.portal_token}`;

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

  return (
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-foreground">
          {client.p1_name}
          {client.p2_name && (
            <span className="text-muted-foreground font-normal text-lg ml-2">
              & {client.p2_name}
            </span>
          )}
        </h2>
        <ProcessStepBadge step={currentStep} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Process step selector */}
        <Select
          value={currentStep}
          onValueChange={(v) => handleStepChange(v as ProcessStep)}
          disabled={updatingStep}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PROCESS_STEPS.map((step) => (
              <SelectItem key={step} value={step}>
                {tSteps(step)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Copy portal link */}
        <Button variant="outline" size="sm" onClick={copyPortalLink}>
          {copied ? <Check className="h-4 w-4 mr-1.5" /> : <Copy className="h-4 w-4 mr-1.5" />}
          {t('copyPortalLink')}
        </Button>

        {/* Open portal */}
        <Button variant="outline" size="sm" asChild>
          <a href={portalUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4 mr-1.5" />
            Portal
          </a>
        </Button>

        {/* Edit client */}
        <EditClientDialog client={client as Parameters<typeof EditClientDialog>[0]['client']} />
      </div>
    </div>
  );
}
