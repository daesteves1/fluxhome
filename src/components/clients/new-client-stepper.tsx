'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Copy, Mail, Loader2, Lock, X, Plus } from 'lucide-react';
import { VerticalStepper, type StepDef } from '@/components/ui/vertical-stepper';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PLATFORM_DEFAULT_DOCUMENTS, type OfficeDocTemplate } from '@/lib/document-defaults';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DocRow extends OfficeDocTemplate {
  rowId: string; // unique key for list rendering
}

interface FormData {
  // Step 1 — tipo
  tipo: 'habitacao' | 'renegociacao' | 'construcao' | 'outro' | '';

  // Step 2 — proponentes
  p1_name: string;
  p1_email: string;
  p1_phone: string;
  p1_nif: string;
  p1_birth_date: string;
  p1_estado_civil: string;
  p1_profissao: string;
  p1_entidade_empregadora: string;
  p1_tipo_contrato: string;
  p1_rendimento: string;
  has_p2: boolean;
  p2_name: string;
  p2_email: string;
  p2_phone: string;
  p2_nif: string;
  p2_birth_date: string;
  p2_estado_civil: string;
  p2_profissao: string;
  p2_entidade_empregadora: string;
  p2_tipo_contrato: string;
  p2_rendimento: string;

  // Step 3 — processo
  valor_imovel: string;
  montante: string;
  prazo_anos: string;
  finalidade: string;
  localizacao: string;
  observacoes: string;

  // Step 4 — documentos
  docs: DocRow[];
}

type FieldErrors = Partial<Record<keyof FormData | string, string>>;

// ─── Constants ────────────────────────────────────────────────────────────────

const TIPO_OPTIONS = [
  {
    value: 'habitacao' as const,
    icon: '🏠',
    label: 'Crédito habitação',
    desc: 'Compra de imóvel para habitação própria',
  },
  {
    value: 'renegociacao' as const,
    icon: '🔄',
    label: 'Renegociação',
    desc: 'Revisão de crédito existente',
  },
  {
    value: 'construcao' as const,
    icon: '🏗',
    label: 'Construção',
    desc: 'Financiamento de obra ou autoconstrução',
  },
  {
    value: 'outro' as const,
    icon: '📋',
    label: 'Outro',
    desc: 'Outro tipo de processo',
  },
] as const;

const ESTADO_CIVIL_OPTIONS = [
  'Solteiro/a',
  'Casado/a',
  'Divorciado/a',
  'Viúvo/a',
  'União de facto',
];

const TIPO_CONTRATO_OPTIONS = [
  'Efetivo',
  'Termo certo',
  'Termo incerto',
  'Independente',
  'Outro',
];

const FINALIDADE_OPTIONS = [
  'Habitação própria permanente',
  'Habitação própria secundária',
  'Arrendamento',
  'Outro',
];

const TIPO_TO_MORTGAGE: Record<string, string> = {
  habitacao: 'acquisition',
  renegociacao: 'refinancing',
  construcao: 'construction',
  outro: 'other',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function emptyForm(): FormData {
  const defaultDocs: DocRow[] = PLATFORM_DEFAULT_DOCUMENTS.filter((d) => d.enabled).map((d) => ({
    ...d,
    rowId: d.doc_type,
  }));
  return {
    tipo: '',
    p1_name: '',
    p1_email: '',
    p1_phone: '',
    p1_nif: '',
    p1_birth_date: '',
    p1_estado_civil: '',
    p1_profissao: '',
    p1_entidade_empregadora: '',
    p1_tipo_contrato: '',
    p1_rendimento: '',
    has_p2: false,
    p2_name: '',
    p2_email: '',
    p2_phone: '',
    p2_nif: '',
    p2_birth_date: '',
    p2_estado_civil: '',
    p2_profissao: '',
    p2_entidade_empregadora: '',
    p2_tipo_contrato: '',
    p2_rendimento: '',
    valor_imovel: '',
    montante: '',
    prazo_anos: '',
    finalidade: '',
    localizacao: '',
    observacoes: '',
    docs: defaultDocs,
  };
}

function calcLtv(montante: string, valor: string): string {
  const m = parseFloat(montante);
  const v = parseFloat(valor);
  if (!m || !v || v === 0) return '—';
  return ((m / v) * 100).toFixed(1) + '%';
}

// ─── Step definitions ─────────────────────────────────────────────────────────

const STEPS: StepDef[] = [
  { id: 'tipo',        name: 'Tipo de processo',       subtitle: 'Que tipo de crédito vamos tratar?' },
  { id: 'proponentes', name: 'Proponentes',            subtitle: 'Quem são os titulares do crédito?' },
  { id: 'processo',    name: 'Dados do processo',      subtitle: 'Detalhes financeiros do pedido' },
  { id: 'documentos',  name: 'Documentos',             subtitle: 'Quais os documentos necessários?' },
  { id: 'resumo',      name: 'Resumo & confirmação',   subtitle: 'Verifique os dados antes de criar' },
];

function isStepComplete(index: number, data: FormData): boolean {
  switch (index) {
    case 0: return data.tipo !== '';
    case 1: return data.p1_name.trim() !== '' && data.p1_email.trim() !== '';
    case 2: return data.valor_imovel.trim() !== '' && data.montante.trim() !== '' && data.prazo_anos.trim() !== '';
    case 3: return true;
    case 4: return false; // summary — not "completable" pre-submit
    default: return false;
  }
}

// ─── Step content components ──────────────────────────────────────────────────

function Step1Tipo({
  data,
  onChange,
  errors,
}: {
  data: FormData;
  onChange: (f: Partial<FormData>) => void;
  errors: FieldErrors;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {TIPO_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange({ tipo: opt.value })}
            className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-colors ${
              data.tipo === opt.value
                ? 'border-primary bg-primary/5'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <span className="text-2xl mt-0.5">{opt.icon}</span>
            <div>
              <p className="font-medium text-sm text-slate-900">{opt.label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
            </div>
          </button>
        ))}
      </div>
      {errors.tipo && <p className="text-sm text-destructive">{errors.tipo}</p>}
    </div>
  );
}

function ProponenteFields({
  prefix,
  data,
  onChange,
  errors,
  required,
}: {
  prefix: 'p1' | 'p2';
  data: FormData;
  onChange: (f: Partial<FormData>) => void;
  errors: FieldErrors;
  required?: boolean;
}) {
  const f = (field: string) => `${prefix}_${field}` as keyof FormData;
  const val = (field: string) => (data[f(field)] as string) ?? '';
  const err = (field: string) => errors[`${prefix}_${field}`];
  const set = (field: string, value: string) => onChange({ [f(field)]: value } as Partial<FormData>);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="space-y-1.5">
        <Label>Nome completo {required && <span className="text-destructive">*</span>}</Label>
        <Input value={val('name')} onChange={(e) => set('name', e.target.value)} />
        {err('name') && <p className="text-xs text-destructive">{err('name')}</p>}
      </div>
      <div className="space-y-1.5">
        <Label>Email {required && <span className="text-destructive">*</span>}</Label>
        <Input type="email" value={val('email')} onChange={(e) => set('email', e.target.value)} />
        {err('email') && <p className="text-xs text-destructive">{err('email')}</p>}
      </div>
      <div className="space-y-1.5">
        <Label>Telefone</Label>
        <Input value={val('phone')} onChange={(e) => set('phone', e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>NIF</Label>
        <Input value={val('nif')} onChange={(e) => set('nif', e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Data de nascimento</Label>
        <Input type="date" value={val('birth_date')} onChange={(e) => set('birth_date', e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Estado civil</Label>
        <Select value={val('estado_civil') || undefined} onValueChange={(v) => set('estado_civil', v)}>
          <SelectTrigger><SelectValue placeholder="Selecionar…" /></SelectTrigger>
          <SelectContent>
            {ESTADO_CIVIL_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Profissão</Label>
        <Input value={val('profissao')} onChange={(e) => set('profissao', e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Entidade empregadora</Label>
        <Input value={val('entidade_empregadora')} onChange={(e) => set('entidade_empregadora', e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Tipo de contrato</Label>
        <Select value={val('tipo_contrato') || undefined} onValueChange={(v) => set('tipo_contrato', v)}>
          <SelectTrigger><SelectValue placeholder="Selecionar…" /></SelectTrigger>
          <SelectContent>
            {TIPO_CONTRATO_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Rendimento mensal líquido (€)</Label>
        <Input type="number" value={val('rendimento')} onChange={(e) => set('rendimento', e.target.value)} placeholder="0" />
      </div>
    </div>
  );
}

function Step2Proponentes({
  data,
  onChange,
  errors,
}: {
  data: FormData;
  onChange: (f: Partial<FormData>) => void;
  errors: FieldErrors;
}) {
  return (
    <div className="space-y-6">
      {/* P1 */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-4 pb-2 border-b border-slate-100">
          Proponente 1
        </h3>
        <ProponenteFields prefix="p1" data={data} onChange={onChange} errors={errors} required />
      </div>

      {/* P2 toggle */}
      <div className="flex items-center gap-3 py-2">
        <Switch
          id="has_p2"
          checked={data.has_p2}
          onCheckedChange={(v) => onChange({ has_p2: v })}
        />
        <Label htmlFor="has_p2" className="cursor-pointer">
          {data.has_p2 ? 'Remover segundo proponente' : 'Adicionar segundo proponente'}
        </Label>
      </div>

      {/* P2 */}
      {data.has_p2 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-4 pb-2 border-b border-slate-100">
            Proponente 2
          </h3>
          <ProponenteFields prefix="p2" data={data} onChange={onChange} errors={errors} />
        </div>
      )}
    </div>
  );
}

function Step3Processo({
  data,
  onChange,
  errors,
}: {
  data: FormData;
  onChange: (f: Partial<FormData>) => void;
  errors: FieldErrors;
}) {
  const ltv = calcLtv(data.montante, data.valor_imovel);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Valor do imóvel (€) <span className="text-destructive">*</span></Label>
          <Input
            type="number"
            step="1000"
            value={data.valor_imovel}
            onChange={(e) => onChange({ valor_imovel: e.target.value })}
            placeholder="250000"
          />
          {errors.valor_imovel && <p className="text-xs text-destructive">{errors.valor_imovel}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Montante solicitado (€) <span className="text-destructive">*</span></Label>
          <Input
            type="number"
            step="1000"
            value={data.montante}
            onChange={(e) => onChange({ montante: e.target.value })}
            placeholder="200000"
          />
          {errors.montante && <p className="text-xs text-destructive">{errors.montante}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Prazo (anos) <span className="text-destructive">*</span></Label>
          <Input
            type="number"
            min={5}
            max={40}
            value={data.prazo_anos}
            onChange={(e) => onChange({ prazo_anos: e.target.value })}
            placeholder="30"
          />
          {errors.prazo_anos && <p className="text-xs text-destructive">{errors.prazo_anos}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Finalidade</Label>
          <Select value={data.finalidade || undefined} onValueChange={(v) => onChange({ finalidade: v })}>
            <SelectTrigger><SelectValue placeholder="Selecionar…" /></SelectTrigger>
            <SelectContent>
              {FINALIDADE_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Localização do imóvel</Label>
          <Input
            value={data.localizacao}
            onChange={(e) => onChange({ localizacao: e.target.value })}
            placeholder="Concelho / distrito…"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Observações iniciais</Label>
          <Textarea
            rows={3}
            value={data.observacoes}
            onChange={(e) => onChange({ observacoes: e.target.value })}
            placeholder="Notas internas do mediador…"
          />
        </div>
      </div>

      {/* Live calculated metrics */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
          <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">LTV</p>
          <p className="text-xl font-semibold text-slate-900 mt-0.5">{ltv}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
          <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Prestação estimada</p>
          <p className="text-xl font-semibold text-slate-400 mt-0.5">—</p>
          <p className="text-[10px] text-slate-400">calculado após propostas</p>
        </div>
      </div>
    </div>
  );
}

function Step4Documentos({
  data,
  onChange,
}: {
  data: FormData;
  onChange: (f: Partial<FormData>) => void;
}) {
  const [addName, setAddName] = useState('');
  const [addProponente, setAddProponente] = useState<'per_proponente' | 'shared'>('per_proponente');
  const [addObrigatorio, setAddObrigatorio] = useState(false);

  function toggleDoc(rowId: string, enabled: boolean) {
    onChange({
      docs: data.docs.map((d) =>
        d.rowId === rowId ? { ...d, enabled } : d
      ),
    });
  }

  function removeDoc(rowId: string) {
    onChange({ docs: data.docs.filter((d) => d.rowId !== rowId) });
  }

  function addDoc() {
    const name = addName.trim();
    if (!name) return;
    const newDoc: DocRow = {
      rowId: `custom_${Date.now()}`,
      doc_type: `custom_${Date.now()}`,
      label: name,
      is_mandatory: addObrigatorio,
      max_files: 1,
      proponente: addProponente,
      enabled: true,
      is_custom: true,
    };
    onChange({ docs: [...data.docs, newDoc] });
    setAddName('');
    setAddProponente('per_proponente');
    setAddObrigatorio(false);
  }

  return (
    <div className="space-y-4">
      {/* Document list */}
      <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
        {data.docs.map((doc) => (
          <div key={doc.rowId} className="flex items-center gap-3 px-4 py-3">
            {/* Mandatory lock / enabled toggle */}
            {doc.is_mandatory ? (
              <div className="relative flex-shrink-0" title="Este documento é obrigatório pela plataforma">
                <Lock className="h-4 w-4 text-slate-300" />
              </div>
            ) : (
              <Switch
                checked={doc.enabled}
                onCheckedChange={(v) => toggleDoc(doc.rowId, v)}
                className="flex-shrink-0"
              />
            )}

            <div className="flex-1 min-w-0">
              <p className={`text-sm ${doc.enabled ? 'text-slate-900' : 'text-slate-400'}`}>
                {doc.label}
              </p>
            </div>

            {/* Badge */}
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
              doc.proponente === 'shared'
                ? 'bg-slate-100 text-slate-500'
                : 'bg-blue-50 text-blue-600'
            }`}>
              {doc.proponente === 'shared' ? 'Partilhado' : 'Por proponente'}
            </span>

            {/* Remove (only non-mandatory) */}
            {!doc.is_mandatory && (
              <button
                type="button"
                onClick={() => removeDoc(doc.rowId)}
                className="text-slate-300 hover:text-red-400 transition-colors flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add document inline form */}
      <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-4 space-y-3">
        <p className="text-sm font-medium text-slate-700">Adicionar documento</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            value={addName}
            onChange={(e) => setAddName(e.target.value)}
            placeholder="Nome do documento…"
          />
          <Select
            value={addProponente}
            onValueChange={(v) => setAddProponente(v as 'per_proponente' | 'shared')}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="per_proponente">Por proponente</SelectItem>
              <SelectItem value="shared">Partilhado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Switch checked={addObrigatorio} onCheckedChange={setAddObrigatorio} id="add-obrigatorio" />
            <Label htmlFor="add-obrigatorio" className="text-sm cursor-pointer">Obrigatório</Label>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addDoc}
            disabled={!addName.trim()}
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Adicionar
          </Button>
        </div>
      </div>
    </div>
  );
}

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
        <button
          type="button"
          onClick={onEdit}
          className="text-xs text-primary hover:underline"
        >
          Editar
        </button>
      </div>
      <div className="px-4 py-3 space-y-1.5 text-sm text-slate-700">{children}</div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-2">
      <span className="text-slate-400 w-40 shrink-0">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

const TIPO_LABEL: Record<string, string> = {
  habitacao: 'Crédito habitação',
  renegociacao: 'Renegociação',
  construcao: 'Construção',
  outro: 'Outro',
};

function Step5Resumo({
  data,
  onEditStep,
}: {
  data: FormData;
  onEditStep: (i: number) => void;
}) {
  return (
    <div className="space-y-4">
      <SummaryCard title="Processo" onEdit={() => onEditStep(0)}>
        <SummaryRow label="Tipo" value={TIPO_LABEL[data.tipo] ?? data.tipo} />
        <SummaryRow label="Finalidade" value={data.finalidade} />
        <SummaryRow label="Valor do imóvel" value={data.valor_imovel ? `€ ${Number(data.valor_imovel).toLocaleString('pt-PT')}` : undefined} />
        <SummaryRow label="Montante" value={data.montante ? `€ ${Number(data.montante).toLocaleString('pt-PT')}` : undefined} />
        <SummaryRow label="Prazo" value={data.prazo_anos ? `${data.prazo_anos} anos` : undefined} />
        <SummaryRow label="LTV" value={calcLtv(data.montante, data.valor_imovel)} />
        <SummaryRow label="Localização" value={data.localizacao} />
        <SummaryRow label="Observações" value={data.observacoes} />
      </SummaryCard>

      <SummaryCard title="Proponente 1" onEdit={() => onEditStep(1)}>
        <SummaryRow label="Nome" value={data.p1_name} />
        <SummaryRow label="Email" value={data.p1_email} />
        <SummaryRow label="Telefone" value={data.p1_phone} />
        <SummaryRow label="NIF" value={data.p1_nif} />
        <SummaryRow label="Profissão" value={data.p1_profissao} />
        <SummaryRow label="Entidade emp." value={data.p1_entidade_empregadora} />
        <SummaryRow label="Tipo contrato" value={data.p1_tipo_contrato} />
        <SummaryRow label="Rendimento" value={data.p1_rendimento ? `€ ${data.p1_rendimento}/mês` : undefined} />
      </SummaryCard>

      {data.has_p2 && (
        <SummaryCard title="Proponente 2" onEdit={() => onEditStep(1)}>
          <SummaryRow label="Nome" value={data.p2_name} />
          <SummaryRow label="Email" value={data.p2_email} />
          <SummaryRow label="Telefone" value={data.p2_phone} />
          <SummaryRow label="NIF" value={data.p2_nif} />
          <SummaryRow label="Profissão" value={data.p2_profissao} />
        </SummaryCard>
      )}

      <SummaryCard title="Documentos" onEdit={() => onEditStep(3)}>
        <ul className="space-y-1">
          {data.docs.filter((d) => d.enabled).map((d) => (
            <li key={d.rowId} className="flex items-center gap-2">
              <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              <span>{d.label}</span>
              {d.is_mandatory && <Lock className="h-3 w-3 text-slate-300" />}
            </li>
          ))}
        </ul>
      </SummaryCard>
    </div>
  );
}

// ─── Success Screen ────────────────────────────────────────────────────────────

function SuccessScreen({
  clientId,
  clientName,
  tipo,
  portalToken,
  onReset,
}: {
  clientId: string;
  clientName: string;
  tipo: string;
  portalToken: string | null;
  onReset: () => void;
}) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  const portalUrl = portalToken
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/portal/${portalToken}`
    : null;

  async function handleCopy() {
    if (!portalUrl) return;
    await navigator.clipboard.writeText(portalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  async function handleSendEmail() {
    setSendingEmail(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/send-portal-link`, { method: 'POST' });
      if (res.ok) {
        setEmailSent(true);
        setTimeout(() => setEmailSent(false), 3000);
      }
    } finally {
      setSendingEmail(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center bg-slate-50 px-6 py-12">
      {/* Animated checkmark */}
      <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-6 animate-[scale-in_0.3s_ease-out]">
        <Check className="h-10 w-10 text-emerald-600" strokeWidth={2.5} />
      </div>

      <h1 className="text-2xl font-bold text-slate-900 mb-2">Cliente criado com sucesso!</h1>
      <p className="text-slate-500 mb-8 text-center">
        <span className="font-medium text-slate-700">{clientName}</span>
        &nbsp;·&nbsp;{TIPO_LABEL[tipo] ?? tipo}
      </p>

      {/* Portal link */}
      {portalUrl && (
        <div className="w-full max-w-md mb-6 space-y-3">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
            <input
              readOnly
              value={portalUrl}
              className="flex-1 text-sm text-slate-600 bg-transparent outline-none truncate"
            />
            <button
              type="button"
              onClick={handleCopy}
              className="shrink-0 text-slate-400 hover:text-primary transition-colors"
              title="Copiar link"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>

          {/* Primary actions */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={handleCopy}
              variant="outline"
              className="w-full"
            >
              <Copy className="h-4 w-4 mr-2" />
              {copied ? 'Copiado!' : 'Copiar link'}
            </Button>
            <Button
              onClick={handleSendEmail}
              disabled={sendingEmail}
              className="w-full"
            >
              {sendingEmail ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />A enviar…</>
              ) : emailSent ? (
                <><Check className="h-4 w-4 mr-2" />Email enviado!</>
              ) : (
                <><Mail className="h-4 w-4 mr-2" />Enviar por email</>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Secondary actions */}
      <div className="flex flex-col items-center gap-3 w-full max-w-xs">
        <Button
          variant="default"
          className="w-full"
          onClick={() => router.push(`/dashboard/clients/${clientId}`)}
        >
          Ver ficha do cliente
        </Button>
        <Button
          variant="ghost"
          className="w-full text-slate-500"
          onClick={onReset}
        >
          Criar novo cliente
        </Button>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

interface NewClientStepperProps {
  brokerId: string;
  officeId: string;
  logoUrl?: string;
  officeName?: string;
}

export function NewClientStepper({ brokerId, officeId, logoUrl, officeName }: NewClientStepperProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<FormData>(emptyForm());
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<{
    clientId: string;
    portalToken: string | null;
  } | null>(null);

  const onChange = useCallback((patch: Partial<FormData>) => {
    setData((prev) => ({ ...prev, ...patch }));
  }, []);

  const completedSteps = STEPS.map((_, i) => isStepComplete(i, data));

  // ── Validation per step ────────────────────────────────────────────────────

  function validateStep(step: number): FieldErrors {
    const errs: FieldErrors = {};
    if (step === 0) {
      if (!data.tipo) errs.tipo = 'Selecione o tipo de processo';
    }
    if (step === 1) {
      if (!data.p1_name.trim()) errs.p1_name = 'Campo obrigatório';
      if (!data.p1_email.trim()) errs.p1_email = 'Campo obrigatório';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.p1_email.trim())) errs.p1_email = 'Email inválido';
    }
    if (step === 2) {
      if (!data.valor_imovel.trim()) errs.valor_imovel = 'Campo obrigatório';
      if (!data.montante.trim()) errs.montante = 'Campo obrigatório';
      if (!data.prazo_anos.trim()) errs.prazo_anos = 'Campo obrigatório';
      else {
        const p = Number(data.prazo_anos);
        if (p < 5 || p > 40) errs.prazo_anos = 'O prazo deve ser entre 5 e 40 anos';
      }
    }
    return errs;
  }

  // ── Navigation ─────────────────────────────────────────────────────────────

  function handleNext() {
    if (currentStep < STEPS.length - 1) {
      const errs = validateStep(currentStep);
      if (Object.keys(errs).length > 0) {
        setErrors(errs);
        return;
      }
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

  function handleCancel() {
    router.push('/dashboard/clients');
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          broker_id: brokerId,
          office_id: officeId,
          p1_name: data.p1_name,
          p1_nif: data.p1_nif || null,
          p1_email: data.p1_email || null,
          p1_phone: data.p1_phone || null,
          p1_employment_type: data.p1_tipo_contrato || null,
          p1_birth_date: data.p1_birth_date || null,
          p2_name: data.has_p2 ? data.p2_name || null : null,
          p2_nif: data.has_p2 ? data.p2_nif || null : null,
          p2_email: data.has_p2 ? data.p2_email || null : null,
          p2_phone: data.has_p2 ? data.p2_phone || null : null,
          p2_employment_type: data.has_p2 ? data.p2_tipo_contrato || null : null,
          p2_birth_date: data.has_p2 ? data.p2_birth_date || null : null,
          mortgage_type: TIPO_TO_MORTGAGE[data.tipo] ?? null,
          property_value: data.valor_imovel ? Number(data.valor_imovel) : null,
          loan_amount: data.montante ? Number(data.montante) : null,
          term_months: data.prazo_anos ? Number(data.prazo_anos) * 12 : null,
          property_address: data.localizacao || null,
          notes_general: data.observacoes || null,
          enabled_extra_docs: data.docs
            .filter((d) => d.enabled && !d.is_mandatory && d.is_custom === false)
            .map((d) => d.doc_type),
        }),
      });

      if (!res.ok) {
        const json = await res.json() as { error?: string };
        setErrors({ _form: json.error ?? 'Erro ao criar cliente' });
        return;
      }

      const json = await res.json() as { id: string; portal_token?: string };
      setSuccessData({
        clientId: json.id,
        portalToken: json.portal_token ?? null,
      });
    } catch {
      setErrors({ _form: 'Erro de rede. Tente novamente.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Success screen ──────────────────────────────────────────────────────────

  if (successData) {
    return (
      <SuccessScreen
        clientId={successData.clientId}
        clientName={data.p1_name}
        tipo={data.tipo}
        portalToken={successData.portalToken}
        onReset={() => {
          setData(emptyForm());
          setCurrentStep(0);
          setSuccessData(null);
          setErrors({});
        }}
      />
    );
  }

  // ── Step titles & descriptions ─────────────────────────────────────────────

  const STEP_META = [
    { title: 'Tipo de processo',     desc: 'Que tipo de crédito vamos tratar?' },
    { title: 'Proponentes',          desc: 'Quem são os titulares do crédito?' },
    { title: 'Dados do processo',    desc: 'Detalhes financeiros do pedido' },
    { title: 'Documentos',           desc: 'Quais os documentos necessários para este processo?' },
    { title: 'Resumo & confirmação', desc: 'Verifique os dados antes de criar o cliente.' },
  ];

  const meta = STEP_META[currentStep]!;

  return (
    <VerticalStepper
      steps={STEPS}
      currentStep={currentStep}
      completedSteps={completedSteps}
      onStepClick={handleStepClick}
      onNext={handleNext}
      onPrev={handlePrev}
      onCancel={handleCancel}
      isLastStep={currentStep === STEPS.length - 1}
      isSubmitting={isSubmitting}
      nextLabel="Criar cliente"
      stepTitle={meta.title}
      stepDescription={meta.desc}
      logoUrl={logoUrl}
      officeName={officeName}
    >
      {/* Form errors */}
      {errors._form && (
        <div className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errors._form}
        </div>
      )}

      {currentStep === 0 && (
        <Step1Tipo data={data} onChange={onChange} errors={errors} />
      )}
      {currentStep === 1 && (
        <Step2Proponentes data={data} onChange={onChange} errors={errors} />
      )}
      {currentStep === 2 && (
        <Step3Processo data={data} onChange={onChange} errors={errors} />
      )}
      {currentStep === 3 && (
        <Step4Documentos data={data} onChange={onChange} />
      )}
      {currentStep === 4 && (
        <Step5Resumo data={data} onEditStep={handleStepClick} />
      )}
    </VerticalStepper>
  );
}
