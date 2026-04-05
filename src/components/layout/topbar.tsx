'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { LogOut, User, KeyRound, ChevronDown, Menu } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { HomeFluxLogoMark } from './homeflux-logo';

interface TopBarProps {
  userName: string;
  onMenuToggle?: () => void;
}

export function TopBar({ userName, onMenuToggle }: TopBarProps) {
  const t = useTranslations('nav');
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  const initials = userName
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <header className="flex items-center h-14 px-4 bg-white border-b border-slate-200 shrink-0">
      {/* Mobile: hamburger */}
      <button
        onClick={onMenuToggle}
        className="md:hidden flex items-center justify-center w-10 h-10 -ml-1 rounded-lg hover:bg-slate-100 transition-colors shrink-0"
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5 text-slate-600" />
      </button>

      {/* Mobile: centered logo */}
      <div className="md:hidden flex-1 flex justify-center">
        <div className="flex items-center gap-1.5">
          <HomeFluxLogoMark size={18} />
          <span className="font-semibold text-sm text-slate-900">HomeFlux</span>
        </div>
      </div>

      {/* Desktop: push user menu to the right */}
      <div className="hidden md:flex flex-1" />

      {/* User dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 h-9 px-2 rounded-lg hover:bg-slate-100 transition-colors min-w-[44px] justify-center md:justify-start">
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold shrink-0">
              {initials}
            </div>
            <span className="text-sm font-medium text-slate-700 max-w-[140px] truncate hidden sm:block">
              {userName}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400 hidden sm:block" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem asChild>
            <Link href="/dashboard/settings" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              {t('profile')}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/dashboard/settings/password" className="flex items-center gap-2">
              <KeyRound className="h-4 w-4" />
              {t('changePassword')}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive flex items-center gap-2"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            {t('logout')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
