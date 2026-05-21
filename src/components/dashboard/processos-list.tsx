'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, List, LayoutDashboard, Columns3, ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react';
import { ProcessStepBadge, STEP_META } from './process-step-badge';
import { KanbanBoard } from './kanban-board';
import type { DocCounts } from './kanban-board';
import { formatDate, cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export type ProcessRow = {
  id: string;
  p1_name: string;
  p2_name: string | null;
  process_step: string;
  updated_at: string;
  broker_id: string;
  montante_solicitado: number | null;
  brokerName: string | null;
};

type SortField = 'client' | 'broker' | 'valor' | 'step' | 'updated_at';
type SortDir = 'asc' | 'desc';

const LS_VIEW_KEY = 'homeflux_processos_view';
const LS_COLS_KEY = 'homeflux_processos_columns';

const STEP_TABS = [
  { value: 'all',            label: 'Todos' },
  { value: 'lead',           label: 'Lead' },
  { value: 'docs_pending',   label: 'Docs. Pendentes' },
  { value: 'docs_complete',  label: 'Docs. Completos' },
  { value: 'propostas_sent', label: 'Propostas Enviadas' },
  { value: 'approved',       label: 'Aprovado' },
  { value: 'closed',         label: 'Fechado' },
];

function formatValor(v: number | null) {
  if (v == null || v === 0) return '—';
  if (v >= 1_000_000) return `€${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `€${Math.round(v / 1_000)}k`;
  return `€${v}`;
}

function formatTotalValor(v: number) {
  if (v >= 1_000_000) return `€${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `€${Math.round(v / 1_000)}k`;
  return `€${v}`;
}

type ColsState = { broker: boolean; valor: boolean; docs: boolean; last_activity: boolean };

interface ProcessosListProps {
  initialProcesses: ProcessRow[];
  initialDocCounts: DocCounts;
  totalCount: number;
  totalValor: number;
  showBrokerColumn: boolean;
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ArrowUpDown className="h-3 w-3 text-slate-300" />;
  return dir === 'asc' ? <ChevronUp className="h-3 w-3 text-blue-500" /> : <ChevronDown className="h-3 w-3 text-blue-500" />;
}

export function ProcessosList({
  initialProcesses,
  initialDocCounts,
  totalCount,
  totalValor,
  showBrokerColumn,
}: ProcessosListProps) {
  const [processes, setProcesses] = useState(initialProcesses);
  const [docCounts, setDocCounts] = useState<DocCounts>(initialDocCounts);
  const [search, setSearch] = useState('');
  const [stepFilter, setStepFilter] = useState('all');
  const [view, setView] = useState<'list' | 'kanban'>('list');
  const [sortField, setSortField] = useState<SortField>('updated_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialProcesses.length >= 25);
  const [cols, setCols] = useState<ColsState>({
    broker: showBrokerColumn,
    valor: true,
    docs: true,
    last_activity: true,
  });

  useEffect(() => {
    const storedView = localStorage.getItem(LS_VIEW_KEY);
    if (storedView === 'list' || storedView === 'kanban') setView(storedView);

    const storedCols = localStorage.getItem(LS_COLS_KEY);
    if (storedCols) {
      try { setCols((prev) => ({ ...prev, ...(JSON.parse(storedCols) as Partial<ColsState>) })); } catch {}
    }
  }, []);

  const handleViewChange = (v: 'list' | 'kanban') => {
    setView(v);
    localStorage.setItem(LS_VIEW_KEY, v);
  };

  const toggleCol = (key: keyof ColsState) => {
    setCols((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem(LS_COLS_KEY, JSON.stringify(next));
      return next;
    });
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('asc'); }
  };

  const loadMore = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/processes?offset=${processes.length}&limit=25`);
      const json = await res.json() as { processes: ProcessRow[]; docCounts: DocCounts };
      setProcesses((prev) => [...prev, ...json.processes]);
      setDocCounts((prev) => ({ ...prev, ...json.docCounts }));
      setHasMore(json.processes.length >= 25);
    } finally {
      setLoading(false);
    }
  };

  const filtered = processes.filter((p) => {
    const matchStep = stepFilter === 'all' || p.process_step === stepFilter;
    const q = search.toLowerCase();
    const matchSearch = !q
      || p.p1_name.toLowerCase().includes(q)
      || (p.p2_name?.toLowerCase().includes(q) ?? false);
    return matchStep && matchSearch;
  });

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortField === 'client') cmp = a.p1_name.localeCompare(b.p1_name);
    else if (sortField === 'broker') cmp = (a.brokerName ?? '').localeCompare(b.brokerName ?? '');
    else if (sortField === 'valor') cmp = (a.montante_solicitado ?? 0) - (b.montante_solicitado ?? 0);
    else if (sortField === 'step') cmp = a.process_step.localeCompare(b.process_step);
    else cmp = a.updated_at.localeCompare(b.updated_at);
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const countByStep = (step: string) =>
    step === 'all' ? processes.length : processes.filter((p) => p.process_step === step).length;

  const TOGGLEABLE_COLS: { key: keyof ColsState; label: string }[] = [
    { key: 'broker', label: 'Mediador' },
    { key: 'valor', label: 'Valor' },
    { key: 'docs', label: 'Docs' },
    { key: 'last_activity', label: 'Última actividade' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Processos</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {totalCount} {totalCount === 1 ? 'processo' : 'processos'}
            {totalValor > 0 && (
              <> · <span className="font-medium text-slate-600">{formatTotalValor(totalValor)} em curso</span></>
            )}
          </p>
        </div>
        <Link
          href="/dashboard/processes/new"
          className="inline-flex items-center h-9 px-4 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shrink-0"
        >
          + Novo processo
        </Link>
      </div>

      {/* Controls row */}
      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Pesquisar cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all placeholder:text-slate-400"
          />
        </div>

        {/* View toggle */}
        <div className="flex items-center bg-slate-100 rounded-lg p-0.5 shrink-0">
          <button
            onClick={() => handleViewChange('list')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
              view === 'list' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'
            )}
          >
            <List className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Lista</span>
          </button>
          <button
            onClick={() => handleViewChange('kanban')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
              view === 'kanban' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'
            )}
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Kanban</span>
          </button>
        </div>

        {/* Colunas — list view only, kept in layout for both views to avoid search bar width shift */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              className={cn(
                'flex items-center gap-1.5 h-9 px-3 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shrink-0',
                view === 'kanban' && 'invisible pointer-events-none'
              )}
            >
              <Columns3 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Colunas</span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-44 p-1.5" align="end">
              {TOGGLEABLE_COLS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => toggleCol(key)}
                  className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md hover:bg-slate-50 text-xs text-slate-700"
                >
                  <span
                    className={cn(
                      'w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0',
                      cols[key] ? 'bg-blue-600 border-blue-600' : 'border-slate-300'
                    )}
                  >
                    {cols[key] && (
                      <svg viewBox="0 0 12 12" fill="none" className="w-2.5 h-2.5">
                        <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  {label}
                </button>
              ))}
          </PopoverContent>
        </Popover>
      </div>

      {/* Filter pills — list view only */}
      {view === 'list' && (
        <div className="flex gap-1.5 mb-3 overflow-x-auto pb-0.5 scrollbar-none">
          {STEP_TABS.map((tab) => {
            const count = countByStep(tab.value);
            if (tab.value !== 'all' && count === 0) return null;
            const isActive = stepFilter === tab.value;
            const meta = tab.value !== 'all' ? STEP_META[tab.value] : null;
            return (
              <button
                key={tab.value}
                onClick={() => setStepFilter(tab.value)}
                className={cn(
                  'inline-flex items-center gap-1.5 shrink-0 h-7 px-3 rounded-full text-xs font-medium border transition-colors',
                  isActive
                    ? tab.value === 'all'
                      ? 'bg-slate-800 text-white border-slate-800'
                      : `${meta?.className ?? ''} border-transparent`
                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700'
                )}
              >
                {tab.label}
                <span className={cn('text-[10px] font-semibold', isActive ? 'opacity-70' : 'text-slate-400')}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Content */}
      {view === 'kanban' ? (
        <KanbanBoard
          initialClients={processes.map((p) => ({
            id: p.id,
            p1_name: p.p1_name,
            p2_name: p.p2_name,
            process_step: p.process_step,
            updated_at: p.updated_at,
            broker_id: p.broker_id,
            brokers: p.brokerName ? { id: p.broker_id, users: { name: p.brokerName } } : null,
          }))}
          search={search}
          docCounts={docCounts}
          showBrokerColumn={cols.broker}
        />
      ) : sorted.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl py-16 text-center">
          <p className="text-sm text-slate-400">Nenhum processo encontrado</p>
        </div>
      ) : (
        <>
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left px-4 py-2.5">
                    <button onClick={() => handleSort('client')} className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700">
                      Cliente <SortIcon active={sortField === 'client'} dir={sortDir} />
                    </button>
                  </th>
                  {cols.broker && (
                    <th className="text-left px-4 py-2.5 hidden md:table-cell">
                      <button onClick={() => handleSort('broker')} className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700">
                        Mediador <SortIcon active={sortField === 'broker'} dir={sortDir} />
                      </button>
                    </th>
                  )}
                  {cols.valor && (
                    <th className="text-left px-4 py-2.5 hidden sm:table-cell">
                      <button onClick={() => handleSort('valor')} className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700">
                        Valor <SortIcon active={sortField === 'valor'} dir={sortDir} />
                      </button>
                    </th>
                  )}
                  {cols.docs && (
                    <th className="text-left px-4 py-2.5 hidden lg:table-cell">
                      <span className="text-xs font-medium text-slate-500">Docs</span>
                    </th>
                  )}
                  <th className="text-left px-4 py-2.5">
                    <button onClick={() => handleSort('step')} className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700">
                      Etapa <SortIcon active={sortField === 'step'} dir={sortDir} />
                    </button>
                  </th>
                  {cols.last_activity && (
                    <th className="text-left px-4 py-2.5 hidden sm:table-cell">
                      <button onClick={() => handleSort('updated_at')} className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700">
                        Última actividade <SortIcon active={sortField === 'updated_at'} dir={sortDir} />
                      </button>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {sorted.map((p) => {
                  const dc = docCounts[p.id];
                  const docsTotal = dc?.mandatory_total ?? 0;
                  const docsApproved = dc?.mandatory_approved ?? 0;
                  const pct = docsTotal > 0 ? Math.round((docsApproved / docsTotal) * 100) : 0;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/dashboard/processes/${p.id}`} className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold shrink-0">
                            {p.p1_name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900 truncate">
                              {p.p1_name}
                              {p.p2_name && <span className="text-slate-400 font-normal ml-1">+ {p.p2_name}</span>}
                            </p>
                          </div>
                        </Link>
                      </td>
                      {cols.broker && (
                        <td className="px-4 py-3 hidden md:table-cell">
                          <Link href={`/dashboard/processes/${p.id}`} className="text-slate-600 text-sm truncate block max-w-[160px]">
                            {p.brokerName ?? '—'}
                          </Link>
                        </td>
                      )}
                      {cols.valor && (
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <Link href={`/dashboard/processes/${p.id}`} className="text-slate-700 font-medium tabular-nums">
                            {formatValor(p.montante_solicitado)}
                          </Link>
                        </td>
                      )}
                      {cols.docs && (
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <Link href={`/dashboard/processes/${p.id}`} className="block">
                            {docsTotal === 0 ? (
                              <span className="text-slate-300 text-xs">—</span>
                            ) : (
                              <div className="flex items-center gap-2">
                                <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className={cn('h-full rounded-full transition-all', pct === 100 ? 'bg-green-500' : 'bg-blue-500')}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className="text-xs text-slate-500 tabular-nums">{docsApproved}/{docsTotal}</span>
                              </div>
                            )}
                          </Link>
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <Link href={`/dashboard/processes/${p.id}`}>
                          <ProcessStepBadge step={p.process_step} />
                        </Link>
                      </td>
                      {cols.last_activity && (
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <Link href={`/dashboard/processes/${p.id}`} className="text-xs text-slate-400">
                            {formatDate(p.updated_at)}
                          </Link>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {hasMore && (
            <div className="mt-4 flex justify-center">
              <button
                onClick={loadMore}
                disabled={loading}
                className="h-9 px-6 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                {loading ? 'A carregar...' : 'Carregar mais'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
