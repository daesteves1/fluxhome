'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Search, ChevronRight } from 'lucide-react';
import { ProcessStepBadge } from './process-step-badge';
import { formatDate, cn } from '@/lib/utils';
import type { ProcessStep } from '@/types/database';

interface Client {
  id: string;
  p1_name: string;
  p2_name: string | null;
  process_step: string;
  updated_at: string;
  broker_id: string;
  brokers: {
    id: string;
    users: { name: string } | null;
  } | null;
}

interface ClientsTableProps {
  clients: Client[];
  showBrokerColumn?: boolean;
}

const ALL_STEPS = 'all';

const STEP_TABS: { value: ProcessStep | 'all'; label: string; active: string; inactive: string }[] = [
  { value: 'all',           label: 'Todos',               active: 'bg-slate-800 text-white',   inactive: 'text-slate-500 hover:text-slate-700 hover:bg-slate-100' },
  { value: 'lead',          label: 'Lead',                active: 'bg-slate-500 text-white',   inactive: 'text-slate-500 hover:text-slate-700 hover:bg-slate-100' },
  { value: 'docs_pending',  label: 'Docs. Pendentes',     active: 'bg-amber-500 text-white',   inactive: 'text-amber-600 hover:bg-amber-50' },
  { value: 'docs_complete', label: 'Docs. Completos',     active: 'bg-blue-500 text-white',    inactive: 'text-blue-600 hover:bg-blue-50' },
  { value: 'propostas_sent',label: 'Propostas Enviadas',  active: 'bg-purple-500 text-white',  inactive: 'text-purple-600 hover:bg-purple-50' },
  { value: 'approved',      label: 'Aprovado',            active: 'bg-green-500 text-white',   inactive: 'text-green-600 hover:bg-green-50' },
  { value: 'closed',        label: 'Fechado',             active: 'bg-slate-600 text-white',   inactive: 'text-slate-500 hover:text-slate-700 hover:bg-slate-100' },
];

export function ClientsTable({ clients, showBrokerColumn = false }: ClientsTableProps) {
  const t = useTranslations('clients');
  const [search, setSearch] = useState('');
  const [stepFilter, setStepFilter] = useState<ProcessStep | 'all'>(ALL_STEPS);

  const countByStep = (step: ProcessStep | 'all') =>
    step === 'all' ? clients.length : clients.filter((c) => c.process_step === step).length;

  const filtered = clients.filter((c) => {
    const matchesSearch =
      c.p1_name.toLowerCase().includes(search.toLowerCase()) ||
      (c.p2_name?.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchesStep = stepFilter === ALL_STEPS || c.process_step === stepFilter;
    return matchesSearch && matchesStep;
  });

  return (
    <div>
      {/* Search bar */}
      <div className="relative mb-2">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
        <input
          type="text"
          placeholder={t('searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-9 pl-9 pr-3 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all placeholder:text-slate-400"
        />
      </div>

      {/* Step filter tabs */}
      <div className="flex gap-1 mb-3 overflow-x-auto pb-0.5 scrollbar-none">
        {STEP_TABS.map((tab) => {
          const count = countByStep(tab.value);
          if (tab.value !== 'all' && count === 0) return null;
          const isActive = stepFilter === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => setStepFilter(tab.value)}
              className={cn(
                'inline-flex items-center gap-1.5 shrink-0 h-7 px-3 rounded-full text-xs font-medium transition-colors',
                isActive ? tab.active : tab.inactive
              )}
            >
              {tab.label}
              <span
                className={cn(
                  'inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-[10px] font-semibold',
                  isActive ? 'bg-white/25 text-inherit' : 'bg-slate-100 text-slate-500'
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Client rows */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl py-12 text-center">
          <p className="text-sm text-slate-400">{t('noClients')}</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
          {filtered.map((client) => (
            <Link
              key={client.id}
              href={`/dashboard/clients/${client.id}`}
              className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50 transition-colors group"
            >
              {/* Avatar */}
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold shrink-0">
                {client.p1_name.charAt(0).toUpperCase()}
              </div>

              {/* Name */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {client.p1_name}
                  {client.p2_name && (
                    <span className="text-slate-400 font-normal ml-1.5">+ {client.p2_name}</span>
                  )}
                </p>
                {showBrokerColumn && (client.brokers?.users as { name: string } | null)?.name && (
                  <p className="text-xs text-slate-400 truncate">
                    {(client.brokers?.users as { name: string } | null)?.name}
                  </p>
                )}
              </div>

              {/* Step badge */}
              <ProcessStepBadge step={client.process_step as ProcessStep} />

              {/* Date */}
              <p className="text-xs text-slate-400 shrink-0 hidden sm:block">
                {formatDate(client.updated_at)}
              </p>

              {/* Arrow */}
              <ChevronRight className="h-4 w-4 text-slate-300 shrink-0 group-hover:text-slate-400 transition-colors" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
