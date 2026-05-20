'use client';

import { HelpCircle, Menu } from 'lucide-react';
import { HomeFluxLogoMark } from './homeflux-logo';
import { NotificationBell } from './notification-bell';
import { cn } from '@/lib/utils';

interface TopBarProps {
  onMenuToggle?: () => void;
  onHelpOpen?: () => void;
  isOfficeAdmin?: boolean;
  view?: 'broker' | 'office';
  switching?: boolean;
  onToggleView?: (next: 'broker' | 'office') => void;
}

export function TopBar({ onMenuToggle, onHelpOpen, isOfficeAdmin, view = 'office', switching, onToggleView }: TopBarProps) {
  return (
    <header className="sticky top-0 z-10 flex items-center h-14 px-4 bg-white border-b border-slate-200 shrink-0 gap-2">
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

      {/* Escritório / Mediador toggle — office admins only */}
      {isOfficeAdmin && (
        <div className="hidden md:flex items-center mr-1">
          <div className="flex h-8 rounded-full p-0.5" style={{ backgroundColor: '#f1f5f9' }}>
            <button
              onClick={() => onToggleView?.('office')}
              disabled={switching}
              className={cn(
                'px-3 rounded-full text-[12px] font-semibold transition-colors duration-150 disabled:opacity-60',
                view === 'office' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              )}
            >
              Escritório
            </button>
            <button
              onClick={() => onToggleView?.('broker')}
              disabled={switching}
              className={cn(
                'px-3 rounded-full text-[12px] font-semibold transition-colors duration-150 disabled:opacity-60',
                view === 'broker' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              )}
            >
              Mediador
            </button>
          </div>
        </div>
      )}

      <NotificationBell />

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
