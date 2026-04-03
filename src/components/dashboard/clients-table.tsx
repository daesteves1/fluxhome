'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Search, ChevronRight } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProcessStepBadge } from './process-step-badge';
import { formatDate } from '@/lib/utils';
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

export function ClientsTable({ clients, showBrokerColumn = false }: ClientsTableProps) {
  const t = useTranslations('clients');
  const tSteps = useTranslations('processSteps');
  const [search, setSearch] = useState('');
  const [stepFilter, setStepFilter] = useState(ALL_STEPS);

  const steps: ProcessStep[] = [
    'lead',
    'docs_pending',
    'docs_complete',
    'propostas_sent',
    'approved',
    'closed',
  ];

  const filtered = clients.filter((c) => {
    const matchesSearch =
      c.p1_name.toLowerCase().includes(search.toLowerCase()) ||
      (c.p2_name?.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchesStep = stepFilter === ALL_STEPS || c.process_step === stepFilter;
    return matchesSearch && matchesStep;
  });

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all placeholder:text-slate-400"
          />
        </div>
        <Select value={stepFilter} onValueChange={setStepFilter}>
          <SelectTrigger className="w-full sm:w-44 h-9 text-sm bg-white border-slate-200">
            <SelectValue placeholder={t('filterByStep')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_STEPS}>{t('allSteps')}</SelectItem>
            {steps.map((step) => (
              <SelectItem key={step} value={step}>
                {tSteps(step)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
