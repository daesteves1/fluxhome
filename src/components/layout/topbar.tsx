'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Bell, LogOut, User, KeyRound, ChevronDown, Globe } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface TopBarProps {
  title: string;
  breadcrumb?: string;
  userName: string;
}

export function TopBar({ title, breadcrumb, userName }: TopBarProps) {
  const t = useTranslations('nav');
  const router = useRouter();
  const locale = useLocale();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  function switchLocale(newLocale: string) {
    const path = window.location.pathname;
    const segments = path.split('/');
    // Strip current locale prefix if present
    if (segments[1] === 'pt' || segments[1] === 'en') {
      segments.splice(1, 1);
    }
    const newPath = newLocale === 'pt' ? segments.join('/') || '/' : `/${newLocale}${segments.join('/')}`;
    router.push(newPath);
  }

  return (
    <header className="flex items-center justify-between h-16 px-6 bg-background border-b border-border shrink-0">
      {/* Title + breadcrumb */}
      <div>
        <h1 className="text-lg font-semibold text-foreground leading-none">{title}</h1>
        {breadcrumb && (
          <p className="text-xs text-muted-foreground mt-0.5">{breadcrumb}</p>
        )}
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2">
        {/* Language switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
              <Globe className="h-4 w-4" />
              <span className="text-xs uppercase">{locale}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => switchLocale('pt')} className={locale === 'pt' ? 'font-semibold' : ''}>
              Português
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => switchLocale('en')} className={locale === 'en' ? 'font-semibold' : ''}>
              English
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications (stub) */}
        <Button variant="ghost" size="sm" className="text-muted-foreground relative">
          <Bell className="h-4 w-4" />
        </Button>

        {/* Profile dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                {userName.slice(0, 2).toUpperCase()}
              </div>
              <span className="text-sm max-w-[120px] truncate hidden sm:block">{userName}</span>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                {t('profile')}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings?tab=security" className="flex items-center gap-2">
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
      </div>
    </header>
  );
}
