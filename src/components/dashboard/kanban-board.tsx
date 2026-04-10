'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Settings2 } from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface DocCounts {
  [clientId: string]: {
    mandatory_total: number;
    mandatory_approved: number;
    rejected_count: number;
  };
}

export interface KanbanClient {
  id: string;
  p1_name: string;
  p2_name: string | null;
  process_step: string;
  updated_at: string;
  broker_id: string;
  brokers: { id: string; users: { name: string } | null } | null;
}

interface KanbanBoardProps {
  initialClients: KanbanClient[];
  search: string;
  docCounts: DocCounts;
  showBrokerColumn: boolean;
}

// ─── Column config ─────────────────────────────────────────────────────────────

const KANBAN_COLUMNS: { step: string; label: string; accent: string; defaultVisible: boolean }[] = [
  { step: 'lead',            label: 'Lead',               accent: '#94a3b8', defaultVisible: false },
  { step: 'docs_pending',    label: 'Docs. Pendentes',    accent: '#f59e0b', defaultVisible: true  },
  { step: 'docs_complete',   label: 'Docs. Completos',    accent: '#3b82f6', defaultVisible: true  },
  { step: 'propostas_sent',  label: 'Propostas Enviadas', accent: '#a855f7', defaultVisible: true  },
  { step: 'approved',        label: 'Aprovado',           accent: '#22c55e', defaultVisible: true  },
  { step: 'closed',          label: 'Fechado',            accent: '#64748b', defaultVisible: false },
];

const ALL_STEPS = KANBAN_COLUMNS.map((c) => c.step);
const DEFAULT_VISIBLE_STEPS = KANBAN_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.step);
const LS_COLUMNS_KEY = 'homeflux_kanban_columns';

// ─── Helpers ───────────────────────────────────────────────────────────────────

function daysAgo(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

// ─── KanbanCard (pure display) ─────────────────────────────────────────────────

function KanbanCard({
  client,
  docCounts,
  showBrokerColumn,
}: {
  client: KanbanClient;
  docCounts: DocCounts;
  showBrokerColumn: boolean;
}) {
  const docs = docCounts[client.id];
  const mandatoryTotal = docs?.mandatory_total ?? 0;
  const mandatoryApproved = docs?.mandatory_approved ?? 0;
  const rejectedCount = docs?.rejected_count ?? 0;
  const allDocsComplete = mandatoryTotal > 0 && mandatoryApproved === mandatoryTotal;
  const docPct = mandatoryTotal > 0 ? (mandatoryApproved / mandatoryTotal) * 100 : 0;

  const days = daysAgo(client.updated_at);
  const daysColor = days < 7 ? 'text-green-600' : days <= 14 ? 'text-amber-600' : 'text-red-600';
  const brokerName = (client.brokers?.users as { name: string } | null)?.name;

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-3 hover:shadow-md hover:border-slate-300 transition-all select-none">
      {/* Avatar + name */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
          {client.p1_name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-900 truncate leading-tight">{client.p1_name}</p>
          {client.p2_name && (
            <p className="text-[10px] text-slate-400 truncate leading-tight">+ {client.p2_name}</p>
          )}
        </div>
      </div>

      {/* Doc progress bar */}
      {mandatoryTotal > 0 && (
        <div className="mb-2">
          <span className="text-[10px] text-slate-400">{mandatoryApproved}/{mandatoryTotal} docs</span>
          <div className="mt-0.5 h-1 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${docPct}%` }} />
          </div>
        </div>
      )}

      {/* Days in step */}
      <p className={cn('text-[10px] mb-1', daysColor)}>
        {days === 0
          ? 'menos de 1 dia nesta etapa'
          : `há ${days} dia${days !== 1 ? 's' : ''} nesta etapa`}
      </p>

      {/* Broker name (office view) */}
      {showBrokerColumn && brokerName && (
        <p className="text-[10px] text-slate-400 truncate mb-1">{brokerName}</p>
      )}

      {/* Status badges */}
      {(rejectedCount > 0 || allDocsComplete) && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {rejectedCount > 0 && (
            <span className="text-[10px] bg-red-50 text-red-600 border border-red-200 rounded px-1.5 py-0.5">
              ⚠ {rejectedCount} rejeitado{rejectedCount !== 1 ? 's' : ''}
            </span>
          )}
          {allDocsComplete && (
            <span className="text-[10px] bg-green-50 text-green-600 border border-green-200 rounded px-1.5 py-0.5">
              ✓ Docs completos
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── DraggableCard ─────────────────────────────────────────────────────────────

function DraggableCard({
  client,
  docCounts,
  showBrokerColumn,
}: {
  client: KanbanClient;
  docCounts: DocCounts;
  showBrokerColumn: boolean;
}) {
  const router = useRouter();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: client.id });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn('cursor-grab active:cursor-grabbing touch-none', isDragging && 'opacity-40')}
      onClick={() => router.push(`/dashboard/clients/${client.id}`)}
    >
      <KanbanCard client={client} docCounts={docCounts} showBrokerColumn={showBrokerColumn} />
    </div>
  );
}

// ─── DroppableColumn ───────────────────────────────────────────────────────────

function DroppableColumn({
  step,
  label,
  accent,
  clients,
  docCounts,
  showBrokerColumn,
}: {
  step: string;
  label: string;
  accent: string;
  clients: KanbanClient[];
  docCounts: DocCounts;
  showBrokerColumn: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: step });

  return (
    <div className="flex flex-col w-[260px] sm:w-[280px] shrink-0">
      {/* Column header */}
      <div className="flex items-center gap-2 mb-2 px-0.5">
        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: accent }} />
        <span className="text-xs font-semibold text-slate-700 truncate">{label}</span>
        <span className="ml-auto text-[11px] font-medium bg-slate-200 text-slate-600 rounded-full px-2 py-0.5 shrink-0">
          {clients.length}
        </span>
      </div>

      {/* Cards container */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 rounded-xl bg-slate-100 border border-slate-200 p-2 space-y-2 overflow-y-auto transition-colors',
          isOver && 'bg-blue-50 border-blue-300 ring-2 ring-blue-200 ring-offset-1'
        )}
        style={{ minHeight: 120, maxHeight: 'calc(100vh - 260px)' }}
      >
        {clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-20 text-center px-2">
            <p className="text-[11px] text-slate-400">Nenhum processo nesta etapa</p>
          </div>
        ) : (
          clients.map((client) => (
            <DraggableCard
              key={client.id}
              client={client}
              docCounts={docCounts}
              showBrokerColumn={showBrokerColumn}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ─── KanbanBoard ───────────────────────────────────────────────────────────────

export function KanbanBoard({ initialClients, search, docCounts, showBrokerColumn }: KanbanBoardProps) {
  const [localClients, setLocalClients] = useState<KanbanClient[]>(initialClients);
  const [visibleSteps, setVisibleSteps] = useState<string[]>(DEFAULT_VISIBLE_STEPS);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [colsMenuOpen, setColsMenuOpen] = useState(false);
  const colsMenuRef = useRef<HTMLDivElement>(null);

  // Load column visibility from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LS_COLUMNS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as unknown;
        if (Array.isArray(parsed)) setVisibleSteps(parsed as string[]);
      }
    } catch {
      // ignore
    }
  }, []);

  // Close columns menu on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (colsMenuRef.current && !colsMenuRef.current.contains(e.target as Node)) {
        setColsMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Grabbing cursor while dragging
  useEffect(() => {
    if (activeId) {
      document.body.style.cursor = 'grabbing';
    } else {
      document.body.style.cursor = '';
    }
    return () => { document.body.style.cursor = ''; };
  }, [activeId]);

  const toggleColumn = (step: string) => {
    setVisibleSteps((prev) => {
      const next = prev.includes(step) ? prev.filter((s) => s !== step) : [...prev, step];
      localStorage.setItem(LS_COLUMNS_KEY, JSON.stringify(next));
      return next;
    });
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  );

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveId(active.id as string);
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    if (!over) return;

    const toStep = over.id as string;
    const client = localClients.find((c) => c.id === active.id);
    if (!client || client.process_step === toStep) return;

    const fromStep = client.process_step;

    // Optimistic move
    setLocalClients((prev) =>
      prev.map((c) => (c.id === client.id ? { ...c, process_step: toStep } : c))
    );

    const fromIdx = ALL_STEPS.indexOf(fromStep);
    const toIdx = ALL_STEPS.indexOf(toStep);
    const isSkipping = Math.abs(fromIdx - toIdx) > 1;
    const toLabel = KANBAN_COLUMNS.find((c) => c.step === toStep)?.label ?? toStep;

    const message = isSkipping
      ? `⚠ Está a saltar etapas. Mover ${client.p1_name} para "${toLabel}"?`
      : `Mover ${client.p1_name} para "${toLabel}"?`;

    let cancelled = false;

    const timer = setTimeout(async () => {
      if (cancelled) return;
      const res = await fetch(`/api/clients/${client.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ process_step: toStep }),
      });
      if (!res.ok) {
        setLocalClients((prev) =>
          prev.map((c) => (c.id === client.id ? { ...c, process_step: fromStep } : c))
        );
        toast.error('Erro ao mover cliente');
      }
    }, 3000);

    toast(message, {
      duration: 3500,
      action: {
        label: 'Cancelar',
        onClick: () => {
          cancelled = true;
          clearTimeout(timer);
          setLocalClients((prev) =>
            prev.map((c) => (c.id === client.id ? { ...c, process_step: fromStep } : c))
          );
        },
      },
    });
  };

  // Apply search filter for display (doesn't affect drag state)
  const displayClients = search.trim()
    ? localClients.filter(
        (c) =>
          c.p1_name.toLowerCase().includes(search.toLowerCase()) ||
          (c.p2_name?.toLowerCase().includes(search.toLowerCase()) ?? false)
      )
    : localClients;

  const activeClient = activeId ? localClients.find((c) => c.id === activeId) ?? null : null;
  const visibleColumns = KANBAN_COLUMNS.filter((col) => visibleSteps.includes(col.step));

  return (
    <div>
      {/* Column visibility toggle */}
      <div className="flex items-center justify-end mb-3" ref={colsMenuRef}>
        <div className="relative">
          <button
            onClick={() => setColsMenuOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 h-7 px-3 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Settings2 className="h-3.5 w-3.5" />
            Colunas
          </button>
          {colsMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-50 p-1.5">
              {KANBAN_COLUMNS.map((col) => (
                <label
                  key={col.step}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={visibleSteps.includes(col.step)}
                    onChange={() => toggleColumn(col.step)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: col.accent }} />
                  <span className="text-xs text-slate-700">{col.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile scroll hint */}
      <p className="text-[11px] text-slate-400 text-center mb-2 md:hidden">← Deslize para ver mais →</p>

      {/* Board */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4" style={{ scrollbarGutter: 'stable' }}>
          {visibleColumns.map((col) => (
            <DroppableColumn
              key={col.step}
              step={col.step}
              label={col.label}
              accent={col.accent}
              clients={displayClients.filter((c) => c.process_step === col.step)}
              docCounts={docCounts}
              showBrokerColumn={showBrokerColumn}
            />
          ))}
        </div>

        <DragOverlay>
          {activeClient && (
            <div className="rotate-1 shadow-2xl opacity-95 w-[260px] sm:w-[280px]">
              <KanbanCard
                client={activeClient}
                docCounts={docCounts}
                showBrokerColumn={showBrokerColumn}
              />
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
