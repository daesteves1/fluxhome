'use client';

import { useRouter } from 'next/navigation';
import { HelpCircle, Menu } from 'lucide-react';
import { HomeFluxLogoMark } from './homeflux-logo';
import { NotificationBell } from './notification-bell';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface TopBarProps {
  onMenuToggle?: () => void;
  onHelpOpen?: () => void;
  isOfficeAdmin?: boolean;
  currentView?: 'broker' | 'office';
}

export function TopBar({ onMenuToggle, onHelpOpen, isOfficeAdmin, currentView }: TopBarProps) {
  const router = useRouter();
  const [view, setView] = useState<'broker' | 'office'>(currentView ?? 'office');
  const [switching, setSwitching] = useState(false);

  async function toggleView(next: 'broker' | 'office') {
    if (next === view || switching) return;
    setSwitching(true);
    setView(next);
    try {
      await fetch('/api/settings/view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ view: next }),
      });
      router.refresh();
    } finally {
      setSwitching(false);
    }
  }

  return (
    <header className="flex items-center h-14 px-4 bg-white border-b border-slate-200 shrink-0 gap-2">
      {/* Mobile: hamburger */}
      <button
        onClick={onMenuToggle}
        className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors shrink-0 text-slate-500"
        aria-label="Abrir menu"
      >
        <Menu className="h-4 w-4" />
      </button>

      {/* Mobile: centered logo */}
      <div className="md:hidden flex-1 flex justify-center">
        <div className="flex items-center gap-1.5">
          <HomeFluxLogoMark size={18} />
          <span className="font-semibold text-sm text-slate-900">HomeFlux</span>
        </div>
      </div>

      {/* Desktop: push right */}
      <div className="hidden md:flex flex-1" />

      {/* Escritório / Mediador toggle — office admins only, desktop */}
      {isOfficeAdmin && (
        <div className="hidden md:flex items-center">
          <div
            className="flex h-8 rounded-full p-0.5"
            style={{ backgroundColor: '#f1f5f9' }}
          >
            <button
              onClick={() => toggleView('office')}
              disabled={switching}
              className={cn(
                'px-3 rounded-full text-[12px] font-semibold transition-colors duration-150 disabled:opacity-60',
                view === 'office'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              )}
            >
              Escritório
            </button>
            <button
              onClick={() => toggleView('broker')}
              disabled={switching}
              className={cn(
                'px-3 rounded-full text-[12px] font-semibold transition-colors duration-150 disabled:opacity-60',
                view === 'broker'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              )}
            >
              Mediador
            </button>
          </div>
        </div>
      )}

      {/* Notification bell */}
      <NotificationBell />

      {/* Help button */}
      <button
        onClick={onHelpOpen}
        className="flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-slate-500 hover:text-slate-700 shrink-0"
        aria-label="Ajuda"
      >
        <HelpCircle className="h-4 w-4" />
      </button>
    </header>
  );
}
