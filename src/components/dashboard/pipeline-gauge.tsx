'use client';

import { cn } from '@/lib/utils';

interface GaugeProps {
  score: number; // 0-100
  leadResponse: number;
  staleScore: number;
  freshness: number;
}

function ScoreArc({ score }: { score: number }) {
  const clamp = Math.min(100, Math.max(0, score));
  const r = 44;
  const cx = 60;
  const cy = 60;
  const circumference = Math.PI * r; // half circle
  const dash = (clamp / 100) * circumference;
  const gap = circumference - dash;
  // Color: red < 50, amber < 75, green >= 75
  const strokeColor = clamp >= 75 ? '#22c55e' : clamp >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <svg viewBox="0 0 120 70" className="w-full max-w-[160px]">
      {/* Track */}
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none"
        stroke="#f1f5f9"
        strokeWidth="12"
        strokeLinecap="round"
      />
      {/* Value */}
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none"
        stroke={strokeColor}
        strokeWidth="12"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${gap}`}
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
      {/* Score text */}
      <text
        x={cx}
        y={cy - 4}
        textAnchor="middle"
        fontSize="20"
        fontWeight="bold"
        fill={strokeColor}
      >
        {clamp}
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle" fontSize="8" fill="#94a3b8">
        /100
      </text>
    </svg>
  );
}

function ComponentBar({ label, value, tooltip }: { label: string; value: number; tooltip?: string }) {
  const color = value >= 75 ? 'bg-green-500' : value >= 50 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-slate-600" title={tooltip}>{label}</span>
        <span className="font-semibold text-slate-700">{value}%</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export function PipelineGauge({ score, leadResponse, staleScore, freshness }: GaugeProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-sm font-semibold text-slate-900">Saúde do pipeline</h3>
        <span
          title="Composto por: resposta a leads (33%), processos ativos (33%), frescura de propostas (33%). Eficiência documental em breve."
          className="text-[10px] text-slate-400 cursor-help border-b border-dashed border-slate-300"
        >
          ⓘ
        </span>
      </div>

      <div className="flex items-center gap-6">
        <ScoreArc score={score} />
        <div className="flex-1 space-y-3">
          <ComponentBar
            label="Resposta a leads ≤24h"
            value={leadResponse}
            tooltip="% de leads com nota do mediador nas primeiras 24h"
          />
          <ComponentBar
            label="Processos ativos"
            value={staleScore}
            tooltip="% de processos ativos com atividade nos últimos 14 dias"
          />
          <ComponentBar
            label="Propostas válidas"
            value={freshness}
            tooltip="% de propostas com validade > 14 dias"
          />
          <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-100">
            Eficiência documental — <span className="italic">em breve</span>
          </div>
        </div>
      </div>
    </div>
  );
}
