'use client';

import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Plus, AlertCircle } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { OfficeDocTemplate } from '@/lib/document-defaults';

interface Props {
  initialTemplate: OfficeDocTemplate[];
  saving: boolean;
  onSave: (template: OfficeDocTemplate[]) => void;
}

// ─── Sortable row ─────────────────────────────────────────────────────────────

function SortableDocRow({
  doc,
  onChange,
  onDelete,
}: {
  doc: OfficeDocTemplate;
  onChange: (updated: OfficeDocTemplate) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: doc.doc_type });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-2 px-3 py-2.5 bg-white border border-slate-200 rounded-lg',
        isDragging && 'shadow-md z-10'
      )}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 shrink-0"
        tabIndex={-1}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Enable toggle */}
      <Switch
        checked={doc.enabled}
        onCheckedChange={(v) => onChange({ ...doc, enabled: v })}
        className="shrink-0"
      />

      {/* Label */}
      <Input
        value={doc.label}
        onChange={(e) => onChange({ ...doc, label: e.target.value })}
        className="flex-1 h-7 text-sm min-w-0"
      />

      {/* Mandatory */}
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-[10px] text-slate-400">Obrig.</span>
        <Switch
          checked={doc.is_mandatory}
          onCheckedChange={(v) => onChange({ ...doc, is_mandatory: v })}
        />
      </div>

      {/* Max files */}
      <input
        type="number"
        min={1}
        max={5}
        value={doc.max_files}
        onChange={(e) => onChange({ ...doc, max_files: Math.max(1, Math.min(5, Number(e.target.value))) })}
        className="w-12 h-7 text-sm text-center border border-slate-200 rounded-md shrink-0"
      />

      {/* Proponente */}
      <Select
        value={doc.proponente}
        onValueChange={(v: 'per_proponente' | 'shared') => onChange({ ...doc, proponente: v })}
      >
        <SelectTrigger className="w-32 h-7 text-xs shrink-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="per_proponente">Por proponente</SelectItem>
          <SelectItem value="shared">Partilhado</SelectItem>
        </SelectContent>
      </Select>

      {/* Delete (only custom) */}
      {doc.is_custom ? (
        <button
          onClick={onDelete}
          className="shrink-0 text-slate-300 hover:text-red-500 transition-colors"
          title="Remover documento personalizado"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ) : (
        <div className="w-4 shrink-0" />
      )}
    </div>
  );
}

// ─── Main editor ──────────────────────────────────────────────────────────────

export function DocumentTemplateEditor({ initialTemplate, saving, onSave }: Props) {
  const [docs, setDocs] = useState<OfficeDocTemplate[]>(initialTemplate);

  // Add custom doc form state
  const [addOpen, setAddOpen] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newMandatory, setNewMandatory] = useState(false);
  const [newMaxFiles, setNewMaxFiles] = useState(1);
  const [newProponente, setNewProponente] = useState<'per_proponente' | 'shared'>('shared');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setDocs((prev) => {
        const oldIdx = prev.findIndex((d) => d.doc_type === active.id);
        const newIdx = prev.findIndex((d) => d.doc_type === over.id);
        return arrayMove(prev, oldIdx, newIdx);
      });
    }
  }

  function updateDoc(docType: string, updated: OfficeDocTemplate) {
    setDocs((prev) => prev.map((d) => (d.doc_type === docType ? updated : d)));
  }

  function deleteDoc(docType: string) {
    setDocs((prev) => prev.filter((d) => d.doc_type !== docType));
  }

  function addCustomDoc() {
    if (!newLabel.trim()) return;
    const key = `custom_${Date.now()}`;
    setDocs((prev) => [
      ...prev,
      {
        doc_type: key,
        label: newLabel.trim(),
        is_mandatory: newMandatory,
        max_files: newMaxFiles,
        proponente: newProponente,
        enabled: true,
        is_custom: true,
      },
    ]);
    setNewLabel('');
    setNewMandatory(false);
    setNewMaxFiles(1);
    setNewProponente('shared');
    setAddOpen(false);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
        <span className="w-4 shrink-0" />
        <span className="w-8 shrink-0">Ativo</span>
        <span className="flex-1">Label</span>
        <span className="w-14 text-center shrink-0">Obrig.</span>
        <span className="w-12 text-center shrink-0">Fich.</span>
        <span className="w-32 shrink-0">Tipo</span>
        <span className="w-4 shrink-0" />
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={docs.map((d) => d.doc_type)} strategy={verticalListSortingStrategy}>
          <div className="space-y-1.5">
            {docs.map((doc) => (
              <SortableDocRow
                key={doc.doc_type}
                doc={doc}
                onChange={(updated) => updateDoc(doc.doc_type, updated)}
                onDelete={() => deleteDoc(doc.doc_type)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Add custom doc */}
      {addOpen ? (
        <div className="border border-dashed border-slate-300 rounded-lg p-3 space-y-3 bg-slate-50">
          <p className="text-xs font-semibold text-slate-600">Novo documento personalizado</p>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Nome do documento"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              className="flex-1 h-8 text-sm"
              onKeyDown={(e) => e.key === 'Enter' && addCustomDoc()}
              autoFocus
            />
            <Select value={newProponente} onValueChange={(v: 'per_proponente' | 'shared') => setNewProponente(v)}>
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="per_proponente">Por proponente</SelectItem>
                <SelectItem value="shared">Partilhado</SelectItem>
              </SelectContent>
            </Select>
            <input
              type="number" min={1} max={5}
              value={newMaxFiles}
              onChange={(e) => setNewMaxFiles(Math.max(1, Math.min(5, Number(e.target.value))))}
              className="w-12 h-8 text-sm text-center border border-slate-200 rounded-md"
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs text-slate-600">
              <Switch checked={newMandatory} onCheckedChange={setNewMandatory} />
              Obrigatório
            </label>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setAddOpen(false)}>Cancelar</Button>
              <Button size="sm" onClick={addCustomDoc} disabled={!newLabel.trim()}>Adicionar</Button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium py-1"
        >
          <Plus className="h-4 w-4" />
          Adicionar documento personalizado
        </button>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <p className="flex items-center gap-1.5 text-xs text-slate-400">
          <AlertCircle className="h-3.5 w-3.5" />
          Alterações aplicam-se a novos processos criados neste escritório
        </p>
        <Button onClick={() => onSave(docs)} disabled={saving}>
          {saving ? 'A guardar...' : 'Guardar Template'}
        </Button>
      </div>
    </div>
  );
}
