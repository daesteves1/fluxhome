'use client';

import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Star, Save, Eye, EyeOff, ChevronLeft, Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export type BankData = {
  name: string;
  recommended?: boolean;
  highlight?: boolean; // legacy alias — treated as recommended
  montante?: string;
  prazo?: string;
  tipo_taxa?: string;     // "Variável" | "Fixa" | "Mista"
  periodo_fixo?: string;  // years, shown if Fixa or Mista
  euribor?: string;       // "3 meses" | "6 meses" | "12 meses" | "N/A"
  spread?: string;
  tan?: string;
  prestacao?: string;
  doc_path?: string;      // optional uploaded bank PDF path
};

export type InsuranceData = {
  [bankName: string]: {
    vida: string;
    multirriscos: string;
    vida_ext: string;
    multirriscos_ext: string;
  };
};

export type ChargeRow = {
  label: string;
  [bankName: string]: string | boolean | undefined;
};

interface PropostaEditorProps {
  clientId: string;
  clientName: string;
  brokerId: string;
  propostaId?: string;
  defaultLoanAmount?: number | null;
  defaultTermMonths?: number | null;
  initialData?: {
    title: string;
    comparison_data: BankData[];
    insurance_data: InsuranceData;
    one_time_charges: ChargeRow[];
    monthly_charges: ChargeRow[];
    notes: string;
    is_visible_to_client: boolean;
  };
}

const DEFAULT_ONE_TIME_CHARGES = [
  'Comissão de avaliação',
  'Comissão de estudo',
  'Abertura do processo',
  'Comissão de formalização',
  'Comissão de solicitadoria',
  'Documento particular autenticado',
  'Imposto de selo sobre o mútuo',
  'Imposto de selo sobre aquisição',
  'IMT',
  'Registo',
  'Escritura',
  'Cheque bancário',
];

const TIPO_TAXA_OPTIONS = ['Variável', 'Fixa', 'Mista'];
const EURIBOR_OPTIONS = ['3 meses', '6 meses', '12 meses', 'N/A'];

export function PropostaEditor({
  clientId,
  clientName,
  propostaId,
  defaultLoanAmount,
  defaultTermMonths,
  initialData,
}: PropostaEditorProps) {
  const t = useTranslations('propostas');
  const router = useRouter();

  const [title, setTitle] = useState(initialData?.title ?? '');
  const [notes, setNotes] = useState(initialData?.notes ?? '');
  const [isVisible, setIsVisible] = useState(initialData?.is_visible_to_client ?? false);
  const [saving, setSaving] = useState(false);
  const [uploadingBankIdx, setUploadingBankIdx] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadBankIdxRef = useRef<number | null>(null);

  const [banks, setBanks] = useState<BankData[]>(
    initialData?.comparison_data ?? []
  );
  const [insurance, setInsurance] = useState<InsuranceData>(
    initialData?.insurance_data ?? {}
  );
  const [oneTimeCharges, setOneTimeCharges] = useState<ChargeRow[]>(
    initialData?.one_time_charges ?? DEFAULT_ONE_TIME_CHARGES.map((label) => ({ label }))
  );
  const [monthlyCharges, setMonthlyCharges] = useState<ChargeRow[]>(
    initialData?.monthly_charges ?? [{ label: 'Manutenção de Conta' }]
  );

  const backUrl = `/dashboard/clients/${clientId}?tab=propostas`;

  function addBank() {
    setBanks([...banks, {
      name: `Banco ${banks.length + 1}`,
      montante: defaultLoanAmount?.toString() ?? '',
      prazo: defaultTermMonths?.toString() ?? '',
      tipo_taxa: 'Variável',
      euribor: '3 meses',
    }]);
  }

  function removeBank(idx: number) {
    const removed = banks[idx];
    setBanks(banks.filter((_, i) => i !== idx));
    const newIns = { ...insurance };
    delete newIns[removed.name];
    setInsurance(newIns);
    const cleanCharges = (rows: ChargeRow[]) =>
      rows.map((r) => { const n = { ...r }; delete n[removed.name]; return n; });
    setOneTimeCharges(cleanCharges(oneTimeCharges));
    setMonthlyCharges(cleanCharges(monthlyCharges));
  }

  function updateBank(idx: number, field: keyof BankData, value: string | boolean) {
    const updated = [...banks];
    const oldName = updated[idx].name;
    updated[idx] = { ...updated[idx], [field]: value };

    if (field === 'name' && typeof value === 'string') {
      const newIns = { ...insurance };
      if (newIns[oldName]) { newIns[value] = newIns[oldName]; delete newIns[oldName]; }
      const swapKey = (rows: ChargeRow[]) =>
        rows.map((r) => {
          const n = { ...r };
          if (oldName in n) { n[value] = n[oldName]; delete n[oldName]; }
          return n;
        });
      setOneTimeCharges(swapKey(oneTimeCharges));
      setMonthlyCharges(swapKey(monthlyCharges));
      setInsurance(newIns);
    }

    // Toggle recommended: only one bank can be recommended
    if (field === 'recommended' && value === true) {
      updated.forEach((b, i) => { if (i !== idx) { b.recommended = false; b.highlight = false; } });
    }

    setBanks(updated);
  }

  function setRecommended(idx: number) {
    const updated = banks.map((b, i) => ({ ...b, recommended: i === idx, highlight: i === idx }));
    setBanks(updated);
  }

  function clearRecommended(idx: number) {
    const updated = [...banks];
    updated[idx] = { ...updated[idx], recommended: false, highlight: false };
    setBanks(updated);
  }

  function updateInsurance(bankName: string, field: keyof InsuranceData[string], value: string) {
    setInsurance((prev) => ({
      ...prev,
      [bankName]: { ...{ vida: '', multirriscos: '', vida_ext: '', multirriscos_ext: '' }, ...prev[bankName], [field]: value },
    }));
  }

  function updateCharge(charges: ChargeRow[], setCharges: (r: ChargeRow[]) => void, rowIdx: number, bankName: string, value: string) {
    const updated = [...charges];
    updated[rowIdx] = { ...updated[rowIdx], [bankName]: value };
    setCharges(updated);
  }

  function getIns(bankName: string, field: keyof InsuranceData[string]): string {
    return insurance[bankName]?.[field] ?? '';
  }

  function calcSubtotalBank(bankName: string): string {
    const ins = insurance[bankName];
    const bank = banks.find((b) => b.name === bankName);
    const p = parseFloat(bank?.prestacao ?? '0') || 0;
    const v = parseFloat(ins?.vida ?? '0') || 0;
    const m = parseFloat(ins?.multirriscos ?? '0') || 0;
    const total = p + v + m;
    return total > 0 ? total.toFixed(2) : '';
  }

  function calcSubtotalExt(bankName: string): string {
    const ins = insurance[bankName];
    const bank = banks.find((b) => b.name === bankName);
    const p = parseFloat(bank?.prestacao ?? '0') || 0;
    const v = parseFloat(ins?.vida_ext ?? '0') || 0;
    const m = parseFloat(ins?.multirriscos_ext ?? '0') || 0;
    const total = p + v + m;
    return total > 0 ? total.toFixed(2) : '';
  }

  function calcTotalOneTime(bankName: string): string {
    const total = oneTimeCharges.reduce((sum, row) => sum + (parseFloat(row[bankName] as string) || 0), 0);
    return total > 0 ? total.toFixed(2) : '';
  }

  function buildPayload() {
    return {
      title,
      comparison_data: banks,
      insurance_data: insurance,
      one_time_charges: oneTimeCharges,
      monthly_charges: monthlyCharges,
      notes,
      is_visible_to_client: isVisible,
    };
  }

  async function save(andRedirect = false): Promise<string | null> {
    setSaving(true);
    try {
      let res: Response;
      let savedId: string | null = propostaId ?? null;
      if (propostaId) {
        res = await fetch(`/api/clients/${clientId}/propostas/${propostaId}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildPayload()),
        });
      } else {
        res = await fetch(`/api/clients/${clientId}/propostas`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildPayload()),
        });
        if (res.ok) { const j = await res.json(); savedId = j.id; }
      }
      if (res.ok) {
        toast.success('Proposta guardada');
        if (andRedirect) {
          router.push(backUrl);
        } else if (!propostaId && savedId) {
          router.replace(`/dashboard/clients/${clientId}/propostas/${savedId}`);
        }
        return savedId;
      } else {
        toast.error('Erro ao guardar proposta');
        return null;
      }
    } finally {
      setSaving(false);
    }
  }

  function triggerBankPdfUpload(idx: number) {
    uploadBankIdxRef.current = idx;
    if (fileInputRef.current) { fileInputRef.current.value = ''; fileInputRef.current.click(); }
  }

  async function handleBankPdfSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const idx = uploadBankIdxRef.current;
    if (!file || idx === null) return;
    uploadBankIdxRef.current = null;

    // Must have propostaId to upload
    let pid = propostaId;
    if (!pid) {
      const saved = await save(false);
      if (!saved) return;
      pid = saved;
    }

    setUploadingBankIdx(idx);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bank_name', banks[idx].name);
      const res = await fetch(`/api/clients/${clientId}/propostas/${pid}/upload-doc`, {
        method: 'POST', body: formData,
      });
      if (res.ok) {
        const { path } = await res.json() as { path: string };
        const updated = [...banks];
        updated[idx] = { ...updated[idx], doc_path: path };
        setBanks(updated);
        toast.success('PDF carregado');
      } else {
        toast.error('Erro ao carregar PDF');
      }
    } finally {
      setUploadingBankIdx(null);
    }
  }

  const inputCls = 'h-8 text-sm px-2 border border-input rounded-md w-full bg-white';
  const selectCls = `${inputCls} cursor-pointer`;
  const readonlyCls = 'h-8 text-sm px-2 w-full font-semibold text-slate-700 bg-transparent text-center';

  // Show periodo_fixo row if any bank has Fixa or Mista
  const showPeriodoFixo = banks.some((b) => b.tipo_taxa === 'Fixa' || b.tipo_taxa === 'Mista');
  // Show euribor row if any bank is NOT Fixa
  const showEuribor = banks.some((b) => b.tipo_taxa !== 'Fixa');

  const COL_W = 'min-w-[148px]';

  function SectionHeader({ children }: { children: React.ReactNode }) {
    return (
      <tr>
        <td colSpan={banks.length + 1} className="pt-5 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
          {children}
        </td>
      </tr>
    );
  }

  function InputRow({ label, field, type = 'text', readOnly = false }: {
    label: string;
    field: string;
    type?: 'text' | 'number' | 'currency' | 'percent';
    readOnly?: boolean;
  }) {
    return (
      <tr className="hover:bg-slate-50/50">
        <td className="py-2 pr-4 text-xs text-slate-500 whitespace-nowrap w-52">{label}</td>
        {banks.map((bank, idx) => {
          const isRec = bank.recommended || bank.highlight;
          if (readOnly) {
            let val = '';
            if (field === 'subtotal_banco') val = calcSubtotalBank(bank.name);
            else if (field === 'subtotal_ext') val = calcSubtotalExt(bank.name);
            else if (field === 'total_one_time') val = calcTotalOneTime(bank.name);
            return (
              <td key={idx} className={cn('py-2 px-2', isRec && 'bg-blue-50/50')}>
                <div className={readonlyCls}>{val ? `€ ${val}` : '—'}</div>
              </td>
            );
          }
          return (
            <td key={idx} className={cn('py-2 px-2', isRec && 'bg-blue-50/50')}>
              <input
                className={inputCls}
                value={(bank[field as keyof BankData] as string) ?? ''}
                onChange={(e) => updateBank(idx, field as keyof BankData, e.target.value)}
                placeholder={type === 'currency' ? '€' : type === 'percent' ? '%' : ''}
              />
            </td>
          );
        })}
      </tr>
    );
  }

  function SelectRow({ label, field, options, hidden = false }: {
    label: string; field: keyof BankData; options: string[]; hidden?: boolean;
  }) {
    if (hidden) return null;
    return (
      <tr className="hover:bg-slate-50/50">
        <td className="py-2 pr-4 text-xs text-slate-500 whitespace-nowrap w-52">{label}</td>
        {banks.map((bank, idx) => {
          const isRec = bank.recommended || bank.highlight;
          const shouldHide = field === 'euribor' && bank.tipo_taxa === 'Fixa';
          return (
            <td key={idx} className={cn('py-2 px-2', isRec && 'bg-blue-50/50')}>
              {shouldHide ? (
                <div className={readonlyCls + ' text-slate-300'}>—</div>
              ) : (
                <select
                  className={selectCls}
                  value={(bank[field] as string) ?? ''}
                  onChange={(e) => updateBank(idx, field, e.target.value)}
                >
                  <option value="">—</option>
                  {options.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              )}
            </td>
          );
        })}
      </tr>
    );
  }

  function InsRow({ label, field }: { label: string; field: keyof InsuranceData[string] }) {
    return (
      <tr className="hover:bg-slate-50/50">
        <td className="py-2 pr-4 text-xs text-slate-500 whitespace-nowrap w-52">{label}</td>
        {banks.map((bank, idx) => {
          const isRec = bank.recommended || bank.highlight;
          return (
            <td key={idx} className={cn('py-2 px-2', isRec && 'bg-blue-50/50')}>
              <input
                className={inputCls}
                value={getIns(bank.name, field)}
                onChange={(e) => updateInsurance(bank.name, field, e.target.value)}
                placeholder="€"
              />
            </td>
          );
        })}
      </tr>
    );
  }

  function SubtotalRow({ label, field }: { label: string; field: 'subtotal_banco' | 'subtotal_ext' | 'total_one_time' }) {
    return (
      <tr className="bg-slate-50">
        <td className="py-2 pr-4 text-xs font-semibold text-slate-600 whitespace-nowrap w-52">{label}</td>
        {banks.map((bank, idx) => {
          const isRec = bank.recommended || bank.highlight;
          let val = '';
          if (field === 'subtotal_banco') val = calcSubtotalBank(bank.name);
          else if (field === 'subtotal_ext') val = calcSubtotalExt(bank.name);
          else val = calcTotalOneTime(bank.name);
          return (
            <td key={idx} className={cn('py-2 px-2 text-center', isRec && 'bg-blue-50')}>
              <span className="text-sm font-semibold text-slate-700">{val ? `€ ${val}` : '—'}</span>
            </td>
          );
        })}
      </tr>
    );
  }

  return (
    <div className="space-y-6 pb-32">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push(backUrl)}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Voltar
          </button>
          <div>
            <h2 className="text-xl font-semibold">
              {propostaId ? t('editProposta') : t('addProposta')}
            </h2>
            <p className="text-sm text-muted-foreground">{clientName}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {isVisible ? <Eye className="h-4 w-4 text-slate-500" /> : <EyeOff className="h-4 w-4 text-slate-400" />}
            <Switch checked={isVisible} onCheckedChange={setIsVisible} />
            <span className="text-sm text-slate-500">{isVisible ? 'Visível ao cliente' : 'Oculto'}</span>
          </div>
        </div>
      </div>

      {/* Title + Notes */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div className="space-y-1.5">
          <Label>Título *</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Proposta Comparativa — Março 2025" />
        </div>
        <div className="space-y-1.5">
          <Label>Notas (visíveis ao cliente)</Label>
          <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Informações adicionais para o cliente..." />
        </div>
      </div>

      {/* Bank comparison table */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-800">Bancos</h3>
          <Button size="sm" variant="outline" onClick={addBank}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Adicionar banco
          </Button>
        </div>

        {banks.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">
            Adicione pelo menos um banco para começar.
          </div>
        ) : (
          <div className="overflow-x-auto p-5">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="text-left py-2 pr-4 text-xs font-semibold text-slate-400 uppercase tracking-wide w-52">Campo</th>
                  {banks.map((bank, idx) => {
                    const isRec = bank.recommended || bank.highlight;
                    return (
                      <th key={idx} className={cn('py-2 px-2', COL_W, isRec && 'bg-blue-50/50 rounded-t-lg')}>
                        <div className="flex items-center gap-1">
                          <input
                            className={cn(inputCls, isRec && 'border-blue-300 bg-blue-50 font-semibold')}
                            value={bank.name}
                            onChange={(e) => updateBank(idx, 'name', e.target.value)}
                            placeholder="Nome do banco"
                          />
                          <button
                            onClick={() => isRec ? clearRecommended(idx) : setRecommended(idx)}
                            className={cn('p-1 rounded shrink-0', isRec ? 'text-amber-500' : 'text-slate-300 hover:text-amber-400')}
                            title={isRec ? 'Remover destaque' : 'Marcar como recomendado'}
                          >
                            <Star className="h-4 w-4" fill={isRec ? 'currentColor' : 'none'} />
                          </button>
                          {propostaId && (
                            <button
                              onClick={() => triggerBankPdfUpload(idx)}
                              disabled={uploadingBankIdx === idx}
                              className="p-1 rounded text-slate-300 hover:text-blue-500 shrink-0"
                              title="Carregar PDF do banco"
                            >
                              {uploadingBankIdx === idx
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                : <Upload className="h-3.5 w-3.5" />
                              }
                            </button>
                          )}
                          <button onClick={() => removeBank(idx)} className="p-1 rounded text-slate-300 hover:text-red-500 shrink-0">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        {bank.doc_path && (
                          <p className="text-[10px] text-blue-500 mt-0.5 truncate">PDF carregado ✓</p>
                        )}
                        {isRec && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 bg-blue-100 rounded-full px-2 py-0.5 mt-1">
                            ★ Recomendado
                          </span>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <SectionHeader>Dados do Empréstimo</SectionHeader>
                <InputRow label="Montante Financiamento (€)" field="montante" type="currency" />
                <InputRow label="Prazo (meses)" field="prazo" type="number" />
                <SelectRow label="Tipo de Taxa" field="tipo_taxa" options={TIPO_TAXA_OPTIONS} />
                {showPeriodoFixo && <InputRow label="Período fixo (anos)" field="periodo_fixo" type="number" />}
                {showEuribor && <SelectRow label="Euribor" field="euribor" options={EURIBOR_OPTIONS} />}
                <InputRow label="Spread (%)" field="spread" type="percent" />
                <InputRow label="TAN (%)" field="tan" type="percent" />
                <InputRow label="Prestação Mensal (€)" field="prestacao" type="currency" />

                <SectionHeader>Seguros do Banco</SectionHeader>
                <InsRow label="Seguro Vida — Morte + IAD (€/mês)" field="vida" />
                <InsRow label="Seguro Multirriscos (€/mês)" field="multirriscos" />
                <SubtotalRow label="Subtotal c/ seguros banco" field="subtotal_banco" />

                <SectionHeader>Seguros Externos</SectionHeader>
                <InsRow label="Seguro Vida — Morte + IAD + ITP (€/mês)" field="vida_ext" />
                <InsRow label="Seguro Multirriscos (€/mês)" field="multirriscos_ext" />
                <SubtotalRow label="Subtotal c/ seguros externos" field="subtotal_ext" />

                <SectionHeader>Encargos Únicos</SectionHeader>
                {oneTimeCharges.map((row, rowIdx) => (
                  <tr key={rowIdx} className="hover:bg-slate-50/50">
                    <td className="py-2 pr-4 text-xs text-slate-500 whitespace-nowrap w-52">{row.label}</td>
                    {banks.map((bank, idx) => {
                      const isRec = bank.recommended || bank.highlight;
                      return (
                        <td key={idx} className={cn('py-2 px-2', isRec && 'bg-blue-50/50')}>
                          <input
                            className={inputCls}
                            value={(row[bank.name] as string) ?? ''}
                            onChange={(e) => updateCharge(oneTimeCharges, setOneTimeCharges, rowIdx, bank.name, e.target.value)}
                            placeholder="€"
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <SubtotalRow label="Total Encargos Únicos" field="total_one_time" />

                <SectionHeader>Encargos Mensais</SectionHeader>
                {monthlyCharges.map((row, rowIdx) => (
                  <tr key={rowIdx} className="hover:bg-slate-50/50">
                    <td className="py-2 pr-4 text-xs text-slate-500 whitespace-nowrap w-52">{row.label}</td>
                    {banks.map((bank, idx) => {
                      const isRec = bank.recommended || bank.highlight;
                      return (
                        <td key={idx} className={cn('py-2 px-2', isRec && 'bg-blue-50/50')}>
                          <input
                            className={inputCls}
                            value={(row[bank.name] as string) ?? ''}
                            onChange={(e) => updateCharge(monthlyCharges, setMonthlyCharges, rowIdx, bank.name, e.target.value)}
                            placeholder="€/mês"
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Sticky save bar */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-slate-200 px-6 py-3 flex items-center justify-between gap-4">
        <button
          onClick={() => router.push(backUrl)}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Voltar sem guardar
        </button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => save(false)} disabled={saving || !title.trim()}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
            Guardar
          </Button>
          <Button onClick={() => save(true)} disabled={saving || !title.trim()}>
            <Save className="h-4 w-4 mr-1.5" />
            Guardar e Sair
          </Button>
        </div>
      </div>

      {/* Hidden file input for bank PDF upload */}
      <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleBankPdfSelected} />
    </div>
  );
}
