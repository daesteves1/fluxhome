'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const activateSchema = z
  .object({
    name: z.string().min(2),
    password: z.string().min(8),
    confirmPassword: z.string().min(8),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'passwords_mismatch',
    path: ['confirmPassword'],
  });

type ActivateValues = z.infer<typeof activateSchema>;

interface Props {
  token: string;
  email: string;
  role: string;
  officeName: string | null;
  isExpired: boolean;
}

export default function ActivateForm({ token, email, officeName, isExpired }: Props) {
  const t = useTranslations('auth');
  const tErrors = useTranslations('errors');
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ActivateValues>({
    resolver: zodResolver(activateSchema),
  });

  if (isExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
        <Card className="w-full max-w-md shadow-sm">
          <CardHeader>
            <CardTitle className="text-destructive">{t('tokenExpired')}</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  async function onSubmit(values: ActivateValues) {
    setError(null);
    try {
      const res = await fetch('/api/auth/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, name: values.name, password: values.password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || tErrors('generic'));
        return;
      }

      const supabase = createClient();
      await supabase.auth.signInWithPassword({ email, password: values.password });
      router.push('/dashboard');
    } catch {
      setError(tErrors('generic'));
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md shadow-sm">
        <CardHeader className="space-y-1 pb-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">F</span>
            </div>
            <span className="font-semibold text-lg text-foreground">HomeFlux</span>
          </div>
          <CardTitle className="text-2xl font-semibold">{t('activateTitle')}</CardTitle>
          <CardDescription>
            {officeName
              ? `${t('activateSubtitle')} — ${officeName}`
              : t('activateSubtitle')}
          </CardDescription>
          <p className="text-sm text-muted-foreground pt-1">
            <span className="font-medium">{email}</span>
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('fullName')}</Label>
              <Input
                id="name"
                type="text"
                autoComplete="name"
                {...register('name')}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{tErrors('required')}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t('newPassword')}</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{tErrors('passwordTooShort')}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t('confirmPassword')}</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{t('passwordMismatch')}</p>
              )}
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? t('activating') : t('activateButton')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
