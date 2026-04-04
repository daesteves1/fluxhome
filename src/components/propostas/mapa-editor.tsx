'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Star, StarOff, ChevronUp, ChevronDown, FileSpreadsheet, FileText } from 'lucide-react';
import { ComparisonTable } from './comparison-table';
import type { BankProposta, MapaComparativo } from '@/types/proposta';
import { cn } from '@/lib/utils';

interface MapaEditorProps {
  clientId: string;
  backUrl: string;
  bankPropostas: BankProposta[];
  initialMapa: MapaComparativo | null;
}

export function MapaEditor({ clientId, backUrl, bankPropostas, initialMapa }: MapaEditorProps) {
  const router = useRouter();

  const [selectedIds, setSelectedIds] = useState<string[]>(
    initialMapa?.proposta_ids ?? []
  );
  const [recommendedId, setRecommendedId] = useState<string | null>(
    initialMapa?.recommended_proposta_id ?? null
  );
  const [isVisible, setIsVisible] = useState<boolean>(
    initialMapa?.is_visible_to_client ?? false
  );
  const [brokerNotes, setBrokerNotes] = useState<string>(
    initialMapa?.broker_notes ?? ''
  );
  const [saving, setSaving] = useState(false);

  // Ordered propostas by selectedIds order
  const orderedPropostas = selectedIds
    .map((sid) => bankPropostas.find((p) => p.id === sid))
    .filter(Boolean) as BankProposta[];

  function toggleSelected(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    // If removing the recommended, clear it
    if (!selectedIds.includes(id) === false && id === recommendedId) {
      setRecommendedId(null);
    }
  }

  function moveUp(id: string) {
    setSelectedIds((prev) => {
      const idx = prev.indexOf(id);
      if (idx <= 0) return prev;
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  }

  function moveDown(id: string) {
    setSelectedIds((prev) => {
      const idx = prev.indexOf(id);
      if (idx < 0 || idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/mapa`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposta_ids: selectedIds,
          recommended_proposta_id: recommendedId,
          is_visible_to_client: isVisible,
          broker_notes: brokerNotes || null,
          highlighted_cells: initialMapa?.highlighted_cells ?? {},
        }),
      });
      if (!res.ok) {
        const err = await res.json() as { error?: string };
        throw new Error(err.error ?? 'Erro ao guardar');
      }
      toast.success('Mapa guardado');
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao guardar');
    } finally {
      setSaving(false);
    }
  }

  function handleExcelExport() {
    window.open(`/api/clients/${clientId}/mapa/excel`, '_blank');
  }

  function handlePdfExport() {
    window.open(`/api/clients/${clientId}/mapa/pdf`, '_blank');
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-white flex-shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push(backUrl)}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
          <h1 className="text-lg font-semibold text-gray-900">Mapa Comparativo</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExcelExport}>
            <FileSpreadsheet className="h-4 w-4 mr-1.5" />
            Excel
          </Button>
          <Button variant="outline" size="sm" onClick={handlePdfExport}>
            <FileText className="h-4 w-4 mr-1.5" />
            PDF
          </Button>
          <div className="flex items-center gap-2 px-3">
            <Switch checked={isVisible} onCheckedChange={setIsVisible} />
            <Label className="text-sm cursor-pointer" onClick={() => setIsVisible((v) => !v)}>
              Visível ao cliente
            </Label>
          </div>
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving ? 'A guardar…' : 'Guardar'}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {bankPropostas.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <p className="text-sm">Nenhuma proposta bancária criada ainda.</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => router.push(`/dashboard/clients/${clientId}/bank-propostas/new`)}
            >
              Criar primeira proposta
            </Button>
          </div>
        ) : (
          <>
            {/* Proposta selector */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
                Selecionar & ordenar propostas
              </h2>
              <div className="space-y-2">
                {bankPropostas.map((p) => {
                  const isSelected = selectedIds.includes(p.id);
                  const orderIndex = selectedIds.indexOf(p.id);
                  return (
                    <div
                      key={p.id}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors',
                        isSelected ? 'border-[#1E3A5F] bg-blue-50/40' : 'border-gray-200 bg-white'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelected(p.id)}
                        className="w-4 h-4 accent-[#1E3A5F]"
                      />
                      <span className="flex-1 text-sm font-medium text-gray-800">{p.bank_name}</span>

                      {isSelected && (
                        <>
                          <span className="text-xs text-gray-400 w-5 text-center">{orderIndex + 1}</span>
                          <button
                            onClick={() => moveUp(p.id)}
                            disabled={orderIndex === 0}
                            className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                          >
                            <ChevronUp className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => moveDown(p.id)}
                            disabled={orderIndex === selectedIds.length - 1}
                            className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                          >
                            <ChevronDown className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setRecommendedId(recommendedId === p.id ? null : p.id)}
                            title={recommendedId === p.id ? 'Remover recomendação' : 'Marcar como recomendado'}
                            className={cn(
                              'p-1 transition-colors',
                              recommendedId === p.id ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-400'
                            )}
                          >
                            {recommendedId === p.id
                              ? <Star className="h-4 w-4 fill-yellow-400 text-yellow-500" />
                              : <StarOff className="h-4 w-4" />
                            }
                          </button>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Broker notes */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                Notas para o cliente
              </h2>
              <Textarea
                value={brokerNotes}
                onChange={(e) => setBrokerNotes(e.target.value)}
                placeholder="Adicione observações que serão visíveis ao cliente no portal…"
                rows={3}
              />
            </div>

            {/* Preview table */}
            {orderedPropostas.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                  Pré-visualização
                </h2>
                <ComparisonTable
                  propostas={orderedPropostas}
                  recommendedId={recommendedId}
                  highlightedCells={initialMapa?.highlighted_cells as Record<string, string> | undefined}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
