'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

export function PasswordForm() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  async function save() {
    if (newPassword !== confirmPassword) {
      toast.error('As palavras-passe não coincidem');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('A palavra-passe deve ter pelo menos 8 caracteres');
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Palavra-passe alterada');
      setNewPassword('');
      setConfirmPassword('');
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-700">Nova Palavra-passe</label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full h-9 px-3 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-700">Confirmar Palavra-passe</label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full h-9 px-3 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
        />
      </div>
      <div className="flex justify-end pt-1">
        <button
          onClick={save}
          disabled={saving || !newPassword}
          className="h-9 px-4 text-sm font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors"
        >
          {saving ? 'A alterar...' : 'Alterar Palavra-passe'}
        </button>
      </div>
    </div>
  );
}
