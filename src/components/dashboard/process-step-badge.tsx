import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { ProcessStep } from '@/types/database';

const stepConfig: Record<ProcessStep, { label: string; className: string }> = {
  docs_pending: {
    label: 'docs_pending',
    className: 'bg-amber-100 text-amber-700',
  },
  docs_complete: {
    label: 'docs_complete',
    className: 'bg-blue-100 text-blue-700',
  },
  propostas_sent: {
    label: 'propostas_sent',
    className: 'bg-purple-100 text-purple-700',
  },
  approved: {
    label: 'approved',
    className: 'bg-green-100 text-green-700',
  },
  closed: {
    label: 'closed',
    className: 'bg-slate-100 text-slate-700',
  },
};

interface ProcessStepBadgeProps {
  step: ProcessStep;
  className?: string;
}

export function ProcessStepBadge({ step, className }: ProcessStepBadgeProps) {
  const t = useTranslations('processSteps');
  const config = stepConfig[step] ?? stepConfig.docs_pending;

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        config.className,
        className
      )}
    >
      {t(step as Parameters<typeof t>[0])}
    </span>
  );
}
