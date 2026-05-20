'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2 } from 'lucide-react';

const newUserSchema = z
  .object({
    name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
    password: z.string().min(8, 'Password deve ter pelo menos 8 caracteres'),
    confirmPassword: z.string().min(8),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'As passwords não coincidem',
    path: ['confirmPassword'],
  });

const existingUserSchema = z.object({
  password: z.string().min(1, 'Introduza a sua password'),
});

type NewUserValues = z.infer<typeof newUserSchema>;
type ExistingUserValues = z.infer<typeof existingUserSchema>;

interface Props {
  token: string;
  email: string;
  role: string;
  officeName: string | null;
  isExpired: boolean;
  isExistingUser: boolean;
}

export default function ActivateForm({ token, email, officeName, isExpired, isExistingUser }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);

  const newUserForm = useForm<NewUserValues>({ resolver: zodResolver(newUserSchema) });
  const existingUserForm = useForm<ExistingUserValues>({ resolver: zodResolver(existingUserSchema) });

  const onJoin = async (values: ExistingUserValues) => {
    setError(null);
    try {
      const res = await fetch('/api/auth/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, name: '', password: values.password }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        setError(data.error ?? 'Erro ao juntar ao escritório');
        return;
      }
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: values.password });
      if (signInError) {
        setError('Password incorrecta. Por favor tente novamente.');
        return;
      }
      setJoined(true);
      router.push('/dashboard');
    } catch {
      setError('Erro interno. Por favor tente novamente.');
    }
  };

  const onSignup = async (values: NewUserValues) => {
    setError(null);
    try {
      const res = await fetch('/api/auth/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, name: values.name, password: values.password }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        setError(data.error ?? 'Erro ao ativar conta');
        return;
      }
      const supabase = createClient();
      await supabase.auth.signInWithPassword({ email, password: values.password });
      router.push('/dashboard');
    } catch {
      setError('Erro interno. Por favor tente novamente.');
    }
  };

  if (isExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
        <Card className="w-full max-w-md shadow-sm">
          <CardHeader>
            <CardTitle className="text-destructive">Convite expirado</CardTitle>
            <CardDescription>Este link de convite já não é válido. Peça ao administrador um novo convite.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (joined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
        <Card className="w-full max-w-md shadow-sm">
          <CardHeader>
            <CardTitle className="text-green-600">Bem-vindo ao {officeName ?? 'escritório'}!</CardTitle>
            <CardDescription>A redirecionar para o dashboard...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const logoMark = (
    <div className="flex items-center gap-2 mb-2">
      <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
        <span className="text-primary-foreground font-bold text-sm">F</span>
      </div>
      <span className="font-semibold text-lg text-foreground">HomeFlux</span>
    </div>
  );

  // ── Existing user: just confirm password to join ───────────────────────────
  if (isExistingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
        <Card className="w-full max-w-md shadow-sm">
          <CardHeader className="space-y-1 pb-6">
            {logoMark}
            <CardTitle className="text-2xl font-semibold">Juntar-me ao escritório</CardTitle>
            <CardDescription>
              Foi convidado para se juntar a{' '}
              <span className="font-semibold text-foreground">{officeName ?? 'um novo escritório'}</span>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-5 flex items-start gap-3 rounded-xl bg-blue-50 border border-blue-100 px-4 py-3">
              <Building2 className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-slate-800">Já tem uma conta HomeFlux</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Confirme a sua password para aceitar o convite.
                </p>
              </div>
            </div>
            <form onSubmit={existingUserForm.handleSubmit(onJoin)} className="space-y-4">
              <p className="text-sm text-slate-500">
                A entrar como <span className="font-medium text-slate-800">{email}</span>
              </p>
              <div className="space-y-2">
                <Label htmlFor="password">A sua password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  {...existingUserForm.register('password')}
                />
                {existingUserForm.formState.errors.password && (
                  <p className="text-sm text-destructive">
                    {existingUserForm.formState.errors.password.message}
                  </p>
                )}
              </div>
              {error && (
                <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
              )}
              <Button type="submit" className="w-full" disabled={existingUserForm.formState.isSubmitting}>
                {existingUserForm.formState.isSubmitting
                  ? 'A juntar...'
                  : `Juntar-me a ${officeName ?? 'este escritório'}`}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── New user: full signup ──────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md shadow-sm">
        <CardHeader className="space-y-1 pb-6">
          {logoMark}
          <CardTitle className="text-2xl font-semibold">Ativar conta</CardTitle>
          <CardDescription>
            {officeName ? `Criar conta para aceder a ${officeName}` : 'Criar a sua conta HomeFlux'}
          </CardDescription>
          <p className="text-sm text-muted-foreground pt-1">
            <span className="font-medium">{email}</span>
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={newUserForm.handleSubmit(onSignup)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome completo</Label>
              <Input id="name" type="text" autoComplete="name" {...newUserForm.register('name')} />
              {newUserForm.formState.errors.name && (
                <p className="text-sm text-destructive">{newUserForm.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete="new-password" {...newUserForm.register('password')} />
              {newUserForm.formState.errors.password && (
                <p className="text-sm text-destructive">{newUserForm.formState.errors.password.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar password</Label>
              <Input id="confirmPassword" type="password" autoComplete="new-password" {...newUserForm.register('confirmPassword')} />
              {newUserForm.formState.errors.confirmPassword && (
                <p className="text-sm text-destructive">{newUserForm.formState.errors.confirmPassword.message}</p>
              )}
            </div>
            {error && (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
            )}
            <Button type="submit" className="w-full" disabled={newUserForm.formState.isSubmitting}>
              {newUserForm.formState.isSubmitting ? 'A ativar...' : 'Ativar conta'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
