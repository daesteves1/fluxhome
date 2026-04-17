'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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

const STEP_SET            = new Set(KANBAN_COLUMNS.map((c) => c.step));
const DEFAULT_VISIBLE_STEPS = KANBAN_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.step);
const LS_COLUMNS_KEY = 'homeflux_kanban_columns';
const LS_ORDER_KEY   = 'homeflux_kanban_order';

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
  const docs              = docCounts[client.id];
  const mandatoryTotal    = docs?.mandatory_total    ?? 0;
  const mandatoryApproved = docs?.mandatory_approved ?? 0;
  const rejectedCount     = docs?.rejected_count     ?? 0;
  const allDocsComplete   = mandatoryTotal > 0 && mandatoryApproved === mandatoryTotal;
  const docPct            = mandatoryTotal > 0 ? (mandatoryApproved / mandatoryTotal) * 100 : 0;

  const days       = daysAgo(client.updated_at);
  const daysColor  = days < 7 ? 'text-green-600' : days <= 14 ? 'text-amber-600' : 'text-red-600';
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

// ─── SortableCard ──────────────────────────────────────────────────────────────

function SortableCard({
  client,
  docCounts,
  showBrokerColumn,
}: {
  client: KanbanClient;
  docCounts: DocCounts;
  showBrokerColumn: boolean;
}) {
  const router = useRouter();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: client.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    // Smooth 200ms ease while other cards shift; no transition on the dragged card itself
    transition: isDragging ? undefined : (transition ?? 'transform 200ms ease'),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="cursor-grab active:cursor-grabbing touch-none relative"
      onClick={() => { if (!isDragging) router.push(`/dashboard/processes/${client.id}`); }}
    >
      {/* Always render the card so its height is preserved for the placeholder */}
      <KanbanCard client={client} docCounts={docCounts} showBrokerColumn={showBrokerColumn} />

      {/* Blue dashed placeholder overlay while this card is the active drag source */}
      {isDragging && (
        <div className="absolute inset-0 rounded-lg border-2 border-dashed border-blue-300 bg-blue-50/70" />
      )}
    </div>
  );
}

// ─── SortableColumn ────────────────────────────────────────────────────────────

function SortableColumn({
  step,
  label,
  accent,
  orderedClients,
  allOrderedIds,
  docCounts,
  showBrokerColumn,
}: {
  step: string;
  label: string;
  accent: string;
  orderedClients: KanbanClient[];
  allOrderedIds: string[];
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
          {orderedClients.length}
        </span>
      </div>

      {/* Cards container — SortableContext uses ALL IDs (search-independent) for stable positions */}
      <SortableContext items={allOrderedIds} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={cn(
            'flex-1 rounded-xl bg-slate-100 border border-slate-200 p-2 space-y-2 overflow-y-auto transition-colors',
            isOver && 'bg-blue-50 border-blue-300 ring-2 ring-blue-200 ring-offset-1'
          )}
          style={{ minHeight: 120, maxHeight: 'calc(100vh - 260px)' }}
        >
          {orderedClients.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-20 text-center px-2">
              <p className="text-[11px] text-slate-400">Nenhum processo nesta etapa</p>
            </div>
          ) : (
            orderedClients.map((client) => (
              <SortableCard
                key={client.id}
                client={client}
                docCounts={docCounts}
                showBrokerColumn={showBrokerColumn}
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}

// ─── KanbanBoard ───────────────────────────────────────────────────────────────

export function KanbanBoard({ initialClients, search, docCounts, showBrokerColumn }: KanbanBoardProps) {
  const router = useRouter();
  const [localClients, setLocalClients] = useState<KanbanClient[]>(initialClients);
  const [columnOrder,  setColumnOrder]  = useState<Record<string, string[]>>({});
  const [visibleSteps, setVisibleSteps] = useState<string[]>(DEFAULT_VISIBLE_STEPS);
  const [activeId,     setActiveId]     = useState<string | null>(null);
  const [colsMenuOpen, setColsMenuOpen] = useState(false);
  const colsMenuRef = useRef<HTMLDivElement>(null);

  // Refs for drag lifecycle data — captured at dragStart, read at dragEnd
  const originalStepRef       = useRef<string | null>(null);
  const lastOverColumnRef     = useRef<string | null>(null);

  // ── Sync localClients when server re-fetches (e.g. after router.refresh()) ───
  useEffect(() => {
    if (!activeId) {
      setLocalClients(initialClients);
    }
  }, [initialClients]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load from localStorage on mount ─────────────────────────────────────────
  useEffect(() => {
    try {
      const cols = localStorage.getItem(LS_COLUMNS_KEY);
      if (cols) {
        const p = JSON.parse(cols) as unknown;
        if (Array.isArray(p)) setVisibleSteps(p as string[]);
      }
    } catch { /* ignore */ }

    try {
      const ord = localStorage.getItem(LS_ORDER_KEY);
      if (ord) {
        const p = JSON.parse(ord) as unknown;
        if (p && typeof p === 'object' && !Array.isArray(p)) {
          setColumnOrder(p as Record<string, string[]>);
        }
      }
    } catch { /* ignore */ }
  }, []);

  // ── Close columns menu on outside click ─────────────────────────────────────
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (colsMenuRef.current && !colsMenuRef.current.contains(e.target as Node)) {
        setColsMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Grabbing cursor while dragging ───────────────────────────────────────────
  useEffect(() => {
    document.body.style.cursor = activeId ? 'grabbing' : '';
    return () => { document.body.style.cursor = ''; };
  }, [activeId]);

  // ── Column visibility toggle ─────────────────────────────────────────────────
  const toggleColumn = (step: string) => {
    setVisibleSteps((prev) => {
      const next = prev.includes(step) ? prev.filter((s) => s !== step) : [...prev, step];
      localStorage.setItem(LS_COLUMNS_KEY, JSON.stringify(next));
      return next;
    });
  };

  // ── Order helpers ────────────────────────────────────────────────────────────
  const getOrderedIds = useCallback((step: string): string[] => {
    const allInStep = localClients.filter((c) => c.process_step === step).map((c) => c.id);
    const saved     = columnOrder[step] ?? [];
    return [
      ...saved.filter((id) => allInStep.includes(id)),
      ...allInStep.filter((id) => !saved.includes(id)),
    ];
  }, [localClients, columnOrder]);

  const getOrderedClients = useCallback((step: string): KanbanClient[] =>
    getOrderedIds(step)
      .map((id) => localClients.find((c) => c.id === id))
      .filter((c): c is KanbanClient => c !== undefined),
  [getOrderedIds, localClients]);

  // ── DnD sensors ─────────────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 250, tolerance: 5 } })
  );

  // ── Drag start ───────────────────────────────────────────────────────────────
  const handleDragStart = ({ active }: DragStartEvent) => {
    const client = localClients.find((c) => c.id === (active.id as string));
    originalStepRef.current   = client?.process_step ?? null;
    lastOverColumnRef.current = client?.process_step ?? null;
    setActiveId(active.id as string);
  };

  // ── Drag over: move card between columns in real-time ────────────────────────
  const handleDragOver = ({ active, over }: DragOverEvent) => {
    if (!over) return;

    const clientId   = active.id as string;
    const overId     = over.id   as string;

    const activeClient = localClients.find((c) => c.id === clientId);
    if (!activeClient) return;

    const fromStep     = activeClient.process_step;
    const isColumnDrop = STEP_SET.has(overId);
    const overClient   = !isColumnDrop ? localClients.find((c) => c.id === overId) : undefined;
    const toStep       = isColumnDrop ? overId : (overClient?.process_step ?? fromStep);

    // Only act when crossing a column boundary
    if (toStep === fromStep) return;
    if (lastOverColumnRef.current === toStep) return;
    lastOverColumnRef.current = toStep;

    // Immediately move card to new column — optimistic, no API yet
    setLocalClients((prev) =>
      prev.map((c) => (c.id === clientId ? { ...c, process_step: toStep } : c))
    );
  };

  // ── Drag end: finalise position + fire API ───────────────────────────────────
  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    lastOverColumnRef.current = null;

    const clientId     = active.id as string;
    const originalStep = originalStepRef.current;

    // Drag cancelled (dropped outside / Escape) — revert
    if (!over) {
      if (originalStep) {
        setLocalClients((prev) =>
          prev.map((c) => (c.id === clientId ? { ...c, process_step: originalStep } : c))
        );
      }
      return;
    }

    const overId       = over.id as string;
    const activeClient = localClients.find((c) => c.id === clientId);
    if (!activeClient) return;

    const finalStep    = activeClient.process_step; // may have changed in onDragOver
    const isColumnDrop = STEP_SET.has(overId);
    const overClient   = !isColumnDrop ? localClients.find((c) => c.id === overId) : undefined;

    if (finalStep === originalStep) {
      // ── Within-column reorder ───────────────────────────────────────────────
      if (!isColumnDrop && overId !== clientId && overClient?.process_step === finalStep) {
        const orderedIds = getOrderedIds(finalStep);
        const oldIdx     = orderedIds.indexOf(clientId);
        const newIdx     = orderedIds.indexOf(overId);
        if (oldIdx !== -1 && newIdx !== -1 && oldIdx !== newIdx) {
          const newOrder = arrayMove(orderedIds, oldIdx, newIdx);
          setColumnOrder((prev) => {
            const next = { ...prev, [finalStep]: newOrder };
            localStorage.setItem(LS_ORDER_KEY, JSON.stringify(next));
            return next;
          });
        }
      }
      // No API call — step didn't change
    } else {
      // ── Cross-column: card already moved via onDragOver, finalise order ─────
      setColumnOrder((prev) => {
        const next = { ...prev };

        // Remove from original column order
        if (originalStep && next[originalStep]) {
          next[originalStep] = next[originalStep].filter((id) => id !== clientId);
        }

        // Insert into final column at the position of the over-card (if any)
        const existing = (next[finalStep] ?? []).filter((id) => id !== clientId);
        if (!isColumnDrop && overClient?.process_step === finalStep && overId !== clientId) {
          // Dropped over a specific card — insert before that card
          const idx = existing.indexOf(overId);
          if (idx !== -1) {
            existing.splice(idx, 0, clientId);
          } else {
            existing.push(clientId);
          }
          next[finalStep] = existing;
        } else {
          // Dropped on the column background (below all cards) — append to end
          next[finalStep] = [...existing, clientId];
        }

        localStorage.setItem(LS_ORDER_KEY, JSON.stringify(next));
        return next;
      });

      // Fire API call in background — optimistic: UI already reflects new state
      void (async () => {
        try {
          const res = await fetch(`/api/processes/${clientId}`, {
            method:  'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ process_step: finalStep }),
          });
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            console.error('[Kanban] PATCH failed:', res.status, errData);
            toast.error('Não foi possível guardar a alteração');
          } else {
            router.refresh();
          }
        } catch (err) {
          console.error('[Kanban] Error saving process_step:', err);
          toast.error('Não foi possível guardar a alteração');
        }
      })();
    }
  };

  // ── Build display lists ───────────────────────────────────────────────────────
  const searchLower   = search.trim().toLowerCase();
  const matchesSearch = (c: KanbanClient) =>
    !searchLower ||
    c.p1_name.toLowerCase().includes(searchLower) ||
    (c.p2_name?.toLowerCase().includes(searchLower) ?? false);

  const visibleColumns = KANBAN_COLUMNS.filter((col) => visibleSteps.includes(col.step));
  const activeClient   = activeId ? (localClients.find((c) => c.id === activeId) ?? null) : null;

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
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto pb-4" style={{ scrollbarGutter: 'stable' }}>
          {visibleColumns.map((col) => (
            <SortableColumn
              key={col.step}
              step={col.step}
              label={col.label}
              accent={col.accent}
              orderedClients={getOrderedClients(col.step).filter(matchesSearch)}
              allOrderedIds={getOrderedIds(col.step)}
              docCounts={docCounts}
              showBrokerColumn={showBrokerColumn}
            />
          ))}
        </div>

        {/* Ghost card following the cursor — no drop animation (card is already placed) */}
        <DragOverlay dropAnimation={null}>
          {activeClient && (
            <div className="rotate-1 scale-[1.03] shadow-2xl w-[260px] sm:w-[280px]">
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
