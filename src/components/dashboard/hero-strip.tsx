'use client';

import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';

function formatEur(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M €`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k €`;
  return `${n.toLocaleString('pt-PT')} €`;
}

function formatDays(n: number): string {
  return `${n} dias`;
}

interface DeltaChipProps {
  current: number;
  prev: number;
  unit?: string;
  isPercent?: boolean;
}

function DeltaChip({ current, prev, unit = '', isPercent = false }: DeltaChipProps) {
  const delta = current - prev;
  if (delta === 0) return null;
  const sign = delta > 0 ? '+' : '';
  const label = isPercent ? `${sign}${delta}%` : `${sign}${delta}${unit}`;
  return (
    <span className={cn(
      'text-[10px] font-semibold px-1.5 py-0.5 rounded',
      delta > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
    )}>
      {label}
    </span>
  );
}

interface SparklineProps {
  data: number[];
  color?: string;
}

function Sparkline({ data, color = '#6366f1' }: SparklineProps) {
  if (!data.length) return <div className="h-10" />;
  const chartData = data.map((v, i) => ({ i, v }));
  return (
    <div className="h-10 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <Line
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

interface HeroCardProps {
  title: string;
  value: string;
  subtitle?: string;
  delta?: React.ReactNode;
  sparkline?: number[];
  sparklineColor?: string;
  featured?: boolean;
  tag?: string;
}

function HeroCard({
  title, value, subtitle, delta, sparkline, sparklineColor, featured, tag
}: HeroCardProps) {
  return (
    <div className={cn(
      'rounded-2xl p-5 flex flex-col gap-1 min-w-0',
      featured
        ? 'bg-slate-900 text-white col-span-2 lg:col-span-1'
        : 'bg-white border border-slate-200'
    )}>
      <div className="flex items-start justify-between gap-2">
        <p className={cn('text-xs font-medium', featured ? 'text-slate-400' : 'text-slate-500')}>
          {title}
        </p>
        {tag && (
          <span className="text-[10px] text-slate-400 shrink-0">{tag}</span>
        )}
      </div>
      <p className={cn(
        'text-3xl font-bold tracking-tight',
        featured ? 'text-white' : 'text-slate-900'
      )}>
        {value}
      </p>
      {subtitle && (
        <p className={cn('text-[11px]', featured ? 'text-slate-500' : 'text-slate-400')}>
          {subtitle}
        </p>
      )}
      <div className="mt-1 flex items-end justify-between gap-2">
        <div>{delta}</div>
        {sparkline && (
          <div className="flex-1 min-w-0">
            <Sparkline data={sparkline} color={featured ? '#6366f1' : sparklineColor} />
          </div>
        )}
      </div>
    </div>
  );
}

export interface HeroStripProps {
  pipeline_volume: number;
  active_count: number;
  conversion_rate_90d: number;
  avg_close_days_90d: number;
  commission_estimated_30d: number;
  prev_pipeline_volume: number;
  prev_active_count: number;
  prev_conversion_rate: number;
  prev_avg_close_days: number;
  sparkline_volume: number[];
  sparkline_active: number[];
}

export function HeroStrip({
  pipeline_volume, active_count, conversion_rate_90d, avg_close_days_90d,
  commission_estimated_30d, prev_pipeline_volume, prev_active_count,
  prev_conversion_rate, prev_avg_close_days, sparkline_volume, sparkline_active,
}: HeroStripProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      {/* Featured dark card */}
      <HeroCard
        featured
        title="Volume em pipeline"
        value={formatEur(pipeline_volume)}
        subtitle="processos ativos"
        sparkline={sparkline_volume}
        delta={
          <DeltaChip current={pipeline_volume} prev={prev_pipeline_volume} unit=" €" />
        }
      />

      <HeroCard
        title="Processos ativos"
        value={String(active_count)}
        sparkline={sparkline_active}
        sparklineColor="#3b82f6"
        delta={
          <DeltaChip current={active_count} prev={prev_active_count} />
        }
      />

      <HeroCard
        title="Taxa de conversão"
        value={`${conversion_rate_90d}%`}
        subtitle="últimos 90 dias"
        sparklineColor="#10b981"
        delta={
          <DeltaChip current={conversion_rate_90d} prev={prev_conversion_rate} isPercent />
        }
      />

      <HeroCard
        title="Tempo médio de fecho"
        value={formatDays(avg_close_days_90d)}
        subtitle="últimos 90 dias"
        sparklineColor="#f59e0b"
        delta={
          <DeltaChip current={avg_close_days_90d} prev={prev_avg_close_days} unit=" dias" />
        }
      />

      <HeroCard
        title="Comissão estimada"
        value={formatEur(commission_estimated_30d)}
        subtitle="próximos 30 dias"
        tag="estimado"
        sparklineColor="#8b5cf6"
      />
    </div>
  );
}
