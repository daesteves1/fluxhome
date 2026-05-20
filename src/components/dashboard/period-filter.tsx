'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const PERIODS = [
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
  { value: '90d', label: '90 dias' },
  { value: 'all', label: 'Todos' },
] as const;

export type Period = (typeof PERIODS)[number]['value'];

export function PeriodFilter({ current }: { current: Period }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setPeriod(period: Period) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('period', period);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="inline-flex items-center gap-1 bg-slate-100 rounded-lg p-1">
      {PERIODS.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => setPeriod(value)}
          className={cn(
            'px-3 py-1 rounded-md text-xs font-medium transition-colors',
            current === value
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700',
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
