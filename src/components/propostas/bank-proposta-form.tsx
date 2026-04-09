'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Upload, FileText, X, Loader2 } from 'lucide-react';
import type { BankProposta } from '@/types/proposta';
import {
  ONE_TIME_CHARGE_FIELDS,
  BANK_SUGGESTIONS,
  calcTotalRecomendado,
  getRecomendadaLabel,
  fmtEur,
} from '@/types/proposta';

const SPREAD_CONDITION_OPTIONS = [
  'Domiciliação de ordenado',
  'Cartão de crédito ativo',
  'Débito direto',
  'Seguro de vida banco',
  'Seguro multirriscos banco',
  'PPR banco',
  'Fundo de investimento',
  'Conta poupança',
  'Produto de capitalização',
];

function CondicoesSpreadInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [custom, setCustom] = useState('');

  function toggle(opt: string) {
    onChange(value.includes(opt) ? value.filter((x) => x !== opt) : [...value, opt]);
  }

  function addCustom() {
    const trimmed = custom.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setCustom('');
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {SPREAD_CONDITION_OPTIONS.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
              value.includes(opt)
                ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]'
                : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
      {value.filter((v) => !SPREAD_CONDITION_OPTIONS.includes(v)).map((c) => (
        <span key={c} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-[#1E3A5F] text-white rounded-full">
          {c}
          <button type="button" onClick={() => onChange(value.filter((x) => x !== c))} className="hover:text-gray-300">
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <div className="flex gap-2 mt-1">
        <Input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
          placeholder="Outra condição…"
          className="h-8 text-sm"
        />
        <Button type="button" variant="outline" size="sm" onClick={addCustom} disabled={!custom.trim()}>
          Adicionar
        </Button>
      </div>
    </div>
  );
}

function RecomendadaToggle({
  value,
  onChange,
  disableExterna,
}: {
  value: 'banco' | 'externa';
  onChange: (v: 'banco' | 'externa') => void;
  disableExterna: boolean;
}) {
  const effectiveValue = disableExterna ? 'banco' : value;
  return (
    <div className="flex gap-1 justify-center">
      {(['banco', 'externa'] as const).map((opt) => {
        const disabled = opt === 'externa' && disableExterna;
        const active = effectiveValue === opt;
        return (
          <button
            key={opt}
            type="button"
            disabled={disabled}
            onClick={() => { if (!disabled) onChange(opt); }}
            className={`px-2.5 py-1 text-[11px] rounded-full border transition-colors ${
              active
                ? 'bg-blue-600 text-white border-blue-600'
                : disabled
                ? 'bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed'
                : 'bg-white text-gray-500 border-gray-300 hover:border-gray-400'
            }`}
          >
            {opt === 'banco' ? 'Banco' : 'Ext.'}
          </button>
        );
      })}
    </div>
  );
}

type FormData = Omit<BankProposta, 'id' | 'client_id' | 'broker_id' | 'office_id' | 'created_at' | 'updated_at'>;

function emptyForm(): FormData {
  return {
    bank_name: '',
    rate_type: 'variavel',
    fixed_period_years: null,
    loan_amount: null,
    term_months: null,
    euribor_index: '6m',
    spread: null,
    tan: null,
    taeg: null,
    monthly_payment: null,
    vida_p1_banco: null,
    vida_p1_externa: null,
    vida_p2_banco: null,
    vida_p2_externa: null,
    multiriscos_banco: null,
    multiriscos_externa: null,
    vida_p1_recomendada: 'externa',
    vida_p2_recomendada: 'externa',
    multiriscos_recomendada: 'banco',
    comissao_avaliacao: null,
    comissao_estudo: null,
    abertura_processo: null,
    comissao_formalizacao: null,
    comissao_solicitadoria: null,
    doc_particular_autenticado: null,
    copia_certificada: null,
    imposto_selo_mutuo: null,
    imposto_selo_aquisicao: null,
    imt: null,
    deposito_dpa: null,
    comissao_tramitacao: null,
    cheque_bancario: null,
    registo: null,
    escritura: null,
    manutencao_conta: null,
    manutencao_anual: false,
    outras_comissoes_mensais: null,
    validade_ate: null,
    valor_residual: null,
    condicoes_spread: null,
    bank_pdf_path: null,
    notes: null,
  };
}

interface BankPropostaFormProps {
  clientId: string;
  backUrl: string;
  initialData?: BankProposta;
  p2Name?: string | null;
}

type RateType = 'variavel' | 'fixa' | 'mista';
type EuriborIndex = '3m' | '6m' | '12m' | 'na';

const RATE_TYPES: { value: RateType; label: string }[] = [
  { value: 'variavel', label: 'Variável' },
  { value: 'fixa', label: 'Fixa' },
  { value: 'mista', label: 'Mista' },
];

const EURIBOR_OPTIONS: { value: EuriborIndex; label: string }[] = [
  { value: '3m', label: '3M' },
  { value: '6m', label: '6M' },
  { value: '12m', label: '12M' },
  { value: 'na', label: 'N/A' },
];

function numField(v: number | null): string {
  return v === null ? '' : String(v);
}

function parseNum(v: string): number | null {
  if (!v.trim()) return null;
  const n = parseFloat(v.replace(',', '.'));
  return isNaN(n) ? null : n;
}

export function BankPropostaForm({ clientId, backUrl, initialData, p2Name }: BankPropostaFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormData>(initialData ? {
    bank_name: initialData.bank_name,
    rate_type: initialData.rate_type,
    fixed_period_years: initialData.fixed_period_years,
    loan_amount: initialData.loan_amount,
    term_months: initialData.term_months,
    euribor_index: initialData.euribor_index,
    spread: initialData.spread,
    tan: initialData.tan,
    taeg: initialData.taeg,
    monthly_payment: initialData.monthly_payment,
    vida_p1_banco: initialData.vida_p1_banco,
    vida_p1_externa: initialData.vida_p1_externa,
    vida_p2_banco: initialData.vida_p2_banco,
    vida_p2_externa: initialData.vida_p2_externa,
    multiriscos_banco: initialData.multiriscos_banco,
    multiriscos_externa: initialData.multiriscos_externa,
    vida_p1_recomendada: initialData.vida_p1_recomendada ?? 'externa',
    vida_p2_recomendada: initialData.vida_p2_recomendada ?? 'externa',
    multiriscos_recomendada: initialData.multiriscos_recomendada ?? 'banco',
    comissao_avaliacao: initialData.comissao_avaliacao,
    comissao_estudo: initialData.comissao_estudo,
    abertura_processo: initialData.abertura_processo,
    comissao_formalizacao: initialData.comissao_formalizacao,
    comissao_solicitadoria: initialData.comissao_solicitadoria,
    doc_particular_autenticado: initialData.doc_particular_autenticado,
    copia_certificada: initialData.copia_certificada,
    imposto_selo_mutuo: initialData.imposto_selo_mutuo,
    imposto_selo_aquisicao: initialData.imposto_selo_aquisicao,
    imt: initialData.imt,
    deposito_dpa: initialData.deposito_dpa,
    comissao_tramitacao: initialData.comissao_tramitacao,
    cheque_bancario: initialData.cheque_bancario,
    registo: initialData.registo,
    escritura: initialData.escritura,
    manutencao_conta: initialData.manutencao_conta,
    manutencao_anual: initialData.manutencao_anual,
    outras_comissoes_mensais: initialData.outras_comissoes_mensais,
    validade_ate: initialData.validade_ate,
    valor_residual: initialData.valor_residual,
    condicoes_spread: initialData.condicoes_spread,
    bank_pdf_path: initialData.bank_pdf_path,
    notes: initialData.notes,
  } : emptyForm());

  const [saving, setSaving] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [pendingPdf, setPendingPdf] = useState<File | null>(null);
  const [showBankSuggestions, setShowBankSuggestions] = useState(false);

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const hasP2 = Boolean(p2Name);
  const asBP = { ...form } as unknown as BankProposta;
  const totalRecomendado = calcTotalRecomendado(asBP, hasP2);
  const recomendadaLabel = getRecomendadaLabel(asBP, hasP2);

  const displayedPdfName = form.bank_pdf_path
    ? form.bank_pdf_path.split('/').pop() ?? 'bank_proposal.pdf'
    : pendingPdf?.name ?? null;

  async function uploadPdf(propostaId: string, file: File): Promise<void> {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`/api/clients/${clientId}/bank-propostas/${propostaId}/upload-pdf`, {
      method: 'POST',
      body: fd,
    });
    if (!res.ok) {
      const err = await res.json() as { error?: string };
      throw new Error(err.error ?? 'Erro ao enviar PDF');
    }
    const json = await res.json() as { path: string };
    set('bank_pdf_path', json.path);
  }

  async function handleSave() {
    if (!form.bank_name.trim()) {
      toast.error('Introduza o nome do banco');
      return;
    }
    setSaving(true);
    try {
      const url = initialData
        ? `/api/clients/${clientId}/bank-propostas/${initialData.id}`
        : `/api/clients/${clientId}/bank-propostas`;
      const method = initialData ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json() as { error?: string };
        throw new Error(err.error ?? 'Erro ao guardar');
      }

      const saved = await res.json() as { id?: string };
      const propostaId = initialData?.id ?? saved.id;

      if (pendingPdf && propostaId) {
        setUploadingPdf(true);
        try {
          await uploadPdf(propostaId, pendingPdf);
          setPendingPdf(null);
        } catch (uploadErr) {
          toast.warning(uploadErr instanceof Error ? uploadErr.message : 'Proposta guardada, mas falhou o envio do PDF');
          setSaving(false);
          setUploadingPdf(false);
          return;
        } finally {
          setUploadingPdf(false);
        }
      }

      toast.success('Proposta guardada');
      router.push(backUrl);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao guardar');
    } finally {
      setSaving(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    if (initialData) {
      setUploadingPdf(true);
      uploadPdf(initialData.id, file)
        .then(() => toast.success('PDF enviado'))
        .catch((err: unknown) => toast.error(err instanceof Error ? err.message : 'Erro ao enviar PDF'))
        .finally(() => setUploadingPdf(false));
    } else {
      setPendingPdf(file);
    }
  }

  function handleRemovePdf() {
    setPendingPdf(null);
    set('bank_pdf_path', null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const filteredSuggestions = BANK_SUGGESTIONS.filter((b) =>
    b.toLowerCase().includes(form.bank_name.toLowerCase()) && b !== form.bank_name
  );

  const isBusy = saving || uploadingPdf;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-white flex-shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push(backUrl)}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
          <h1 className="text-lg font-semibold text-gray-900">
            {initialData ? `Editar — ${initialData.bank_name}` : 'Nova proposta bancária'}
          </h1>
        </div>
        <Button onClick={handleSave} disabled={isBusy} size="sm">
          {isBusy ? (
            <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />{uploadingPdf ? 'A enviar PDF…' : 'A guardar…'}</>
          ) : 'Guardar'}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Card 1: Bank, loan info & PDF */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Banco & Empréstimo</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {/* Bank name with autocomplete */}
            <div className="relative col-span-2 md:col-span-1">
              <Label>Banco *</Label>
              <Input
                value={form.bank_name}
                onChange={(e) => {
                  set('bank_name', e.target.value);
                  setShowBankSuggestions(true);
                }}
                onBlur={() => setTimeout(() => setShowBankSuggestions(false), 150)}
                onFocus={() => setShowBankSuggestions(true)}
                placeholder="Ex: CGD, BPI…"
              />
              {showBankSuggestions && filteredSuggestions.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg">
                  {filteredSuggestions.map((b) => (
                    <button
                      key={b}
                      className="w-full px-3 py-2 text-sm text-left hover:bg-gray-50"
                      onMouseDown={() => { set('bank_name', b); setShowBankSuggestions(false); }}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label>Montante (€)</Label>
              <Input
                type="number"
                value={numField(form.loan_amount)}
                onChange={(e) => set('loan_amount', parseNum(e.target.value))}
                placeholder="150000"
              />
            </div>

            <div>
              <Label>Prazo (meses)</Label>
              <Input
                type="number"
                value={numField(form.term_months)}
                onChange={(e) => set('term_months', parseNum(e.target.value))}
                placeholder="360"
              />
            </div>

            {/* Rate type pills */}
            <div>
              <Label>Tipo de taxa</Label>
              <div className="flex gap-1 mt-1.5">
                {RATE_TYPES.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => set('rate_type', value)}
                    className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                      form.rate_type === value
                        ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Euribor index pills */}
            <div>
              <Label>Euribor</Label>
              <div className="flex gap-1 mt-1.5 flex-wrap">
                {EURIBOR_OPTIONS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => set('euribor_index', value)}
                    className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                      form.euribor_index === value
                        ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {form.rate_type === 'mista' && (
              <div>
                <Label>Período fixo (anos)</Label>
                <Input
                  type="number"
                  value={numField(form.fixed_period_years)}
                  onChange={(e) => set('fixed_period_years', parseNum(e.target.value))}
                  placeholder="5"
                />
              </div>
            )}
          </div>

          <div>
            <Label>Validade da proposta</Label>
            <Input
              type="date"
              value={form.validade_ate ?? ''}
              onChange={(e) => set('validade_ate', e.target.value || null)}
            />
          </div>

          <div>
            <Label>Capital residual (€)</Label>
            <Input
              type="number"
              step="0.01"
              value={numField(form.valor_residual)}
              onChange={(e) => set('valor_residual', parseNum(e.target.value))}
              placeholder="0"
            />
          </div>

          {/* PDF upload */}
          <div className="pt-2 border-t border-gray-100">
            <Label className="mb-1.5 block">Documento do banco (PDF)</Label>
            {displayedPdfName ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg w-fit max-w-full">
                <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                <span className="text-sm text-gray-700 truncate max-w-[260px]">{displayedPdfName}</span>
                {uploadingPdf ? (
                  <Loader2 className="h-4 w-4 animate-spin text-gray-400 shrink-0" />
                ) : (
                  <button
                    type="button"
                    onClick={handleRemovePdf}
                    className="shrink-0 text-gray-400 hover:text-red-500 transition-colors"
                    aria-label="Remover PDF"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ) : (
              <label className="cursor-pointer">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <div className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-white border border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-colors cursor-pointer">
                  <Upload className="h-4 w-4 text-gray-400" />
                  Carregar PDF
                </div>
              </label>
            )}
            {!initialData && pendingPdf && (
              <p className="mt-1 text-xs text-gray-400">O PDF será enviado quando guardar a proposta.</p>
            )}
          </div>
        </div>

        {/* Card 2: Rates */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Taxas</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div>
              <Label>Spread (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={numField(form.spread)}
                onChange={(e) => set('spread', parseNum(e.target.value))}
                placeholder="0.70"
              />
            </div>
            <div>
              <Label>TAN (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={numField(form.tan)}
                onChange={(e) => set('tan', parseNum(e.target.value))}
                placeholder="4.15"
              />
            </div>
            <div>
              <Label>TAEG (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={numField(form.taeg)}
                onChange={(e) => set('taeg', parseNum(e.target.value))}
                placeholder="4.32"
              />
            </div>
            <div>
              <Label>Prestação mensal (€)</Label>
              <Input
                type="number"
                step="0.01"
                value={numField(form.monthly_payment)}
                onChange={(e) => set('monthly_payment', parseNum(e.target.value))}
                placeholder="750.00"
              />
            </div>
          </div>
        </div>

        {/* Card 3: Insurance */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Seguros</h2>
            <p className="text-xs text-gray-400 mt-0.5">Preencha os valores mensais disponíveis. Deixe em branco se a opção não estiver disponível.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th className="text-left text-xs font-semibold text-gray-500 pb-2 pr-4 min-w-[160px]">Seguro</th>
                  <th className="text-center text-xs font-semibold text-gray-500 pb-2 px-2 min-w-[110px]">Banco (€/mês)</th>
                  <th className="text-center text-xs font-semibold text-gray-500 pb-2 px-2 min-w-[110px]">Externa (€/mês)</th>
                  <th className="text-center text-xs font-semibold text-gray-500 pb-2 px-2 min-w-[130px]">Recomendada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {/* Vida P1 */}
                <tr>
                  <td className="pr-4 py-2 text-xs text-gray-700 font-medium">Seguro Vida — P1</td>
                  <td className="px-2 py-2">
                    <Input type="number" step="0.01" value={numField(form.vida_p1_banco)}
                      onChange={(e) => set('vida_p1_banco', parseNum(e.target.value))}
                      className="h-8 text-xs text-center" placeholder="0.00" />
                  </td>
                  <td className="px-2 py-2">
                    <Input type="number" step="0.01" value={numField(form.vida_p1_externa)}
                      onChange={(e) => set('vida_p1_externa', parseNum(e.target.value))}
                      className="h-8 text-xs text-center" placeholder="0.00" />
                  </td>
                  <td className="px-2 py-2">
                    <RecomendadaToggle
                      value={form.vida_p1_recomendada ?? 'externa'}
                      onChange={(v) => set('vida_p1_recomendada', v)}
                      disableExterna={!form.vida_p1_externa}
                    />
                  </td>
                </tr>

                {/* Vida P2 — only if client has p2 */}
                {hasP2 && (
                  <tr>
                    <td className="pr-4 py-2 text-xs text-gray-700 font-medium">Seguro Vida — P2</td>
                    <td className="px-2 py-2">
                      <Input type="number" step="0.01" value={numField(form.vida_p2_banco)}
                        onChange={(e) => set('vida_p2_banco', parseNum(e.target.value))}
                        className="h-8 text-xs text-center" placeholder="0.00" />
                    </td>
                    <td className="px-2 py-2">
                      <Input type="number" step="0.01" value={numField(form.vida_p2_externa)}
                        onChange={(e) => set('vida_p2_externa', parseNum(e.target.value))}
                        className="h-8 text-xs text-center" placeholder="0.00" />
                    </td>
                    <td className="px-2 py-2">
                      <RecomendadaToggle
                        value={form.vida_p2_recomendada ?? 'externa'}
                        onChange={(v) => set('vida_p2_recomendada', v)}
                        disableExterna={!form.vida_p2_externa}
                      />
                    </td>
                  </tr>
                )}

                {/* Multirriscos */}
                <tr>
                  <td className="pr-4 py-2 text-xs text-gray-700 font-medium">Seguro Multirriscos</td>
                  <td className="px-2 py-2">
                    <Input type="number" step="0.01" value={numField(form.multiriscos_banco)}
                      onChange={(e) => set('multiriscos_banco', parseNum(e.target.value))}
                      className="h-8 text-xs text-center" placeholder="0.00" />
                  </td>
                  <td className="px-2 py-2">
                    <Input type="number" step="0.01" value={numField(form.multiriscos_externa)}
                      onChange={(e) => set('multiriscos_externa', parseNum(e.target.value))}
                      className="h-8 text-xs text-center" placeholder="0.00" />
                  </td>
                  <td className="px-2 py-2">
                    <RecomendadaToggle
                      value={form.multiriscos_recomendada ?? 'banco'}
                      onChange={(v) => set('multiriscos_recomendada', v)}
                      disableExterna={!form.multiriscos_externa}
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {totalRecomendado > 0 && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
              <p className="text-sm font-bold text-blue-900">
                Prestação Total Recomendada: {fmtEur(totalRecomendado)}/mês
              </p>
              {recomendadaLabel && (
                <p className="text-xs text-blue-600 mt-0.5">{recomendadaLabel}</p>
              )}
            </div>
          )}
        </div>

        {/* Card 4: One-time charges */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Encargos Únicos</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {ONE_TIME_CHARGE_FIELDS.map(({ key, label }) => (
              <div key={key}>
                <Label className="text-xs leading-tight">{label}</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={numField((form as unknown as Record<string, number | null>)[key as string])}
                  onChange={(e) => set(key as keyof FormData, parseNum(e.target.value) as never)}
                  placeholder="0"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Card 5: Monthly account fee */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Encargos Mensais</h2>
          <div className="grid grid-cols-2 gap-4 items-end md:grid-cols-3">
            <div>
              <Label>Manutenção de conta (€/mês)</Label>
              <Input
                type="number"
                step="0.01"
                value={numField(form.manutencao_conta)}
                onChange={(e) => set('manutencao_conta', parseNum(e.target.value))}
                placeholder="4.50"
              />
            </div>
            <div>
              <Label>Outras comissões mensais (€)</Label>
              <Input
                type="number"
                step="0.01"
                value={numField(form.outras_comissoes_mensais)}
                onChange={(e) => set('outras_comissoes_mensais', parseNum(e.target.value))}
                placeholder="0"
              />
            </div>
            <div className="flex items-center gap-2 pb-1">
              <Switch
                checked={form.manutencao_anual}
                onCheckedChange={(v) => set('manutencao_anual', v)}
              />
              <Label>Faturação anual</Label>
            </div>
          </div>
          {/* Spread conditions tags */}
          <div>
            <Label className="mb-2 block">Condições para o spread</Label>
            <CondicoesSpreadInput
              value={form.condicoes_spread ?? []}
              onChange={(tags) => set('condicoes_spread', tags.length ? tags : null)}
            />
          </div>
        </div>

        {/* Card 6: Notes */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Notas</h2>
          <div>
            <Label>Notas internas</Label>
            <Textarea
              value={form.notes ?? ''}
              onChange={(e) => set('notes', e.target.value || null)}
              placeholder="Condições especiais, observações…"
              rows={3}
            />
          </div>
        </div>

        {/* Bottom save bar */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between gap-3">
          <p className="text-xs text-gray-400">
            {form.bank_name.trim() ? `A guardar como: ${form.bank_name}` : 'Introduza o nome do banco para guardar'}
          </p>
          <Button onClick={handleSave} disabled={isBusy} size="default" className="min-w-[120px]">
            {isBusy ? (
              <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />{uploadingPdf ? 'A enviar PDF…' : 'A guardar…'}</>
            ) : 'Guardar'}
          </Button>
        </div>
      </div>
    </div>
  );
}
