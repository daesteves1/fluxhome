'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export function RefreshButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleRefresh() {
    if (loading) return;
    setLoading(true);
    try {
      await fetch('/api/dashboard/refresh', { method: 'POST' });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleRefresh}
      disabled={loading}
      className={cn(
        'inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50',
      )}
      title="Atualizar dados"
    >
      <RefreshCw className={cn('h-3 w-3', loading && 'animate-spin')} />
      {loading ? 'A atualizar…' : 'Atualizar'}
    </button>
  );
}
