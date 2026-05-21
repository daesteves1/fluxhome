'use client';

import { useState, useMemo } from 'react';
import { ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { ActionQueues, ActionQueueItem } from '@/lib/dashboard/types';

type TabKey = keyof ActionQueues;

const TAB_CONFIG: { key: TabKey; label: string; dotColor: string }[] = [
  { key: 'followups',              label: 'Follow-ups',           dotColor: 'bg-blue-500' },
  { key: 'docs_pending',           label: 'Docs em falta',        dotColor: 'bg-amber-500' },
  { key: 'docs_analysis',          label: 'Em análise',           dotColor: 'bg-yellow-400' },
  { key: 'propostas_expiring',     label: 'Propostas a expirar',  dotColor: 'bg-orange-500' },
  { key: 'propostas_waiting',      label: 'Aguardar decisão',     dotColor: 'bg-purple-500' },
  { key: 'processos_parados',      label: 'Processos parados',    dotColor: 'bg-red-500' },
  { key: 'leads_nao_contactados',  label: 'Leads sem contacto',   dotColor: 'bg-rose-400' },
];

function urgencyLabel(item: ActionQueueItem): string {
  return item.statusLabel;
}

function urgencyPillClass(u: 0 | 1 | 2): string {
  if (u === 0) return 'bg-red-100 text-red-700';
  if (u === 1) return 'bg-amber-100 text-amber-700';
  return 'bg-slate-100 text-slate-500';
}

function sortItems(items: ActionQueueItem[]): ActionQueueItem[] {
  return [...items].sort((a, b) => a.urgency - b.urgency);
}

interface ActionBoardProps {
  queues: ActionQueues;
  showBrokerColumn: boolean;
}

export function ActionBoard({ queues, showBrokerColumn }: ActionBoardProps) {
  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    // Default to first tab with items
    const first = TAB_CONFIG.find((t) => queues[t.key].length > 0);
    return first?.key ?? 'followups';
  });

  const totalCount = useMemo(
    () => TAB_CONFIG.reduce((s, t) => s + queues[t.key].length, 0),
    [queues]
  );

  const items = useMemo(() => sortItems(queues[activeTab]), [queues, activeTab]);

  if (totalCount === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center">
        <p className="text-sm font-medium text-slate-900 mb-1">Tudo em ordem ✓</p>
        <p className="text-xs text-slate-400">Sem itens que precisem de ação hoje.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      {/* Chip tabs */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-3 flex-wrap border-b border-slate-100">
        {TAB_CONFIG.map((tab) => {
          const count = queues[tab.key].length;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                activeTab === tab.key
                  ? 'bg-slate-900 text-white'
                  : count > 0
                    ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    : 'bg-slate-50 text-slate-300 cursor-default'
              )}
            >
              <span className={cn('w-1.5 h-1.5 rounded-full', tab.dotColor)} />
              {tab.label}
              {count > 0 && (
                <span className={cn(
                  'min-w-[1.1rem] h-[1.1rem] rounded-full text-[10px] font-bold flex items-center justify-center px-0.5',
                  activeTab === tab.key
                    ? 'bg-white text-slate-900'
                    : 'bg-slate-700 text-white'
                )}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Item list */}
      <div className="divide-y divide-slate-50">
        {items.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-slate-400">
            Nenhum item nesta categoria
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-slate-900 truncate">{item.clientName}</p>
                  {showBrokerColumn && item.brokerName && (
                    <span className="text-[10px] text-slate-400 shrink-0">{item.brokerName}</span>
                  )}
                </div>
                <p className="text-xs text-slate-500 truncate mt-0.5">{item.label}</p>
              </div>
              <span className={cn(
                'text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0',
                urgencyPillClass(item.urgency)
              )}>
                {urgencyLabel(item)}
              </span>
              <Link
                href={`/dashboard/processes/${item.processId}`}
                className="shrink-0 inline-flex items-center gap-1 text-xs text-blue-600 font-medium hover:underline"
              >
                Abrir
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
