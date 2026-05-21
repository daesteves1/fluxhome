'use client';

import { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BankScorecardRow } from '@/lib/dashboard/types';

type SortKey = 'propostas_count' | 'approved_count' | 'taeg_avg' | 'spread_avg' | 'chosen_count';

interface BankScorecardProps {
  rows: BankScorecardRow[];
}

export function BankScorecard({ rows }: BankScorecardProps) {
  const [sortKey, setSortKey] = useState<SortKey>('propostas_count');
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
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Desempenho bancário</h3>
        <p className="text-xs text-slate-400">Sem propostas de banco registadas.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <div className="px-5 pt-5 pb-3">
        <h3 className="text-sm font-semibold text-slate-900">Desempenho bancário</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="border-y border-slate-100 bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-500 whitespace-nowrap">Banco</th>
              <Th label="Propostas" k="propostas_count" />
              <Th label="Aprovações" k="approved_count" />
              <Th label="TAEG médio" k="taeg_avg" />
              <Th label="Spread médio" k="spread_avg" />
              <Th label="% escolhidas" k="chosen_count" />
              <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-400 whitespace-nowrap">
                Tempo resposta
                <span className="ml-1 text-slate-300" title="Em breve">ⓘ</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {sorted.map((row) => {
              const approvalRate = row.propostas_count > 0
                ? Math.round((row.approved_count / row.propostas_count) * 100)
                : 0;
              const chosenRate = row.propostas_count > 0
                ? Math.round((row.chosen_count / row.propostas_count) * 100)
                : 0;
              return (
                <tr key={row.bank_name} className="hover:bg-slate-50">
                  <td className="px-3 py-2.5 font-medium text-slate-900 whitespace-nowrap">{row.bank_name}</td>
                  <td className="px-3 py-2.5 text-slate-700">{row.propostas_count}</td>
                  <td className="px-3 py-2.5">
                    <span className={cn(
                      'font-semibold',
                      approvalRate >= 70 ? 'text-green-600' : approvalRate >= 40 ? 'text-amber-600' : 'text-slate-600'
                    )}>
                      {approvalRate}%
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-slate-600">
                    {row.taeg_avg != null ? `${row.taeg_avg.toFixed(2)}%` : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-slate-600">
                    {row.spread_avg != null ? `${row.spread_avg.toFixed(2)}%` : '—'}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={cn(
                      'font-semibold',
                      chosenRate >= 30 ? 'text-green-600' : 'text-slate-600'
                    )}>
                      {chosenRate}%
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-slate-300">—</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
