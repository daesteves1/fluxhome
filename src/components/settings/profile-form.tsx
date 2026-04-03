'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface UserData {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
}

export function ProfileForm({ user }: { user: UserData }) {
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone ?? '');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const res = await fetch('/api/settings/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone: phone || null }),
    });
    setSaving(false);
    if (res.ok) {
      toast.success('Perfil atualizado');
      router.refresh();
    } else {
      toast.error('Erro ao guardar');
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-700">Email</label>
        <input
          value={user.email}
          disabled
          className="w-full h-9 px-3 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-400"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-700">Nome</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full h-9 px-3 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-700">Telefone</label>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full h-9 px-3 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
        />
      </div>
      <div className="flex justify-end pt-1">
        <button
          onClick={save}
          disabled={saving}
          className="h-9 px-4 text-sm font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors"
        >
          {saving ? 'A guardar...' : 'Guardar'}
        </button>
      </div>
    </div>
  );
}
