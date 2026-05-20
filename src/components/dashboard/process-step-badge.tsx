import { cn } from '@/lib/utils';

export const STEP_META: Record<string, { label: string; className: string }> = {
  lead:           { label: 'Lead',               className: 'bg-slate-100 text-slate-600' },
  docs_pending:   { label: 'Docs. Pendentes',    className: 'bg-amber-100 text-amber-700' },
  docs_complete:  { label: 'Docs. Completos',    className: 'bg-blue-100 text-blue-700' },
  propostas_sent: { label: 'Propostas Enviadas', className: 'bg-purple-100 text-purple-700' },
  approved:       { label: 'Aprovado',           className: 'bg-green-100 text-green-700' },
  closed:         { label: 'Fechado',            className: 'bg-slate-200 text-slate-700' },
};

export const STEP_ORDER: Record<string, number> = {
  lead: 0, docs_pending: 1, docs_complete: 2,
  propostas_sent: 3, approved: 4, closed: 5,
};

interface ProcessStepBadgeProps {
  step: string;
  className?: string;
}

export function ProcessStepBadge({ step, className }: ProcessStepBadgeProps) {
  const config = STEP_META[step] ?? STEP_META.docs_pending;
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap', config.className, className)}>
      {config.label}
    </span>
  );
}
