'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback } from 'react';
import { cn } from '@/lib/utils';

interface ScopeControlsProps {
  isOfficeAdmin: boolean;
  currentView: 'office' | 'broker';
  currentBroker: string | null;
  brokers: { id: string; name: string }[];
  currentRange: string;
}

export function ScopeControls({
  isOfficeAdmin,
  currentView,
  currentBroker,
  brokers,
  currentRange,
}: ScopeControlsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateParam = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, val] of Object.entries(updates)) {
        if (val == null) params.delete(key);
        else params.set(key, val);
      }
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Time range */}
      <div className="flex items-center rounded-lg border border-slate-200 bg-white overflow-hidden text-xs font-medium">
        {(['7d', '30d', '90d', 'all'] as const).map((r) => (
          <button
            key={r}
            onClick={() => updateParam({ range: r })}
            className={cn(
              'px-2.5 py-1.5 transition-colors',
              currentRange === r
                ? 'bg-slate-900 text-white'
                : 'text-slate-500 hover:bg-slate-50'
            )}
          >
            {r === 'all' ? 'Tudo' : r}
          </button>
        ))}
      </div>

      {/* Broker drill-down — office admin in office view only */}
      {isOfficeAdmin && currentView === 'office' && brokers.length > 0 && (
        <select
          value={currentBroker ?? ''}
          onChange={(e) => updateParam({ broker: e.target.value || null })}
          className="text-xs border border-slate-200 rounded-lg bg-white px-2.5 py-1.5 text-slate-600 focus:outline-none focus:ring-1 focus:ring-slate-300"
        >
          <option value="">Todos os mediadores ▾</option>
          {brokers.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      )}
    </div>
  );
}
