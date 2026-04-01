'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import type { Database } from '@/types/database';

type ClientRow = Database['public']['Tables']['clients']['Row'];

const clientSchema = z.object({
  p1_name: z.string().min(1),
  p1_nif: z.string().optional().nullable(),
  p1_email: z.string().email().optional().nullable().or(z.literal('')),
  p1_phone: z.string().optional().nullable(),
  p1_employment_type: z.string().optional().nullable(),
  p1_birth_date: z.string().optional().nullable(),
  has_p2: z.boolean(),
  p2_name: z.string().optional().nullable(),
  p2_nif: z.string().optional().nullable(),
  p2_email: z.string().email().optional().nullable().or(z.literal('')),
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

type ClientFormValues = z.infer<typeof clientSchema>;

interface Props {
  brokerId: string;
  officeId: string;
  defaultValues?: Partial<ClientRow>;
  clientId?: string;
  onSuccess?: () => void;
}

export function NewClientForm({ brokerId, officeId }: Props) {
  const t = useTranslations('clients');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: { has_p2: false },
  });

  const hasP2 = watch('has_p2');

  async function onSubmit(values: ClientFormValues) {
    setError(null);
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          broker_id: brokerId,
          office_id: officeId,
          property_value: values.property_value ? Number(values.property_value) : null,
          loan_amount: values.loan_amount ? Number(values.loan_amount) : null,
          term_months: values.term_months ? Number(values.term_months) : null,
          p2_name: values.has_p2 ? values.p2_name : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Error creating client');
        return;
      }

      const { id } = await res.json();
      router.push(`/dashboard/clients/${id}`);
    } catch {
      setError('Network error');
    }
  }

  const employmentTypes = [
    'employed', 'self_employed', 'retired', 'unemployed', 'student', 'other'
  ] as const;

  const mortgageTypes = ['acquisition', 'construction', 'refinancing', 'transfer'] as const;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Proponente 1 */}
      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">{t('p1')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="p1_name">{t('name')} *</Label>
              <Input id="p1_name" {...register('p1_name')} />
              {errors.p1_name && <p className="text-xs text-destructive">{tCommon('required')}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="p1_nif">{t('nif')}</Label>
              <Input id="p1_nif" {...register('p1_nif')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p1_email">{tCommon('email')}</Label>
              <Input id="p1_email" type="email" {...register('p1_email')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p1_phone">{tCommon('phone')}</Label>
              <Input id="p1_phone" {...register('p1_phone')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p1_employment_type">{t('employmentType')}</Label>
              <Select onValueChange={(v) => setValue('p1_employment_type', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {employmentTypes.map((et) => (
                    <SelectItem key={et} value={et}>
                      {t(`employmentTypes.${et}` as Parameters<typeof t>[0])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="p1_birth_date">{t('birthDate')}</Label>
              <Input id="p1_birth_date" type="date" {...register('p1_birth_date')} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* P2 toggle */}
      <div className="flex items-center gap-3">
        <Switch
          id="has_p2"
          checked={hasP2}
          onCheckedChange={(v) => setValue('has_p2', v)}
        />
        <Label htmlFor="has_p2">{hasP2 ? t('removeP2') : t('addP2')}</Label>
      </div>

      {/* Proponente 2 */}
      {hasP2 && (
        <Card className="shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">{t('p2')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="p2_name">{t('name')}</Label>
                <Input id="p2_name" {...register('p2_name')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p2_nif">{t('nif')}</Label>
                <Input id="p2_nif" {...register('p2_nif')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p2_email">{tCommon('email')}</Label>
                <Input id="p2_email" type="email" {...register('p2_email')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p2_phone">{tCommon('phone')}</Label>
                <Input id="p2_phone" {...register('p2_phone')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p2_employment_type">{t('employmentType')}</Label>
                <Select onValueChange={(v) => setValue('p2_employment_type', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {employmentTypes.map((et) => (
                      <SelectItem key={et} value={et}>
                        {t(`employmentTypes.${et}` as Parameters<typeof t>[0])}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="p2_birth_date">{t('birthDate')}</Label>
                <Input id="p2_birth_date" type="date" {...register('p2_birth_date')} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mortgage details */}
      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Crédito Habitação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mortgage_type">{t('mortgageType')}</Label>
              <Select onValueChange={(v) => setValue('mortgage_type', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {mortgageTypes.map((mt) => (
                    <SelectItem key={mt} value={mt}>
                      {t(`mortgageTypes.${mt}` as Parameters<typeof t>[0])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="property_value">{t('propertyValue')} (€)</Label>
              <Input id="property_value" type="number" step="1000" {...register('property_value')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="loan_amount">{t('loanAmount')} (€)</Label>
              <Input id="loan_amount" type="number" step="1000" {...register('loan_amount')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="term_months">{t('termMonths')}</Label>
              <Input id="term_months" type="number" {...register('term_months')} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="property_address">{t('propertyAddress')}</Label>
            <Input id="property_address" {...register('property_address')} />
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card className="shadow-sm">
        <CardContent className="pt-4">
          <div className="space-y-2">
            <Label htmlFor="notes_general">{t('generalNotes')}</Label>
            <Textarea
              id="notes_general"
              rows={3}
              {...register('notes_general')}
            />
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          {tCommon('cancel')}
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? tCommon('loading') : tCommon('save')}
        </Button>
      </div>
    </form>
  );
}
