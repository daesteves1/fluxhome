'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { isValidNIF } from '@/lib/utils';

function nifField() {
  return z.string().optional().nullable().refine(
    (v) => !v || !v.trim() || isValidNIF(v.trim()),
    { message: 'NIF inválido' }
  );
}
function emailField() {
  return z.string().optional().nullable().refine(
    (v) => !v || !v.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()),
    { message: 'Email inválido' }
  );
}

const editSchema = z.object({
  p1_name: z.string().min(1),
  p1_nif: nifField(),
  p1_email: emailField(),
  p1_phone: z.string().optional().nullable(),
  p1_employment_type: z.string().optional().nullable(),
  p1_birth_date: z.string().optional().nullable(),
  has_p2: z.boolean(),
  p2_name: z.string().optional().nullable(),
  p2_nif: nifField(),
  p2_email: emailField(),
  p2_phone: z.string().optional().nullable(),
  p2_employment_type: z.string().optional().nullable(),
  p2_birth_date: z.string().optional().nullable(),
  mortgage_type: z.string().optional().nullable(),
  property_value: z.string().optional().nullable(),
  loan_amount: z.string().optional().nullable(),
  term_months: z.string().optional().nullable(),
  property_address: z.string().optional().nullable(),
  notes_general: z.string().optional().nullable(),
});

type EditValues = z.infer<typeof editSchema>;

interface ClientData {
  id: string;
  p1_name: string;
  p1_nif?: string | null;
  p1_email?: string | null;
  p1_phone?: string | null;
  p1_employment_type?: string | null;
  p1_birth_date?: string | null;
  p2_name?: string | null;
  p2_nif?: string | null;
  p2_email?: string | null;
  p2_phone?: string | null;
  p2_employment_type?: string | null;
  p2_birth_date?: string | null;
  mortgage_type?: string | null;
  property_value?: number | null;
  loan_amount?: number | null;
  term_months?: number | null;
  property_address?: string | null;
  notes_general?: string | null;
}

interface Props {
  client: ClientData;
  iconOnly?: boolean;
  customTrigger?: React.ReactNode;
}

export function EditClientDialog({ client, iconOnly, customTrigger }: Props) {
  const t = useTranslations('clients');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const { register, handleSubmit, watch, setValue, formState: { isSubmitting, errors } } = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      p1_name: client.p1_name,
      p1_nif: client.p1_nif,
      p1_email: client.p1_email,
      p1_phone: client.p1_phone,
      p1_employment_type: client.p1_employment_type,
      p1_birth_date: client.p1_birth_date,
      has_p2: !!client.p2_name,
      p2_name: client.p2_name,
      p2_nif: client.p2_nif,
      p2_email: client.p2_email,
      p2_phone: client.p2_phone,
      p2_employment_type: client.p2_employment_type,
      p2_birth_date: client.p2_birth_date,
      mortgage_type: client.mortgage_type,
      property_value: client.property_value?.toString(),
      loan_amount: client.loan_amount?.toString(),
      term_months: client.term_months?.toString(),
      property_address: client.property_address,
      notes_general: client.notes_general,
    },
  });

  const hasP2 = watch('has_p2');

  const employmentTypes = ['employed', 'self_employed', 'retired', 'unemployed', 'student', 'other'] as const;
  const mortgageTypes = ['acquisition', 'construction', 'refinancing', 'transfer'] as const;

  async function onSubmit(values: EditValues) {
    const res = await fetch(`/api/clients/${client.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...values,
        p2_name: values.has_p2 ? values.p2_name : null,
        property_value: values.property_value ? Number(values.property_value) : null,
        loan_amount: values.loan_amount ? Number(values.loan_amount) : null,
        term_months: values.term_months ? Number(values.term_months) : null,
      }),
    });

    if (res.ok) {
      toast.success(tCommon('success'));
      setOpen(false);
      router.refresh();
    } else {
      toast.error(tCommon('error'));
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {customTrigger ? (
          customTrigger
        ) : iconOnly ? (
          <button
            title={tCommon('edit')}
            className="flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        ) : (
          <Button variant="outline" size="sm">
            <Pencil className="h-4 w-4 mr-1.5" />
            {tCommon('edit')}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('editClient')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 mt-2">
          {/* P1 fields */}
          <div>
            <p className="text-sm font-medium text-foreground mb-3">{t('p1')}</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="e_p1_name">{t('name')} *</Label>
                <Input id="e_p1_name" {...register('p1_name')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="e_p1_nif">{t('nif')}</Label>
                <Input id="e_p1_nif" {...register('p1_nif')} />
                {errors.p1_nif && <p className="text-xs text-destructive">{errors.p1_nif.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="e_p1_email">{tCommon('email')}</Label>
                <Input id="e_p1_email" {...register('p1_email')} />
                {errors.p1_email && <p className="text-xs text-destructive">{errors.p1_email.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="e_p1_phone">{tCommon('phone')}</Label>
                <Input id="e_p1_phone" {...register('p1_phone')} />
              </div>
              <div className="space-y-1.5">
                <Label>{t('employmentType')}</Label>
                <Select
                  defaultValue={client.p1_employment_type ?? undefined}
                  onValueChange={(v) => setValue('p1_employment_type', v)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {employmentTypes.map((et) => (
                      <SelectItem key={et} value={et}>
                        {t(`employmentTypes.${et}` as Parameters<typeof t>[0])}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="e_p1_birth_date">{t('birthDate')}</Label>
                <Input id="e_p1_birth_date" type="date" {...register('p1_birth_date')} />
              </div>
            </div>
          </div>

          <Separator />

          {/* P2 toggle */}
          <div className="flex items-center gap-3">
            <Switch
              checked={hasP2}
              onCheckedChange={(v) => setValue('has_p2', v)}
            />
            <Label>{hasP2 ? t('removeP2') : t('addP2')}</Label>
          </div>

          {hasP2 && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t('name')}</Label>
                <Input {...register('p2_name')} />
              </div>
              <div className="space-y-1.5">
                <Label>{t('nif')}</Label>
                <Input {...register('p2_nif')} />
                {errors.p2_nif && <p className="text-xs text-destructive">{errors.p2_nif.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>{tCommon('email')}</Label>
                <Input {...register('p2_email')} />
                {errors.p2_email && <p className="text-xs text-destructive">{errors.p2_email.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>{tCommon('phone')}</Label>
                <Input {...register('p2_phone')} />
              </div>
              <div className="space-y-1.5">
                <Label>{t('employmentType')}</Label>
                <Select
                  defaultValue={client.p2_employment_type ?? undefined}
                  onValueChange={(v) => setValue('p2_employment_type', v)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {employmentTypes.map((et) => (
                      <SelectItem key={et} value={et}>
                        {t(`employmentTypes.${et}` as Parameters<typeof t>[0])}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t('birthDate')}</Label>
                <Input type="date" {...register('p2_birth_date')} />
              </div>
            </div>
          )}

          <Separator />

          {/* Mortgage */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t('mortgageType')}</Label>
              <Select
                defaultValue={client.mortgage_type ?? undefined}
                onValueChange={(v) => setValue('mortgage_type', v)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {mortgageTypes.map((mt) => (
                    <SelectItem key={mt} value={mt}>
                      {t(`mortgageTypes.${mt}` as Parameters<typeof t>[0])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t('propertyValue')} (€)</Label>
              <Input type="number" {...register('property_value')} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('loanAmount')} (€)</Label>
              <Input type="number" {...register('loan_amount')} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('termMonths')}</Label>
              <Input type="number" {...register('term_months')} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{t('propertyAddress')}</Label>
            <Input {...register('property_address')} />
          </div>
          <div className="space-y-1.5">
            <Label>{t('generalNotes')}</Label>
            <Textarea rows={2} {...register('notes_general')} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {tCommon('save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
