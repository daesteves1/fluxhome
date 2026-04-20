'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { isValidNIF } from '@/lib/utils';

// ─── Zod schema ────────────────────────────────────────────────────────────────

function nifField() {
  return z
    .string()
    .optional()
    .nullable()
    .refine((v) => !v || !v.trim() || isValidNIF(v.trim()), { message: 'NIF inválido' });
}
function emailField() {
  return z
    .string()
    .optional()
    .nullable()
    .refine((v) => !v || !v.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()), {
      message: 'Email inválido',
    });
}

const schema = z.object({
  p1_name: z.string().min(1, 'Nome obrigatório'),
  p1_nif: nifField(),
  p1_email: emailField(),
  p1_phone: z.string().optional().nullable(),
  p1_birth_date: z.string().optional().nullable(),
  p1_employment_type: z.string().optional().nullable(),
  has_p2: z.boolean(),
  p2_name: z.string().optional().nullable(),
  p2_nif: nifField(),
  p2_email: emailField(),
  p2_phone: z.string().optional().nullable(),
  p2_birth_date: z.string().optional().nullable(),
  p2_employment_type: z.string().optional().nullable(),
});

type FormValues = z.infer<typeof schema>;

// ─── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  brokerId: string;
  officeId: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const EMPLOYMENT_TYPES = [
  { value: 'employed',      label: 'Trabalhador por conta de outrem' },
  { value: 'self_employed', label: 'Trabalhador independente' },
  { value: 'retired',       label: 'Reformado/a' },
  { value: 'unemployed',    label: 'Desempregado/a' },
  { value: 'student',       label: 'Estudante' },
  { value: 'other',         label: 'Outro' },
] as const;

const MOBILE_SECTIONS = [
  { label: 'Proponente 1', subtitle: 'Dados de identificação' },
  { label: 'Proponente 2', subtitle: 'Titular adicional (opcional)' },
];

// ─── Component ─────────────────────────────────────────────────────────────────

export function NewClientForm({ brokerId, officeId }: Props) {
  const router = useRouter();
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [createdName, setCreatedName] = useState('');
  const [mobileStep, setMobileStep] = useState(0);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { isSubmitting, errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { has_p2: false },
  });

  const hasP2 = watch('has_p2');

  async function onSubmit(values: FormValues) {
    const res = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        broker_id: brokerId,
        office_id: officeId,
        p1_name: values.p1_name,
        p1_nif: values.p1_nif || null,
        p1_email: values.p1_email || null,
        p1_phone: values.p1_phone || null,
        p1_birth_date: values.p1_birth_date || null,
        p1_employment_type: values.p1_employment_type || null,
        p2_name: values.has_p2 ? values.p2_name || null : null,
        p2_nif: values.has_p2 ? values.p2_nif || null : null,
        p2_email: values.has_p2 ? values.p2_email || null : null,
        p2_phone: values.has_p2 ? values.p2_phone || null : null,
        p2_birth_date: values.has_p2 ? values.p2_birth_date || null : null,
        p2_employment_type: values.has_p2 ? values.p2_employment_type || null : null,
      }),
    });

    if (!res.ok) {
      const body = await res.json() as { error?: string };
      toast.error(body.error ?? 'Erro ao criar cliente');
      return;
    }

    const { id, name } = await res.json() as { id: string; name: string };
    setCreatedId(id);
    setCreatedName(name ?? values.p1_name);
  }

  // ── Success screen ──────────────────────────────────────────────────────────
  if (createdId) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <UserPlus className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <p className="font-semibold text-slate-900 text-lg">{createdName}</p>
            <p className="text-sm text-slate-500 mt-1">Cliente criado com sucesso.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => router.push(`/dashboard/clients/${createdId}`)}
            >
              Ver ficha do cliente
            </Button>
            <Button
              className="flex-1"
              onClick={() => router.push(`/dashboard/processes/new?client_id=${createdId}`)}
            >
              Criar processo
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const isLastMobileStep = mobileStep === MOBILE_SECTIONS.length - 1;
  const section = MOBILE_SECTIONS[mobileStep]!;

  // ── Form ────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-xl font-bold text-slate-900">Novo cliente</h1>
        {/* Mobile: show current section name + progress */}
        <div className="sm:hidden mt-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-slate-700">{section.label}</span>
            <span className="text-slate-400 text-xs">{mobileStep + 1} / {MOBILE_SECTIONS.length}</span>
          </div>
          <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${((mobileStep + 1) / MOBILE_SECTIONS.length) * 100}%` }}
            />
          </div>
        </div>
        {/* Desktop: static subtitle */}
        <p className="hidden sm:block text-sm text-slate-500 mt-0.5">
          Preencha os dados de identificação do cliente
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Section 0 — P1 */}
        <div className={cn(
          'bg-white rounded-xl border border-slate-200 p-5 space-y-4',
          mobileStep === 0 ? 'block' : 'hidden',
          'sm:block',
        )}>
          <p className="text-sm font-semibold text-slate-700">Proponente 1</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="p1_name">Nome *</Label>
              <Input id="p1_name" {...register('p1_name')} placeholder="Nome completo" />
              {errors.p1_name && <p className="text-xs text-destructive">{errors.p1_name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p1_nif">NIF</Label>
              <Input id="p1_nif" {...register('p1_nif')} placeholder="ex: 123456789" />
              {errors.p1_nif && <p className="text-xs text-destructive">{errors.p1_nif.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p1_email">Email</Label>
              <Input id="p1_email" type="email" {...register('p1_email')} placeholder="email@exemplo.pt" />
              {errors.p1_email && <p className="text-xs text-destructive">{errors.p1_email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p1_phone">Telefone</Label>
              <Input id="p1_phone" {...register('p1_phone')} placeholder="9xx xxx xxx" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p1_birth_date">Data de nascimento</Label>
              <Input id="p1_birth_date" type="date" {...register('p1_birth_date')} />
            </div>
            <div className="space-y-1.5">
              <Label>Situação profissional</Label>
              <Select onValueChange={(v) => setValue('p1_employment_type', v)}>
                <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent>
                  {EMPLOYMENT_TYPES.map((et) => (
                    <SelectItem key={et.value} value={et.value}>{et.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Section 1 — P2 */}
        <div className={cn(
          'bg-white rounded-xl border border-slate-200 p-5 space-y-4',
          mobileStep === 1 ? 'block' : 'hidden',
          'sm:block',
        )}>
          <div className="flex items-center gap-3">
            <Switch checked={hasP2} onCheckedChange={(v) => setValue('has_p2', v)} />
            <Label className="cursor-pointer">{hasP2 ? 'Remover 2.º proponente' : 'Adicionar 2.º proponente'}</Label>
          </div>

          {hasP2 && (
            <>
              <Separator />
              <p className="text-sm font-semibold text-slate-700">Proponente 2</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="p2_name">Nome</Label>
                  <Input id="p2_name" {...register('p2_name')} placeholder="Nome completo" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="p2_nif">NIF</Label>
                  <Input id="p2_nif" {...register('p2_nif')} placeholder="ex: 123456789" />
                  {errors.p2_nif && <p className="text-xs text-destructive">{errors.p2_nif.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="p2_email">Email</Label>
                  <Input id="p2_email" type="email" {...register('p2_email')} placeholder="email@exemplo.pt" />
                  {errors.p2_email && <p className="text-xs text-destructive">{errors.p2_email.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="p2_phone">Telefone</Label>
                  <Input id="p2_phone" {...register('p2_phone')} placeholder="9xx xxx xxx" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="p2_birth_date">Data de nascimento</Label>
                  <Input id="p2_birth_date" type="date" {...register('p2_birth_date')} />
                </div>
                <div className="space-y-1.5">
                  <Label>Situação profissional</Label>
                  <Select onValueChange={(v) => setValue('p2_employment_type', v)}>
                    <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                    <SelectContent>
                      {EMPLOYMENT_TYPES.map((et) => (
                        <SelectItem key={et.value} value={et.value}>{et.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Mobile footer — stepped nav */}
        <div className="sm:hidden flex items-center justify-between">
          {mobileStep > 0 ? (
            <button
              type="button"
              onClick={() => setMobileStep((s) => s - 1)}
              className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              ← Anterior
            </button>
          ) : (
            <button
              type="button"
              onClick={() => router.back()}
              className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              ← Voltar
            </button>
          )}
          {isLastMobileStep ? (
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'A criar...' : 'Criar cliente'}
            </Button>
          ) : (
            <Button type="button" onClick={() => setMobileStep((s) => s + 1)}>
              Seguinte →
            </Button>
          )}
        </div>

        {/* Desktop footer */}
        <div className="hidden sm:flex items-center justify-between pb-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            ← Voltar
          </button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'A criar...' : 'Criar cliente'}
          </Button>
        </div>
      </form>
    </div>
  );
}

export { NewClientForm as NewClientStepper };
