'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { FunnelStep, TipoDistribution } from '@/lib/dashboard/types';
import { TIPO_LABELS } from '@/lib/dashboard/constants';

const TIPO_COLORS: Record<string, string> = {
  credito_habitacao: 'bg-blue-500',
  renegociacao: 'bg-violet-500',
  construcao: 'bg-amber-500',
  outro: 'bg-slate-400',
};

interface PipelineFunnelProps {
  funnel: FunnelStep[];
  tipoDist: TipoDistribution[];
  forecast30d: number;
  forecast60d: number;
  forecast90d: number;
  pipelineVelocity: number;
  commissionRate: number;
}

function formatEur(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M €`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k €`;
  return `${n.toLocaleString('pt-PT')} €`;
}

export function PipelineFunnel({
  funnel, tipoDist, forecast30d, forecast60d, forecast90d, pipelineVelocity, commissionRate,
}: PipelineFunnelProps) {
  const [tipoFilter, setTipoFilter] = useState<string>('all');
  const [forecastHorizon, setForecastHorizon] = useState<30 | 60 | 90>(30);
  const [hoveredStep, setHoveredStep] = useState<string | null>(null);

  const forecastValue = forecastHorizon === 30 ? forecast30d : forecastHorizon === 60 ? forecast60d : forecast90d;

  const filteredFunnel = tipoFilter === 'all'
    ? funnel
    : funnel; // server-side filter by tipo would need re-fetch; show all, label filtered

  const maxCount = Math.max(...filteredFunnel.map((s) => s.count), 1);
  const totalInDist = tipoDist.reduce((s, d) => s + d.count, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Funnel chart */}
      <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-900">Funil por etapa</h3>
          <select
            value={tipoFilter}
            onChange={(e) => setTipoFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg bg-white px-2 py-1 text-slate-600 focus:outline-none"
          >
            <option value="all">Por tipo: Todos</option>
            {Object.entries(TIPO_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2.5">
          {filteredFunnel.map((step) => (
            <div
              key={step.step}
              className="flex items-center gap-3 group cursor-default"
              onMouseEnter={() => setHoveredStep(step.step)}
              onMouseLeave={() => setHoveredStep(null)}
            >
              <span className="text-xs text-slate-500 w-36 shrink-0">{step.label}</span>
              <div className="flex-1 relative">
                <div className="bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-300"
                    style={{ width: `${(step.count / maxCount) * 100}%` }}
                  />
                </div>
                {hoveredStep === step.step && step.avg_days_in_step > 0 && (
                  <div className="absolute -top-7 left-0 bg-slate-900 text-white text-[10px] px-2 py-1 rounded pointer-events-none whitespace-nowrap z-10">
                    Média {step.avg_days_in_step} dias nesta etapa
                  </div>
                )}
              </div>
              <span className="text-xs font-semibold text-slate-700 w-6 text-right shrink-0">
                {step.count}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Right column: Forecast + Velocity + Tipo */}
      <div className="flex flex-col gap-4">
        {/* Forecast widget */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-900">Receita esperada</h3>
            <div className="flex items-center rounded-lg border border-slate-200 overflow-hidden text-[10px] font-medium">
              {([30, 60, 90] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setForecastHorizon(d)}
                  className={cn(
                    'px-2 py-1 transition-colors',
                    forecastHorizon === d ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'
                  )}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{formatEur(forecastValue)}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            estimado · taxa {(commissionRate * 100).toFixed(2)}%
          </p>
        </div>

        {/* Pipeline velocity */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-slate-900">Velocidade do pipeline</h3>
            <span
              title="(Fechados 90d × ticket médio × taxa comissão × taxa conversão) / ciclo médio de dias"
              className="text-[10px] text-slate-400 cursor-help border-b border-dashed border-slate-300"
            >
              ⓘ
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{formatEur(pipelineVelocity)}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">por dia</p>
        </div>

        {/* Tipo distribution */}
        {tipoDist.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Por tipo</h3>
            <div className="space-y-2">
              {tipoDist.map((d) => (
                <div key={d.tipo} className="flex items-center gap-2">
                  <span className={cn('w-2 h-2 rounded-full shrink-0', TIPO_COLORS[d.tipo] ?? 'bg-slate-400')} />
                  <span className="text-xs text-slate-600 flex-1">{d.label}</span>
                  <span className="text-xs font-semibold text-slate-700">{d.count}</span>
                  <span className="text-[10px] text-slate-400">
                    {totalInDist > 0 ? `${Math.round((d.count / totalInDist) * 100)}%` : '0%'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
