'use client';

import { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BrokerLeaderboardRow } from '@/lib/dashboard/types';

type SortKey = keyof Omit<BrokerLeaderboardRow, 'broker_id' | 'broker_name'>;

function formatEur(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M €`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k €`;
  return `${n} €`;
}

interface BrokerLeaderboardProps {
  rows: BrokerLeaderboardRow[];
}

export function BrokerLeaderboard({ rows }: BrokerLeaderboardProps) {
  const [sortKey, setSortKey] = useState<SortKey>('active');
  const [sortDir, setSortDir] = useState<1 | -1>(-1);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 1 ? -1 : 1));
    else { setSortKey(key); setSortDir(-1); }
  };

  const sorted = [...rows].sort((a, b) => {
    const av = a[sortKey] ?? 0;
    const bv = b[sortKey] ?? 0;
    return (av < bv ? -1 : av > bv ? 1 : 0) * sortDir;
  });

  function Th({ label, k }: { label: string; k: SortKey }) {
    const active = sortKey === k;
    return (
      <th
        className="px-3 py-2 text-left text-[11px] font-semibold text-slate-500 cursor-pointer select-none whitespace-nowrap hover:text-slate-700"
        onClick={() => handleSort(k)}
      >
        <span className="inline-flex items-center gap-0.5">
          {label}
          {active
            ? sortDir === -1
              ? <ChevronDown className="h-3 w-3" />
              : <ChevronUp className="h-3 w-3" />
            : null}
        </span>
      </th>
    );
  }

  if (!rows.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-slate-900 mb-1">Visão da equipa</h3>
        <p className="text-xs text-slate-400">Sem mediadores neste escritório.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <div className="px-5 pt-5 pb-3">
        <h3 className="text-sm font-semibold text-slate-900">Visão da equipa</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="border-y border-slate-100 bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-500">Mediador</th>
              <Th label="Ativos" k="active" />
              <Th label="Fechados (mês)" k="closed_month" />
              <Th label="Fechados (trim.)" k="closed_trimestre" />
              <Th label="Fechados (ano)" k="closed_year" />
              <Th label="Conv. 90d" k="conversion_rate" />
              <Th label="Ciclo médio" k="avg_cycle_days" />
              <Th label="Comissão est." k="commission_est" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {sorted.map((row) => (
              <tr key={row.broker_id} className="hover:bg-slate-50">
                <td className="px-3 py-2.5 font-medium text-slate-900 whitespace-nowrap">{row.broker_name}</td>
                <td className="px-3 py-2.5 text-slate-700">{row.active}</td>
                <td className="px-3 py-2.5 text-slate-700">{row.closed_month}</td>
                <td className="px-3 py-2.5 text-slate-700">{row.closed_trimestre}</td>
                <td className="px-3 py-2.5 text-slate-700">{row.closed_year}</td>
                <td className="px-3 py-2.5">
                  <span className={cn(
                    'font-semibold',
                    row.conversion_rate >= 50 ? 'text-green-600' : 'text-slate-600'
                  )}>
                    {row.conversion_rate}%
                  </span>
                </td>
                <td className="px-3 py-2.5 text-slate-600">
                  {row.avg_cycle_days > 0 ? `${row.avg_cycle_days}d` : '—'}
                </td>
                <td className="px-3 py-2.5 font-semibold text-violet-700">
                  {formatEur(row.commission_est)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
