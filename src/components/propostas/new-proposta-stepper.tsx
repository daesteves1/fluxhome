'use client';
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2, X, Plus, Upload, FileText } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { banks, type Bank } from '@/lib/banks';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type RateType = 'variavel' | 'fixa' | 'mista';
type EuriborIndex = '3m' | '6m' | '12m';

interface FormData {
  // Step 1 — banco
  bank_id: string;
  bank_name: string;

  // Step 2 — condições
  rate_type: RateType;
  euribor_index: EuriborIndex;
  spread: string;
  tan_fixa: string;
  prazo_fixo_anos: string;
  periodo_fixo_anos: string;
  tan_periodo_fixo: string;
  spread_pos_fixo: string;
  montante: string;
  prazo_meses: string;
  valor_avaliacao: string;
  monthly_payment: string;
  tan: string;
  taeg: string;
  mtic: string;
  validade_ate: string;

  // Step 3 — seguros
  vida_p1_banco: string;
  vida_p1_externa: string;
  vida_p1_recomendada: 'banco' | 'externa';
  vida_p2_banco: string;
  vida_p2_externa: string;
  vida_p2_recomendada: 'banco' | 'externa';
  multiriscos_banco: string;
  multiriscos_externa: string;
  multiriscos_recomendada: 'banco' | 'externa';

  // Step 4 — encargos
  comissao_abertura: string;
  comissao_formalizacao: string;
  despesas_avaliacao: string;
  comissao_avaliacao: string;
  despesas_escritura: string;
  imposto_selo: string;
  registo_predial: string;
  outros_encargos: string;
  manutencao_conta: string;

  // Step 5 — condições & notas
  condicoes_spread: string[];
  condicoes_pos_fixo: string;
  bank_pdf_file: File | null;
  bank_pdf_path: string | null;
  notes: string;
}

type FieldErrors = Partial<Record<string, string>>;

// ─── Constants ────────────────────────────────────────────────────────────────

const SPREAD_CONDITION_SUGGESTIONS = [
  'Domiciliação de ordenado',
  'Cartão de crédito ativo',
  'Débito direto',
  'Seguro de vida banco',
  'Seguro multirriscos banco',
  'PPR banco',
  'Fundo de investimento',
  'Conta poupança',
];

const RECENT_BANKS_KEY = 'homeflux_recent_banks';

function getRecentBankIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(RECENT_BANKS_KEY) ?? '[]') as string[];
  } catch {
    return [];
  }
}

function saveRecentBank(bankId: string) {
  if (typeof window === 'undefined') return;
  const current = getRecentBankIds().filter((id) => id !== bankId);
  localStorage.setItem(RECENT_BANKS_KEY, JSON.stringify([bankId, ...current].slice(0, 3)));
}

// ─── Step defs ────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 'banco',      name: 'Banco',                   subtitle: 'Selecione o banco desta proposta' },
  { id: 'condicoes',  name: 'Condições do empréstimo', subtitle: 'Taxa, prazo e montante' },
  { id: 'seguros',    name: 'Seguros',                 subtitle: 'Condições de seguro associadas' },
  { id: 'encargos',   name: 'Encargos únicos',         subtitle: 'Comissões e custos iniciais' },
  { id: 'notas',      name: 'Condições & notas',       subtitle: 'Informação complementar' },
  { id: 'resumo',     name: 'Resumo',                  subtitle: 'Verifique antes de guardar' },
];

function isStepComplete(index: number, data: FormData): boolean {
  switch (index) {
    case 0: return data.bank_id !== '' && data.bank_name !== '';
    case 1: {
      if (!data.montante.trim() || !data.prazo_meses.trim()) return false;
      if (data.rate_type === 'variavel') return !!data.spread.trim();
      if (data.rate_type === 'fixa') return !!data.tan_fixa.trim();
      if (data.rate_type === 'mista') return !!data.spread_pos_fixo.trim() || !!data.tan_periodo_fixo.trim();
      return false;
    }
    case 2: return true;
    case 3: return true;
    case 4: return true;
    case 5: return false;
    default: return false;
  }
}

function emptyForm(clientLoanAmount?: number | null, clientTermMonths?: number | null): FormData {
  const today = new Date();
  const validade = new Date(today);
  validade.setDate(validade.getDate() + 30);
  const validadeStr = validade.toISOString().split('T')[0]!;

  return {
    bank_id: '',
    bank_name: '',
    rate_type: 'variavel',
    euribor_index: '6m',
    spread: '',
    tan_fixa: '',
    prazo_fixo_anos: '',
    periodo_fixo_anos: '',
    tan_periodo_fixo: '',
    spread_pos_fixo: '',
    montante: clientLoanAmount ? String(clientLoanAmount) : '',
    prazo_meses: clientTermMonths ? String(clientTermMonths) : '',
    valor_avaliacao: '',
    monthly_payment: '',
    tan: '',
    taeg: '',
    mtic: '',
    validade_ate: validadeStr,
    vida_p1_banco: '',
    vida_p1_externa: '',
    vida_p1_recomendada: 'externa',
    vida_p2_banco: '',
    vida_p2_externa: '',
    vida_p2_recomendada: 'externa',
    multiriscos_banco: '',
    multiriscos_externa: '',
    multiriscos_recomendada: 'banco',
    comissao_abertura: '',
    comissao_formalizacao: '',
    despesas_avaliacao: '',
    comissao_avaliacao: '',
    despesas_escritura: '',
    imposto_selo: '',
    registo_predial: '',
    outros_encargos: '',
    manutencao_conta: '',
    condicoes_spread: [],
    condicoes_pos_fixo: '',
    bank_pdf_file: null,
    bank_pdf_path: null,
    notes: '',
  };
}

function parseNum(v: string): number | null {
  if (!v.trim()) return null;
  const n = parseFloat(v.replace(',', '.'));
  return isNaN(n) ? null : n;
}

// ─── Step 1 — Banco ───────────────────────────────────────────────────────────

function Step1Banco({
  data,
  onChange,
  errors,
}: {
  data: FormData;
  onChange: (f: Partial<FormData>) => void;
  errors: FieldErrors;
}) {
  const [query, setQuery] = useState('');
  const recentIds = getRecentBankIds();
  const recentBanks = recentIds.map((id) => banks.find((b) => b.id === id)).filter(Boolean) as Bank[];
  const filteredBanks = banks.filter(
    (b) => !query.trim() || b.name.toLowerCase().includes(query.toLowerCase()) || b.shortName.toLowerCase().includes(query.toLowerCase())
  );

  function selectBank(bank: Bank) {
    onChange({ bank_id: bank.id, bank_name: bank.name });
  }

  function BankCard({ bank }: { bank: Bank }) {
    const selected = data.bank_id === bank.id;
    return (
      <button
        type="button"
        onClick={() => selectBank(bank)}
        className={cn(
          'relative flex flex-col items-center justify-center gap-2 p-3 rounded-xl border-2 transition-colors text-center',
          selected
            ? 'border-primary bg-primary/5'
            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
        )}
      >
        {selected && (
          <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
            <Check className="h-2.5 w-2.5 text-white" />
          </div>
        )}
        {/* Bank color dot */}
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold"
          style={{ backgroundColor: bank.color }}>
          {bank.shortName.slice(0, 2)}
        </div>
        <p className="text-xs font-medium text-slate-700 leading-tight">{bank.shortName}</p>
      </button>
    );
  }

  return (
    <div className="space-y-5">
      <Input
        placeholder="Pesquisar banco…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {recentBanks.length > 0 && !query.trim() && (
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">
            Utilizados recentemente
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {recentBanks.map((bank) => <BankCard key={bank.id} bank={bank} />)}
          </div>
        </div>
      )}

      <div>
        {recentBanks.length > 0 && !query.trim() && (
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">
            Todos os bancos
          </p>
        )}
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {filteredBanks.map((bank) => <BankCard key={bank.id} bank={bank} />)}
        </div>
      </div>

      {errors.bank_id && <p className="text-sm text-destructive">{errors.bank_id}</p>}
    </div>
  );
}

// ─── Step 2 — Condições ────────────────────────────────────────────────────────

const RATE_TYPES = [
  { value: 'variavel' as const, label: 'Variável' },
  { value: 'fixa' as const,    label: 'Fixa' },
  { value: 'mista' as const,   label: 'Mista' },
];

const EURIBOR_OPTIONS = ['3m', '6m', '12m'] as const;

function Step2Condicoes({
  data,
  onChange,
  errors,
}: {
  data: FormData;
  onChange: (f: Partial<FormData>) => void;
  errors: FieldErrors;
}) {
  return (
    <div className="space-y-5">
      {/* Rate type pills */}
      <div className="space-y-1.5">
        <Label>Tipo de taxa <span className="text-destructive">*</span></Label>
        <div className="flex gap-2">
          {RATE_TYPES.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => onChange({ rate_type: value })}
              className={cn(
                'px-4 py-2 text-sm rounded-full border transition-colors',
                data.rate_type === value
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Variável fields */}
        {data.rate_type === 'variavel' && (
          <>
            <div className="space-y-1.5">
              <Label>Indexante Euribor</Label>
              <div className="flex gap-2">
                {EURIBOR_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => onChange({ euribor_index: opt })}
                    className={cn(
                      'px-3 py-1.5 text-sm rounded-full border transition-colors',
                      data.euribor_index === opt
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
                    )}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Spread (%) <span className="text-destructive">*</span></Label>
              <Input type="number" step="0.01" value={data.spread} onChange={(e) => onChange({ spread: e.target.value })} placeholder="0.70" />
              {errors.spread && <p className="text-xs text-destructive">{errors.spread}</p>}
            </div>
          </>
        )}

        {/* Fixa fields */}
        {data.rate_type === 'fixa' && (
          <>
            <div className="space-y-1.5">
              <Label>TAN fixa (%) <span className="text-destructive">*</span></Label>
              <Input type="number" step="0.01" value={data.tan_fixa} onChange={(e) => onChange({ tan_fixa: e.target.value })} placeholder="3.50" />
              {errors.tan_fixa && <p className="text-xs text-destructive">{errors.tan_fixa}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Prazo fixo (anos)</Label>
              <Input type="number" value={data.prazo_fixo_anos} onChange={(e) => onChange({ prazo_fixo_anos: e.target.value })} placeholder="30" />
            </div>
          </>
        )}

        {/* Mista fields */}
        {data.rate_type === 'mista' && (
          <>
            <div className="space-y-1.5">
              <Label>Período fixo (anos)</Label>
              <Input type="number" value={data.periodo_fixo_anos} onChange={(e) => onChange({ periodo_fixo_anos: e.target.value })} placeholder="5" />
            </div>
            <div className="space-y-1.5">
              <Label>TAN período fixo (%)</Label>
              <Input type="number" step="0.01" value={data.tan_periodo_fixo} onChange={(e) => onChange({ tan_periodo_fixo: e.target.value })} placeholder="3.20" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Spread pós-fixo (%) <span className="text-destructive">*</span></Label>
              <Input type="number" step="0.01" value={data.spread_pos_fixo} onChange={(e) => onChange({ spread_pos_fixo: e.target.value })} placeholder="0.70" />
              {errors.spread_pos_fixo && <p className="text-xs text-destructive">{errors.spread_pos_fixo}</p>}
            </div>
          </>
        )}

        {/* Common fields */}
        <div className="space-y-1.5">
          <Label>Montante (€) <span className="text-destructive">*</span></Label>
          <Input type="number" step="1000" value={data.montante} onChange={(e) => onChange({ montante: e.target.value })} placeholder="200000" />
          {errors.montante && <p className="text-xs text-destructive">{errors.montante}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Prazo (meses) <span className="text-destructive">*</span></Label>
          <Input type="number" value={data.prazo_meses} onChange={(e) => onChange({ prazo_meses: e.target.value })} placeholder="360" />
          {errors.prazo_meses && <p className="text-xs text-destructive">{errors.prazo_meses}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Valor de avaliação (€)</Label>
          <Input type="number" step="1000" value={data.valor_avaliacao} onChange={(e) => onChange({ valor_avaliacao: e.target.value })} placeholder="—" />
        </div>
        <div className="space-y-1.5">
          <Label>Prestação mensal (€)</Label>
          <Input type="number" step="0.01" value={data.monthly_payment} onChange={(e) => onChange({ monthly_payment: e.target.value })} placeholder="750.00" />
        </div>
        <div className="space-y-1.5">
          <Label>TAN (%)</Label>
          <Input type="number" step="0.01" value={data.tan} onChange={(e) => onChange({ tan: e.target.value })} placeholder="4.15" />
        </div>
        <div className="space-y-1.5">
          <Label>TAEG (%)</Label>
          <Input type="number" step="0.01" value={data.taeg} onChange={(e) => onChange({ taeg: e.target.value })} placeholder="4.32" />
        </div>
        <div className="space-y-1.5">
          <Label>MTIC (€) <span className="text-xs text-slate-400">introduzido manualmente</span></Label>
          <Input type="number" step="0.01" value={data.mtic} onChange={(e) => onChange({ mtic: e.target.value })} placeholder="—" />
        </div>
        <div className="space-y-1.5">
          <Label>Validade desta proposta</Label>
          <Input type="date" value={data.validade_ate} onChange={(e) => onChange({ validade_ate: e.target.value })} />
        </div>
      </div>
    </div>
  );
}

// ─── Step 3 — Seguros ─────────────────────────────────────────────────────────

function RecomToggle({
  value,
  onChange,
  disableExterna,
}: {
  value: 'banco' | 'externa';
  onChange: (v: 'banco' | 'externa') => void;
  disableExterna: boolean;
}) {
  return (
    <div className="flex gap-1">
      {(['banco', 'externa'] as const).map((opt) => {
        const disabled = opt === 'externa' && disableExterna;
        const active = value === opt && !(opt === 'externa' && disableExterna);
        return (
          <button
            key={opt}
            type="button"
            disabled={disabled}
            onClick={() => !disabled && onChange(opt)}
            className={cn(
              'px-2.5 py-1 text-xs rounded-full border transition-colors',
              active ? 'bg-primary text-white border-primary' :
              disabled ? 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed' :
              'bg-white text-slate-500 border-slate-300 hover:border-slate-400'
            )}
          >
            {opt === 'banco' ? 'Banco' : 'Ext.'}
          </button>
        );
      })}
    </div>
  );
}

function Step3Seguros({
  data,
  onChange,
  hasP2,
}: {
  data: FormData;
  onChange: (f: Partial<FormData>) => void;
  hasP2: boolean;
}) {
  function MoneyInput({ value, onSet }: { value: string; onSet: (v: string) => void }) {
    return (
      <Input
        type="number"
        step="0.01"
        value={value}
        onChange={(e) => onSet(e.target.value)}
        className="h-8 text-xs text-center"
        placeholder="0.00"
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr className="bg-slate-50">
              <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3 min-w-[160px]">Seguro</th>
              <th className="text-center text-xs font-semibold text-slate-500 px-3 py-3 min-w-[100px]">Banco (€/mês)</th>
              <th className="text-center text-xs font-semibold text-slate-500 px-3 py-3 min-w-[100px]">Externa (€/mês)</th>
              <th className="text-center text-xs font-semibold text-slate-500 px-3 py-3 min-w-[120px]">Recomendada</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <tr>
              <td className="px-4 py-3 text-xs font-medium text-slate-700">Seguro Vida — P1</td>
              <td className="px-3 py-3"><MoneyInput value={data.vida_p1_banco} onSet={(v) => onChange({ vida_p1_banco: v })} /></td>
              <td className="px-3 py-3"><MoneyInput value={data.vida_p1_externa} onSet={(v) => onChange({ vida_p1_externa: v })} /></td>
              <td className="px-3 py-3"><RecomToggle value={data.vida_p1_recomendada} onChange={(v) => onChange({ vida_p1_recomendada: v })} disableExterna={!data.vida_p1_externa} /></td>
            </tr>
            {hasP2 && (
              <tr>
                <td className="px-4 py-3 text-xs font-medium text-slate-700">Seguro Vida — P2</td>
                <td className="px-3 py-3"><MoneyInput value={data.vida_p2_banco} onSet={(v) => onChange({ vida_p2_banco: v })} /></td>
                <td className="px-3 py-3"><MoneyInput value={data.vida_p2_externa} onSet={(v) => onChange({ vida_p2_externa: v })} /></td>
                <td className="px-3 py-3"><RecomToggle value={data.vida_p2_recomendada} onChange={(v) => onChange({ vida_p2_recomendada: v })} disableExterna={!data.vida_p2_externa} /></td>
              </tr>
            )}
            <tr>
              <td className="px-4 py-3 text-xs font-medium text-slate-700">Seguro Multirriscos</td>
              <td className="px-3 py-3"><MoneyInput value={data.multiriscos_banco} onSet={(v) => onChange({ multiriscos_banco: v })} /></td>
              <td className="px-3 py-3"><MoneyInput value={data.multiriscos_externa} onSet={(v) => onChange({ multiriscos_externa: v })} /></td>
              <td className="px-3 py-3"><RecomToggle value={data.multiriscos_recomendada} onChange={(v) => onChange({ multiriscos_recomendada: v })} disableExterna={!data.multiriscos_externa} /></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Step 4 — Encargos ────────────────────────────────────────────────────────

function Step4Encargos({
  data,
  onChange,
}: {
  data: FormData;
  onChange: (f: Partial<FormData>) => void;
}) {
  const sections = [
    {
      title: 'Abertura de processo',
      fields: [
        { key: 'comissao_abertura', label: 'Comissão de abertura' },
        { key: 'comissao_formalizacao', label: 'Comissão de formalização' },
      ],
    },
    {
      title: 'Avaliação',
      fields: [
        { key: 'despesas_avaliacao', label: 'Despesas de avaliação' },
        { key: 'comissao_avaliacao', label: 'Comissão de avaliação' },
      ],
    },
    {
      title: 'Escritura & registo',
      fields: [
        { key: 'despesas_escritura', label: 'Despesas de escritura' },
        { key: 'imposto_selo', label: 'Imposto de selo' },
        { key: 'registo_predial', label: 'Registo predial' },
      ],
    },
    {
      title: 'Outros',
      fields: [
        { key: 'outros_encargos', label: 'Outros encargos' },
      ],
    },
  ] as const;

  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <div key={section.title}>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">{section.title}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {section.fields.map((field) => (
              <div key={field.key} className="space-y-1.5">
                <Label className="text-xs">{field.label} (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={(data as unknown as Record<string, string>)[field.key]}
                  onChange={(e) => onChange({ [field.key]: e.target.value } as Partial<FormData>)}
                  placeholder="0"
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Manutenção */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Encargos mensais</p>
        <div className="space-y-1.5 max-w-[240px]">
          <Label className="text-xs">Manutenção de conta (€/mês)</Label>
          <Input
            type="number"
            step="0.01"
            value={data.manutencao_conta}
            onChange={(e) => onChange({ manutencao_conta: e.target.value })}
            placeholder="4.50"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Step 5 — Condições & notas ────────────────────────────────────────────────

function TagInput({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [custom, setCustom] = useState('');

  function toggle(opt: string) {
    onChange(value.includes(opt) ? value.filter((x) => x !== opt) : [...value, opt]);
  }

  function addCustom() {
    const t = custom.trim();
    if (t && !value.includes(t)) onChange([...value, t]);
    setCustom('');
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {SPREAD_CONDITION_SUGGESTIONS.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={cn(
              'px-2.5 py-1 text-xs rounded-full border transition-colors',
              value.includes(opt)
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
            )}
          >
            {opt}
          </button>
        ))}
      </div>
      {/* Custom tags */}
      {value.filter((v) => !SPREAD_CONDITION_SUGGESTIONS.includes(v)).map((c) => (
        <span key={c} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-primary text-white rounded-full mr-1.5">
          {c}
          <button type="button" onClick={() => onChange(value.filter((x) => x !== c))}>
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
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function Step5Notas({
  data,
  onChange,
  clientId,
}: {
  data: FormData;
  onChange: (f: Partial<FormData>) => void;
  clientId: string;
}) {
  const displayedPdfName = data.bank_pdf_path
    ? data.bank_pdf_path.split('/').pop() ?? 'document.pdf'
    : data.bank_pdf_file?.name ?? null;

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Label>Condições de spread</Label>
        <p className="text-xs text-slate-400 mb-2">Selecione ou adicione as condições associadas ao spread.</p>
        <TagInput value={data.condicoes_spread} onChange={(v) => onChange({ condicoes_spread: v })} />
      </div>

      {data.rate_type === 'mista' && (
        <div className="space-y-1.5">
          <Label>Condições pós-período fixo</Label>
          <Textarea
            rows={2}
            value={data.condicoes_pos_fixo}
            onChange={(e) => onChange({ condicoes_pos_fixo: e.target.value })}
            placeholder="Ex: Euribor 6 meses + 0.70% spread"
          />
        </div>
      )}

      <div className="space-y-1.5">
        <Label>Documento do banco (PDF)</Label>
        {displayedPdfName ? (
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg w-fit">
            <FileText className="h-4 w-4 text-slate-400 shrink-0" />
            <span className="text-sm text-slate-700 truncate max-w-[260px]">{displayedPdfName}</span>
            <button
              type="button"
              onClick={() => onChange({ bank_pdf_file: null, bank_pdf_path: null })}
              className="text-slate-400 hover:text-red-400 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                if (file) onChange({ bank_pdf_file: file });
                e.target.value = '';
              }}
            />
            <div className="inline-flex items-center gap-2 px-3 py-2 text-sm text-slate-600 bg-white border border-dashed border-slate-300 rounded-lg hover:border-slate-400 hover:bg-slate-50 transition-colors cursor-pointer">
              <Upload className="h-4 w-4 text-slate-400" />
              Carregar PDF
            </div>
          </label>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>Notas internas</Label>
        <Textarea
          rows={3}
          value={data.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          placeholder="Condições especiais, observações…"
        />
      </div>
    </div>
  );
}

// ─── Step 6 — Resumo ───────────────────────────────────────────────────────────

function SummaryCard({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
        <p className="text-sm font-semibold text-slate-700">{title}</p>
        <button type="button" onClick={onEdit} className="text-xs text-primary hover:underline">Editar</button>
      </div>
      <div className="px-4 py-3 space-y-1.5 text-sm text-slate-700">{children}</div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-2">
      <span className="text-slate-400 w-36 shrink-0">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

const RATE_TYPE_LABEL: Record<RateType, string> = {
  variavel: 'Variável',
  fixa: 'Fixa',
  mista: 'Mista',
};

function Step6Resumo({
  data,
  onEditStep,
}: {
  data: FormData;
  onEditStep: (i: number) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Key metric cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'TAEG', value: data.taeg ? `${data.taeg}%` : null },
          { label: 'Spread', value: data.spread ? `${data.spread}%` : data.tan_fixa ? `${data.tan_fixa}% (TAN)` : null },
          { label: 'Prestação', value: data.monthly_payment ? `€ ${data.monthly_payment}` : null },
          { label: 'MTIC', value: data.mtic ? `€ ${Number(data.mtic).toLocaleString('pt-PT')}` : null },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg border border-slate-200 bg-white px-4 py-3">
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">{label}</p>
            <p className={`text-lg font-semibold mt-0.5 ${value ? 'text-slate-900' : 'text-slate-300'}`}>{value ?? '—'}</p>
          </div>
        ))}
      </div>

      <SummaryCard title="Banco" onEdit={() => onEditStep(0)}>
        <SummaryRow label="Banco" value={data.bank_name} />
      </SummaryCard>

      <SummaryCard title="Condições do empréstimo" onEdit={() => onEditStep(1)}>
        <SummaryRow label="Tipo de taxa" value={RATE_TYPE_LABEL[data.rate_type]} />
        <SummaryRow label="Montante" value={data.montante ? `€ ${Number(data.montante).toLocaleString('pt-PT')}` : undefined} />
        <SummaryRow label="Prazo" value={data.prazo_meses ? `${data.prazo_meses} meses` : undefined} />
        <SummaryRow label="Spread" value={data.spread ? `${data.spread}%` : undefined} />
        <SummaryRow label="TAN" value={data.tan ? `${data.tan}%` : undefined} />
        <SummaryRow label="TAEG" value={data.taeg ? `${data.taeg}%` : undefined} />
        <SummaryRow label="Validade" value={data.validade_ate} />
      </SummaryCard>

      {(data.condicoes_spread.length > 0 || data.notes) && (
        <SummaryCard title="Condições & notas" onEdit={() => onEditStep(4)}>
          {data.condicoes_spread.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {data.condicoes_spread.map((c) => (
                <span key={c} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full">{c}</span>
              ))}
            </div>
          )}
          <SummaryRow label="Notas" value={data.notes} />
        </SummaryCard>
      )}
    </div>
  );
}

// ─── Success Screen ────────────────────────────────────────────────────────────

function SuccessScreen({
  clientId,
  bankName,
  onAddAnother,
}: {
  clientId: string;
  bankName: string;
  onAddAnother: () => void;
}) {
  const router = useRouter();
  return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center bg-slate-50 px-6 py-12">
      <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-6">
        <Check className="h-10 w-10 text-emerald-600" strokeWidth={2.5} />
      </div>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Proposta guardada!</h1>
      <p className="text-slate-500 mb-8">{bankName}</p>

      <div className="flex flex-col items-center gap-3 w-full max-w-xs">
        <Button className="w-full" onClick={onAddAnother}>
          Adicionar outra proposta
        </Button>
        <Button variant="outline" className="w-full" onClick={() => router.push(`/dashboard/clients/${clientId}?tab=propostas`)}>
          Ver mapa comparativo
        </Button>
        <Button variant="ghost" className="w-full text-slate-500" onClick={() => router.push(`/dashboard/clients/${clientId}`)}>
          Voltar ao cliente
        </Button>
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

interface NewPropostaStepperProps {
  clientId: string;
  p2Name?: string | null;
  clientLoanAmount?: number | null;
  clientTermMonths?: number | null;
}

export function NewPropostaStepper({
  clientId,
  p2Name,
  clientLoanAmount,
  clientTermMonths,
}: NewPropostaStepperProps) {
  const hasP2 = Boolean(p2Name);
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<FormData>(() => emptyForm(clientLoanAmount, clientTermMonths));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successBankName, setSuccessBankName] = useState<string | null>(null);

  const onChange = useCallback((patch: Partial<FormData>) => {
    setData((prev) => ({ ...prev, ...patch }));
  }, []);

  const completedSteps = STEPS.map((_, i) => isStepComplete(i, data));

  function validateStep(step: number): FieldErrors {
    const errs: FieldErrors = {};
    if (step === 0) {
      if (!data.bank_id) errs.bank_id = 'Selecione um banco';
    }
    if (step === 1) {
      if (!data.montante.trim()) errs.montante = 'Campo obrigatório';
      if (!data.prazo_meses.trim()) errs.prazo_meses = 'Campo obrigatório';
      if (data.rate_type === 'variavel' && !data.spread.trim()) errs.spread = 'Campo obrigatório';
      if (data.rate_type === 'fixa' && !data.tan_fixa.trim()) errs.tan_fixa = 'Campo obrigatório';
      if (data.rate_type === 'mista' && !data.spread_pos_fixo.trim() && !data.tan_periodo_fixo.trim())
        errs.spread_pos_fixo = 'Introduza o spread ou TAN';
    }
    return errs;
  }

  function handleNext() {
    if (currentStep < STEPS.length - 1) {
      const errs = validateStep(currentStep);
      if (Object.keys(errs).length > 0) { setErrors(errs); return; }
      setErrors({});
      setCurrentStep((s) => s + 1);
    } else {
      handleSubmit();
    }
  }

  function handlePrev() {
    setErrors({});
    setCurrentStep((s) => Math.max(0, s - 1));
  }

  function handleStepClick(i: number) {
    setErrors({});
    setCurrentStep(i);
  }

  const router = useRouter();
  function handleCancel() {
    router.push(`/dashboard/clients/${clientId}?tab=propostas`);
  }

  async function handleSubmit() {
    setIsSubmitting(true);

    // Save recent bank
    if (data.bank_id) saveRecentBank(data.bank_id);

    try {
      const payload = {
        bank_name: data.bank_name,
        rate_type: data.rate_type,
        euribor_index: data.euribor_index,
        spread: parseNum(data.spread),
        tan: parseNum(data.tan) ?? parseNum(data.tan_fixa),
        taeg: parseNum(data.taeg),
        monthly_payment: parseNum(data.monthly_payment),
        loan_amount: parseNum(data.montante),
        term_months: parseNum(data.prazo_meses),
        valor_avaliacao: parseNum(data.valor_avaliacao),
        fixed_period_years: parseNum(data.periodo_fixo_anos) ?? parseNum(data.prazo_fixo_anos),
        mtic: parseNum(data.mtic),
        validade_ate: data.validade_ate || null,
        vida_p1_banco: parseNum(data.vida_p1_banco),
        vida_p1_externa: parseNum(data.vida_p1_externa),
        vida_p1_recomendada: data.vida_p1_recomendada,
        vida_p2_banco: hasP2 ? parseNum(data.vida_p2_banco) : null,
        vida_p2_externa: hasP2 ? parseNum(data.vida_p2_externa) : null,
        vida_p2_recomendada: hasP2 ? data.vida_p2_recomendada : null,
        multiriscos_banco: parseNum(data.multiriscos_banco),
        multiriscos_externa: parseNum(data.multiriscos_externa),
        multiriscos_recomendada: data.multiriscos_recomendada,
        abertura_processo: parseNum(data.comissao_abertura),
        comissao_formalizacao: parseNum(data.comissao_formalizacao),
        comissao_avaliacao: parseNum(data.comissao_avaliacao),
        comissao_estudo: parseNum(data.despesas_avaliacao),
        escritura: parseNum(data.despesas_escritura),
        imposto_selo_mutuo: parseNum(data.imposto_selo),
        registo: parseNum(data.registo_predial),
        outras_comissoes_mensais: parseNum(data.outros_encargos),
        manutencao_conta: parseNum(data.manutencao_conta),
        condicoes_spread: data.condicoes_spread.length ? data.condicoes_spread : null,
        condicoes_pos_fixo: data.condicoes_pos_fixo || null,
        notes: data.notes || null,
      };

      const res = await fetch(`/api/clients/${clientId}/bank-propostas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json() as { error?: string };
        setErrors({ _form: err.error ?? 'Erro ao guardar proposta' });
        return;
      }

      const saved = await res.json() as { id?: string };

      // Upload PDF if present
      if (data.bank_pdf_file && saved.id) {
        const fd = new FormData();
        fd.append('file', data.bank_pdf_file);
        await fetch(`/api/clients/${clientId}/bank-propostas/${saved.id}/upload-pdf`, {
          method: 'POST',
          body: fd,
        });
      }

      setSuccessBankName(data.bank_name);
    } catch {
      setErrors({ _form: 'Erro de rede. Tente novamente.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  // Success
  if (successBankName) {
    return (
      <SuccessScreen
        clientId={clientId}
        bankName={successBankName}
        onAddAnother={() => {
          setData(emptyForm(clientLoanAmount, clientTermMonths));
          setCurrentStep(0);
          setSuccessBankName(null);
          setErrors({});
        }}
      />
    );
  }

  const step = STEPS[currentStep]!;
  const progressPct = ((currentStep + 1) / STEPS.length) * 100;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Progress header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <div>
            <span className="font-semibold text-slate-900">{step.name}</span>
            <span className="text-slate-400 ml-2">{step.subtitle}</span>
          </div>
          <span className="text-slate-400 text-xs shrink-0">{currentStep + 1} / {STEPS.length}</span>
        </div>
        <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Step tabs (desktop) */}
      <div className="hidden sm:flex gap-1 overflow-x-auto pb-0.5">
        {STEPS.map((s, i) => {
          const done = completedSteps[i] ?? false;
          const active = i === currentStep;
          const clickable = done && i < currentStep;
          return (
            <button
              key={s.id}
              type="button"
              disabled={!clickable && !active}
              onClick={() => clickable ? handleStepClick(i) : undefined}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
                active && 'bg-primary/10 text-primary',
                done && !active && clickable && 'text-slate-500 hover:bg-slate-100',
                !active && !clickable && 'text-slate-300 cursor-default',
              )}
            >
              {done && i < currentStep ? (
                <Check className="h-3 w-3 shrink-0" />
              ) : (
                <span className={cn(
                  'w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0',
                  active ? 'bg-primary text-white' : 'bg-slate-200 text-slate-400',
                )}>{i + 1}</span>
              )}
              {s.name}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        {errors._form && (
          <div className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {errors._form}
          </div>
        )}
        {currentStep === 0 && <Step1Banco data={data} onChange={onChange} errors={errors} />}
        {currentStep === 1 && <Step2Condicoes data={data} onChange={onChange} errors={errors} />}
        {currentStep === 2 && <Step3Seguros data={data} onChange={onChange} hasP2={hasP2} />}
        {currentStep === 3 && <Step4Encargos data={data} onChange={onChange} />}
        {currentStep === 4 && <Step5Notas data={data} onChange={onChange} clientId={clientId} />}
        {currentStep === 5 && <Step6Resumo data={data} onEditStep={handleStepClick} />}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pb-4">
        <div className="flex items-center gap-3">
          {currentStep > 0 ? (
            <Button type="button" variant="outline" onClick={handlePrev} disabled={isSubmitting}>
              ← Anterior
            </Button>
          ) : (
            <button
              type="button"
              onClick={handleCancel}
              className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
            >
              Cancelar
            </button>
          )}
        </div>
        <Button type="button" onClick={handleNext} disabled={isSubmitting} className="min-w-[140px]">
          {isSubmitting ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />A guardar…</>
          ) : currentStep === STEPS.length - 1 ? (
            'Guardar proposta'
          ) : (
            'Seguinte →'
          )}
        </Button>
      </div>
    </div>
  );
}
