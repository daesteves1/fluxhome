'use client';

import { useState, useRef, useEffect } from 'react';
import { useForm, Controller, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Turnstile } from '@marsidev/react-turnstile';
import {
  Home,
  Building2,
  RefreshCw,
  ArrowLeftRight,
  CheckCircle2,
  Check,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { calcLTV, calcMensalidade } from '@/lib/credit';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  officeId: string;
  officeName: string;
  turnstileSiteKey: string | null;
  accent: string;
  safe: string;
  ctaLabel: string;
  websiteUrl: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  // Step 1
  tipo_operacao: z.enum(['aquisicao', 'construcao', 'refinanciamento', 'transferencia']),
  valor_imovel: z.string().min(1, 'Introduza o valor do imóvel'),
  montante_pretendido: z.string().min(1, 'Introduza o montante'),
  prazo: z.string().min(1, 'Selecione o prazo'),
  // Step 2
  num_proponentes: z.enum(['1', '2']),
  rendimento_mensal: z.string().min(1, 'Introduza o rendimento'),
  imovel_escolhido: z.enum(['sim', 'nao']).optional(),
  vender_imovel_atual: z.enum(['sim', 'nao']).optional(),
  // Step 3
  nome_proprio: z.string().min(1, 'Nome obrigatório'),
  apelido: z.string().min(1, 'Apelido obrigatório'),
  email: z.string().email('Email inválido'),
  telefone_prefix: z.string().default('+351'),
  telefone: z.string().min(9, 'Telefone obrigatório'),
  horario_preferencial: z.enum(['manha', 'tarde', 'qualquer']).optional(),
  observacoes: z.string().optional(),
  consent_rgpd: z.boolean().refine((v) => v === true, 'Deve aceitar para continuar'),
  consent_marketing: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

const STEP_FIELDS: (keyof FormValues)[][] = [
  ['tipo_operacao', 'valor_imovel', 'montante_pretendido', 'prazo'],
  ['num_proponentes', 'rendimento_mensal'],
];

const STEP_TITLES = [
  'O seu projeto',
  'A sua situação',
  'Os seus contactos',
];

const STEP_LABELS = [
  'Passo 1 de 3 · O seu projeto',
  'Passo 2 de 3 · A sua situação',
  'Passo 3 de 3 · Os seus contactos',
];

const TAXA = 3.75;

const TIPO_OPTIONS = [
  { value: 'aquisicao', Icon: Home, label: 'Aquisição', desc: 'Comprar habitação própria' },
  { value: 'construcao', Icon: Building2, label: 'Construção', desc: 'Construir imóvel próprio' },
  { value: 'refinanciamento', Icon: RefreshCw, label: 'Refinanciamento', desc: 'Renegociar condições' },
  { value: 'transferencia', Icon: ArrowLeftRight, label: 'Transferência', desc: 'Mudar de banco' },
] as const;

const PRAZO_OPTIONS = [10, 15, 20, 25, 30, 35, 40];

const PREFIX_OPTIONS = ['+351', '+34', '+44', '+33', '+49', '+55', '+1'];

const HORARIO_OPTIONS = [
  { value: 'manha', label: 'Manhã (9h–13h)' },
  { value: 'tarde', label: 'Tarde (14h–18h)' },
  { value: 'qualquer', label: 'Qualquer hora' },
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseNum(val: string): number {
  return parseFloat(val.replace(/\s/g, '').replace(',', '.')) || 0;
}

function fmtEur(n: number): string {
  return new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(n));
}

function LtvChip({ ltv }: { ltv: number }) {
  let cls = 'bg-green-100 text-green-700';
  if (ltv > 90) cls = 'bg-red-100 text-red-700';
  else if (ltv > 80) cls = 'bg-amber-100 text-amber-700';
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {ltv <= 80 ? 'Bom' : ltv <= 90 ? 'Moderado' : 'Alto'}
    </span>
  );
}

function DstiChip({ dsti }: { dsti: number }) {
  let cls = 'bg-green-100 text-green-700';
  if (dsti > 50) cls = 'bg-red-100 text-red-700';
  else if (dsti >= 35) cls = 'bg-amber-100 text-amber-700';
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {dsti < 35 ? 'Favorável' : dsti <= 50 ? 'Moderado' : 'Elevado'}
    </span>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LeadCaptureForm({
  officeId,
  officeName,
  turnstileSiteKey,
  accent,
  safe,
  ctaLabel,
  websiteUrl,
  utmSource,
  utmMedium,
  utmCampaign,
}: Props) {
  const STORAGE_KEY = `lead_form_${officeId}`;

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [success, setSuccess] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const focusRef = useRef<HTMLInputElement | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    trigger,
    formState: { errors },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<FormValues, any, FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      tipo_operacao: 'aquisicao',
      valor_imovel: '',
      montante_pretendido: '',
      prazo: '30',
      num_proponentes: '1',
      rendimento_mensal: '',
      nome_proprio: '',
      apelido: '',
      email: '',
      telefone_prefix: '+351',
      telefone: '',
      consent_rgpd: false,
      consent_marketing: false,
    },
  });

  // Restore from sessionStorage on mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<FormValues>;
        (Object.keys(parsed) as (keyof FormValues)[]).forEach((key) => {
          const val = parsed[key];
          if (val !== undefined) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setValue(key, val as any);
          }
        });
      }
    } catch {
      // ignore
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist to sessionStorage on change
  const watchedValues = watch();
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(watchedValues));
    } catch {
      // ignore
    }
  }, [watchedValues, STORAGE_KEY]);

  // Auto-focus first input on step change
  useEffect(() => {
    if (focusRef.current) {
      focusRef.current.focus();
    }
  }, [step]);

  // Derived values
  const valorImovelNum = parseNum(watchedValues.valor_imovel ?? '');
  const montanteNum = parseNum(watchedValues.montante_pretendido ?? '');
  const prazoNum = parseInt(watchedValues.prazo ?? '0') || 0;
  const rendimentoNum = parseNum(watchedValues.rendimento_mensal ?? '');

  const ltv = valorImovelNum > 0 && montanteNum > 0 ? calcLTV(montanteNum, valorImovelNum) : 0;
  const prestacao = montanteNum > 0 && prazoNum > 0 ? calcMensalidade(montanteNum, prazoNum * 12, TAXA) : 0;
  const dsti = prestacao > 0 && rendimentoNum > 0 ? (prestacao / rendimentoNum) * 100 : 0;

  const showDerivedPanel = montanteNum > 0 && valorImovelNum > 0 && ltv > 0;
  const showDstiPanel = rendimentoNum > 0 && prestacao > 0;

  async function goNext() {
    const fieldsToValidate = STEP_FIELDS[step];
    const ok = await trigger(fieldsToValidate);
    if (ok) setStep((s) => s + 1);
  }

  function goPrev() {
    setStep((s) => s - 1);
  }

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    setSubmitting(true);
    setSubmitError('');

    if (turnstileSiteKey && !turnstileToken) {
      setSubmitError('Por favor aguarde a verificação de segurança.');
      setSubmitting(false);
      return;
    }

    try {
      const payload = {
        office_id: officeId,
        p1_nome: `${values.nome_proprio} ${values.apelido}`,
        p1_email: values.email,
        p1_telefone: `${values.telefone_prefix}${values.telefone}`,
        tipo_operacao: values.tipo_operacao,
        valor_imovel: valorImovelNum || null,
        montante_pretendido: montanteNum || null,
        prazo_pretendido: prazoNum || null,
        horario_preferencial: values.horario_preferencial ?? null,
        mensagem: values.observacoes || null,
        turnstile_token: turnstileToken ?? null,
        utm_source: utmSource ?? null,
        utm_medium: utmMedium ?? null,
        utm_campaign: utmCampaign ?? null,
        // New fields
        rendimento_mensal: rendimentoNum || null,
        num_proponentes: parseInt(values.num_proponentes) || 1,
        imovel_escolhido: values.imovel_escolhido === 'sim' ? true : values.imovel_escolhido === 'nao' ? false : null,
        vender_imovel_atual: values.vender_imovel_atual === 'sim' ? true : values.vender_imovel_atual === 'nao' ? false : null,
        consent_marketing: values.consent_marketing ?? false,
        nome_proprio: values.nome_proprio,
        apelido: values.apelido,
      };

      const res = await fetch('/api/public/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? 'Erro ao enviar pedido');
      }

      // Clear sessionStorage
      try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
      setSuccess(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success state ────────────────────────────────────────────────────────────

  if (success) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-8 md:p-10 text-center space-y-4 py-8">
        <CheckCircle2 className="h-14 w-14 mx-auto" style={{ color: safe }} />
        <h2 className="text-2xl font-semibold text-neutral-900">
          Obrigado, {watchedValues.nome_proprio}!
        </h2>
        <p className="text-neutral-500">
          {officeName} entrará em contacto dentro de 24 horas úteis no horário que indicou.
        </p>
        {websiteUrl && (
          <a
            href={websiteUrl}
            className="text-sm font-medium hover:underline"
            style={{ color: safe }}
          >
            ← Voltar a {officeName}
          </a>
        )}
      </div>
    );
  }

  // ── Progress ─────────────────────────────────────────────────────────────────

  const progressPct = ((step + 1) / 3) * 100;

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
      {/* Progress bar */}
      <div className="h-1 bg-slate-100">
        <div
          className="h-full transition-all duration-300"
          style={{ width: `${progressPct}%`, backgroundColor: accent }}
        />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="p-8 md:p-10">
          {/* Step label */}
          <p className="text-sm text-neutral-400 mb-1">{STEP_LABELS[step]}</p>
          {step === 0 && (
            <p className="text-xs text-neutral-400 mb-4">Leva cerca de 2 minutos</p>
          )}

          {/* Step heading */}
          <h2 className="text-xl font-semibold text-neutral-900 mb-6">{STEP_TITLES[step]}</h2>

          {/* ── STEP 0 ────────────────────────────────────────────────────── */}
          {step === 0 && (
            <div className="space-y-6">
              {/* tipo_operacao */}
              <div className="space-y-2">
                <Label>Tipo de operação</Label>
                <div className="grid grid-cols-2 gap-3">
                  {TIPO_OPTIONS.map(({ value, Icon, label, desc }) => {
                    const selected = watchedValues.tipo_operacao === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setValue('tipo_operacao', value)}
                        className="relative rounded-xl border-2 p-4 cursor-pointer transition-all text-left min-h-[44px] bg-white"
                        style={selected
                          ? { borderColor: safe }
                          : { borderColor: '#e2e8f0' }
                        }
                      >
                        {selected && (
                          <Check className="absolute top-2 right-2 h-3.5 w-3.5" style={{ color: safe }} />
                        )}
                        <Icon className="h-5 w-5 mb-2 text-neutral-700" />
                        <p className="font-medium text-sm text-neutral-800">{label}</p>
                        <p className="text-xs text-neutral-400 mt-0.5">{desc}</p>
                      </button>
                    );
                  })}
                </div>
                {errors.tipo_operacao && (
                  <p className="text-red-600 text-sm">{errors.tipo_operacao.message}</p>
                )}
              </div>

              {/* valor_imovel */}
              <div className="space-y-1.5">
                <Label htmlFor="valor_imovel">Valor do imóvel</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm pointer-events-none">€</span>
                  {(() => {
                    const { ref, ...rest } = register('valor_imovel');
                    return (
                      <Input
                        id="valor_imovel"
                        className="pl-7 h-12"
                        placeholder="250 000"
                        inputMode="numeric"
                        style={{ outlineColor: safe }}
                        ref={(el) => { focusRef.current = el; ref(el); }}
                        {...rest}
                      />
                    );
                  })()}
                </div>
                {errors.valor_imovel && (
                  <p className="text-red-600 text-sm">{errors.valor_imovel.message}</p>
                )}
              </div>

              {/* montante_pretendido */}
              <div className="space-y-1.5">
                <Label htmlFor="montante_pretendido">Montante pretendido</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm pointer-events-none">€</span>
                  <Input
                    id="montante_pretendido"
                    className="pl-7 h-12"
                    placeholder="200 000"
                    inputMode="numeric"
                    style={{ outlineColor: safe }}
                    {...register('montante_pretendido')}
                  />
                </div>
                {errors.montante_pretendido && (
                  <p className="text-red-600 text-sm">{errors.montante_pretendido.message}</p>
                )}
              </div>

              {/* prazo */}
              <div className="space-y-2">
                <Label>Prazo</Label>
                <div className="flex flex-wrap gap-2">
                  {PRAZO_OPTIONS.map((p) => {
                    const selected = watchedValues.prazo === String(p);
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setValue('prazo', String(p))}
                        className="px-4 py-2 rounded-xl text-sm transition-all min-h-[44px] bg-white"
                        style={selected
                          ? { border: `2px solid ${safe}`, color: '#171717', fontWeight: 600 }
                          : { border: '1px solid #e2e8f0', color: '#525252' }
                        }
                      >
                        {p} anos
                      </button>
                    );
                  })}
                </div>
                {errors.prazo && (
                  <p className="text-red-600 text-sm">{errors.prazo.message}</p>
                )}
              </div>

              {/* Derived panel */}
              {showDerivedPanel && (
                <div className="rounded-xl bg-neutral-50 p-4 mt-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-neutral-500">LTV</span>
                    <div className="flex items-center gap-2">
                      <span className="tabular-nums font-semibold text-neutral-900">{ltv.toFixed(1)}%</span>
                      <LtvChip ltv={ltv} />
                    </div>
                  </div>
                  {prestacao > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-neutral-500">Prestação estimada</span>
                      <span className="tabular-nums font-semibold text-neutral-900">€ {fmtEur(prestacao)}/mês</span>
                    </div>
                  )}
                  <p className="text-xs text-neutral-400">Estimativa com Euribor 6M + spread médio 1,1%</p>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 1 ────────────────────────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-6">
              {/* num_proponentes */}
              <div className="space-y-2">
                <Label>Número de proponentes</Label>
                <div className="flex gap-3">
                  {(['1', '2'] as const).map((v) => {
                    const selected = watchedValues.num_proponentes === v;
                    return (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setValue('num_proponentes', v)}
                        className="relative flex-1 rounded-xl border-2 p-4 transition-all text-sm font-medium min-h-[44px] bg-white"
                        style={selected
                          ? { borderColor: safe, color: '#171717' }
                          : { borderColor: '#e2e8f0', color: '#525252' }
                        }
                      >
                        {selected && (
                          <Check className="absolute top-2 right-2 h-3.5 w-3.5" style={{ color: safe }} />
                        )}
                        {v} {v === '1' ? 'proponente' : 'proponentes'}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* rendimento_mensal */}
              <div className="space-y-1.5">
                <Label htmlFor="rendimento_mensal">Rendimento líquido mensal do agregado</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm pointer-events-none">€</span>
                  {(() => {
                    const { ref, ...rest } = register('rendimento_mensal');
                    return (
                      <Input
                        id="rendimento_mensal"
                        className="pl-7 h-12"
                        placeholder="2 500"
                        inputMode="numeric"
                        style={{ outlineColor: safe }}
                        ref={(el) => { focusRef.current = el; ref(el); }}
                        {...rest}
                      />
                    );
                  })()}
                </div>
                {errors.rendimento_mensal && (
                  <p className="text-red-600 text-sm">{errors.rendimento_mensal.message}</p>
                )}
              </div>

              {/* imovel_escolhido — only for aquisicao */}
              {watchedValues.tipo_operacao === 'aquisicao' && (
                <div className="space-y-2">
                  <Label>Já tem imóvel escolhido?</Label>
                  <div className="flex gap-3">
                    {(['sim', 'nao'] as const).map((v) => {
                      const selected = watchedValues.imovel_escolhido === v;
                      return (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setValue('imovel_escolhido', v)}
                          className="relative flex-1 rounded-xl border-2 p-3 text-sm font-medium transition-all min-h-[44px] bg-white"
                          style={selected
                            ? { borderColor: safe, color: '#171717' }
                            : { borderColor: '#e2e8f0', color: '#525252' }
                          }
                        >
                          {selected && (
                            <Check className="absolute top-2 right-2 h-3.5 w-3.5" style={{ color: safe }} />
                          )}
                          {v === 'sim' ? 'Sim' : 'Não'}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* vender_imovel_atual */}
              <div className="space-y-2">
                <Label>Pensa vender imóvel atual?</Label>
                <div className="flex gap-3">
                  {(['sim', 'nao'] as const).map((v) => {
                    const selected = watchedValues.vender_imovel_atual === v;
                    return (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setValue('vender_imovel_atual', v)}
                        className="relative flex-1 rounded-xl border-2 p-3 text-sm font-medium transition-all min-h-[44px] bg-white"
                        style={selected
                          ? { borderColor: safe, color: '#171717' }
                          : { borderColor: '#e2e8f0', color: '#525252' }
                        }
                      >
                        {selected && (
                          <Check className="absolute top-2 right-2 h-3.5 w-3.5" style={{ color: safe }} />
                        )}
                        {v === 'sim' ? 'Sim' : 'Não'}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* DSTI panel */}
              {showDstiPanel && (
                <div className="rounded-xl bg-neutral-50 p-4 mt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-neutral-500">Taxa de esforço estimada</span>
                    <div className="flex gap-2 items-center">
                      <span className="tabular-nums font-semibold text-neutral-900">{dsti.toFixed(1)}%</span>
                      <DstiChip dsti={dsti} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 2 ────────────────────────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-5">
              {/* nome_proprio + apelido */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="nome_proprio">Nome próprio</Label>
                  {(() => {
                    const { ref, ...rest } = register('nome_proprio');
                    return (
                      <Input
                        id="nome_proprio"
                        className="h-12"
                        placeholder="João"
                        style={{ outlineColor: safe }}
                        ref={(el) => { focusRef.current = el; ref(el); }}
                        {...rest}
                      />
                    );
                  })()}
                  {errors.nome_proprio && (
                    <p className="text-red-600 text-sm">{errors.nome_proprio.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="apelido">Apelido</Label>
                  <Input
                    id="apelido"
                    className="h-12"
                    placeholder="Silva"
                    style={{ outlineColor: safe }}
                    {...register('apelido')}
                  />
                  {errors.apelido && (
                    <p className="text-red-600 text-sm">{errors.apelido.message}</p>
                  )}
                </div>
              </div>

              {/* email */}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  className="h-12"
                  placeholder="joao@exemplo.com"
                  style={{ outlineColor: safe }}
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-red-600 text-sm">{errors.email.message}</p>
                )}
              </div>

              {/* telefone */}
              <div className="space-y-1.5">
                <Label>Telefone</Label>
                <div className="flex gap-2">
                  <Controller
                    name="telefone_prefix"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="w-[90px] h-12 rounded-xl shrink-0" style={{ outlineColor: safe }}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PREFIX_OPTIONS.map((p) => (
                            <SelectItem key={p} value={p}>{p}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <Input
                    className="h-12 flex-1"
                    placeholder="912 345 678"
                    inputMode="tel"
                    style={{ outlineColor: safe }}
                    {...register('telefone')}
                  />
                </div>
                {errors.telefone && (
                  <p className="text-red-600 text-sm">{errors.telefone.message}</p>
                )}
              </div>

              {/* horario_preferencial */}
              <div className="space-y-2">
                <Label>Horário preferencial de contacto</Label>
                <div className="flex flex-wrap gap-2">
                  {HORARIO_OPTIONS.map(({ value, label }) => {
                    const selected = watchedValues.horario_preferencial === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setValue('horario_preferencial', value)}
                        className="px-4 py-2 rounded-xl text-sm transition-all min-h-[44px] bg-white"
                        style={selected
                          ? { border: `2px solid ${safe}`, color: '#171717', fontWeight: 600 }
                          : { border: '1px solid #e2e8f0', color: '#525252' }
                        }
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* observacoes */}
              <div className="space-y-1.5">
                <Label htmlFor="observacoes">Observações (opcional)</Label>
                <Textarea
                  id="observacoes"
                  rows={3}
                  placeholder="Informações adicionais que considere relevantes..."
                  style={{ outlineColor: safe }}
                  {...register('observacoes')}
                />
              </div>

              {/* consent_rgpd */}
              <div className="space-y-2 pt-1">
                <div className="flex items-start gap-3">
                  <Controller
                    name="consent_rgpd"
                    control={control}
                    render={({ field }) => (
                      <Checkbox
                        id="consent_rgpd"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="mt-0.5"
                        style={{ accentColor: safe }}
                      />
                    )}
                  />
                  <Label htmlFor="consent_rgpd" className="text-sm text-neutral-600 cursor-pointer leading-snug">
                    Li e aceito a{' '}
                    <a
                      href="/privacy"
                      target="_blank"
                      rel="noreferrer"
                      className="underline"
                      style={{ color: safe }}
                    >
                      Política de Privacidade
                    </a>{' '}
                    e os Termos e Condições
                  </Label>
                </div>
                {errors.consent_rgpd && (
                  <p className="text-red-600 text-sm">{errors.consent_rgpd.message}</p>
                )}
              </div>

              {/* consent_marketing */}
              <div className="flex items-start gap-3">
                <Controller
                  name="consent_marketing"
                  control={control}
                  render={({ field }) => (
                    <Checkbox
                      id="consent_marketing"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="mt-0.5"
                      style={{ accentColor: safe }}
                    />
                  )}
                />
                <Label htmlFor="consent_marketing" className="text-sm text-neutral-600 cursor-pointer leading-snug">
                  Aceito receber comunicações sobre produtos e serviços (opcional)
                </Label>
              </div>

              {/* Turnstile */}
              {turnstileSiteKey && (
                <div className="pt-1">
                  <Turnstile
                    siteKey={turnstileSiteKey}
                    onSuccess={(token) => setTurnstileToken(token)}
                  />
                </div>
              )}

              {/* Reassurance */}
              <p className="text-xs text-center text-neutral-400">
                Sem custos. Sem compromisso. Entramos em contacto dentro de 24 horas úteis.
              </p>

              {/* Error display */}
              {submitError && (
                <p className="text-red-600 text-sm text-center" aria-live="polite">
                  {submitError}
                </p>
              )}
            </div>
          )}

          {/* ── Navigation ────────────────────────────────────────────────── */}
          <div className={`mt-8 flex ${step === 0 ? 'justify-end' : 'justify-between'} items-center`}>
            {step > 0 && (
              <button
                type="button"
                onClick={goPrev}
                className="text-sm text-neutral-500 hover:text-neutral-700 transition-colors min-h-[44px] px-2"
              >
                ← Anterior
              </button>
            )}

            {step < 2 && (
              <button
                type="button"
                onClick={goNext}
                className="h-12 px-6 rounded-xl font-semibold text-sm text-white transition-opacity hover:opacity-90 min-h-[44px]"
                style={{ backgroundColor: safe }}
              >
                Seguinte →
              </button>
            )}

            {step === 2 && (
              <button
                type="submit"
                disabled={submitting}
                className="h-12 flex-1 ml-4 rounded-xl font-semibold text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-60 min-h-[44px]"
                style={{ backgroundColor: safe }}
              >
                {submitting ? 'A enviar...' : ctaLabel}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
