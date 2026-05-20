'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const schema = z
  .object({
    password: z.string().min(8, 'A password deve ter pelo menos 8 caracteres'),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: 'As passwords não coincidem',
    path: ['confirm'],
  });

type FormValues = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    // PKCE flow (?code= in query string)
    const code = new URLSearchParams(window.location.search).get('code');
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error: exchError }) => {
        if (exchError) setError('Link inválido ou expirado. Peça um novo link de recuperação.');
        else setReady(true);
      });
      return;
    }

    // Implicit flow (#access_token in hash) — Supabase client processes it automatically
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setReady(true);
        subscription.unsubscribe();
      }
    });

    // Also check if a session already exists (page refresh case)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        setReady(true);
        subscription.unsubscribe();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(values: FormValues) {
    setError(null);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password: values.password });
    if (updateError) {
      setError(updateError.message);
      return;
    }
    router.push('/dashboard');
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
          <CardTitle className="text-2xl font-semibold">Nova password</CardTitle>
          <CardDescription>Escolha uma nova password para a sua conta</CardDescription>
        </CardHeader>
        <CardContent>
          {error && !ready ? (
            <div className="space-y-4">
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
              <a href="/forgot-password" className="text-sm text-blue-600 hover:underline">Pedir novo link de recuperação</a>
            </div>
          ) : !ready ? (
            <p className="text-sm text-slate-500 text-center py-4">A verificar link de recuperação...</p>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Nova password</Label>
                <Input id="password" type="password" autoComplete="new-password" {...register('password')} />
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirmar password</Label>
                <Input id="confirm" type="password" autoComplete="new-password" {...register('confirm')} />
                {errors.confirm && (
                  <p className="text-sm text-destructive">{errors.confirm.message}</p>
                )}
              </div>
              {error && (
                <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
              )}
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'A guardar...' : 'Guardar nova password'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
