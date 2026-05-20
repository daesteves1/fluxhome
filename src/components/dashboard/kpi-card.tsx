import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface KpiCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  trend?: 'positive' | 'warning' | 'neutral';
  href?: string;
  /** Number compared to the previous period. Positive = growth, negative = decline. */
  delta?: number | null;
}

export function KpiCard({ title, value, icon: Icon, trend = 'neutral', href, delta }: KpiCardProps) {
  const inner = (
    <div className={cn(
      'bg-white border border-slate-200 rounded-xl p-4 transition-all',
      href && 'hover:border-blue-300 hover:shadow-sm cursor-pointer'
    )}>
      <p className="text-xs text-slate-500 mb-1 font-medium">{title}</p>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <div className="mt-3 flex items-center justify-between">
        {delta != null ? (
          <span className={cn(
            'text-[10px] font-semibold px-1.5 py-0.5 rounded',
            delta > 0 && 'bg-green-100 text-green-700',
            delta < 0 && 'bg-red-100 text-red-600',
            delta === 0 && 'bg-slate-100 text-slate-500',
          )}>
            {delta > 0 ? `+${delta}` : delta} vs período ant.
          </span>
        ) : <span />}
        <div className={cn(
          'w-7 h-7 rounded-lg flex items-center justify-center',
          trend === 'positive' && 'bg-green-100 text-green-600',
          trend === 'warning' && 'bg-amber-100 text-amber-600',
          trend === 'neutral' && 'bg-blue-50 text-blue-500'
        )}>
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>
    </div>
  );

  if (href) return <Link href={href}>{inner}</Link>;
  return inner;
}
