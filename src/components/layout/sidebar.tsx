'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Building2,
  Shield,
  UserPlus,
  UserCog,
  Settings,
  HelpCircle,
  FolderKanban,
  Inbox,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { HomeFluxLogoMark } from './homeflux-logo';

interface SidebarProps {
  role: 'super_admin' | 'office_admin' | 'broker';
  userName: string;
  userEmail: string;
  officeName?: string;
  logoUrl?: string;
  primaryColor?: string;
  isOfficeAdmin?: boolean;
  currentView?: 'broker' | 'office';
  onClose?: () => void;
}

const brokerLinks = [
  { href: '/dashboard', icon: LayoutDashboard, labelKey: 'dashboard' },
  { href: '/dashboard/processes', icon: FolderKanban, labelKey: 'processes' },
  { href: '/dashboard/clients', icon: Users, labelKey: 'clients' },
  { href: '/dashboard/leads', icon: Inbox, labelKey: 'leads' },
];

const officeAdminLinks = [
  { href: '/dashboard', icon: LayoutDashboard, labelKey: 'dashboard' },
  { href: '/dashboard/processes', icon: FolderKanban, labelKey: 'processes' },
  { href: '/dashboard/clients', icon: Users, labelKey: 'clients' },
  { href: '/dashboard/leads', icon: Inbox, labelKey: 'leads' },
  { href: '/dashboard/mediadores', icon: UserCog, labelKey: 'mediadores' },
  { href: '/dashboard/office', icon: Building2, labelKey: 'office' },
];

const superAdminLinks = [
  { href: '/admin', icon: Shield, labelKey: 'dashboard' },
  { href: '/admin/offices', icon: Building2, labelKey: 'offices' },
  { href: '/admin/brokers', icon: UserCog, labelKey: 'brokers' },
  { href: '/admin/invitations', icon: UserPlus, labelKey: 'invitations' },
  { href: '/admin/impersonate', icon: Users, labelKey: 'impersonate' },
  { href: '/admin/settings', icon: Settings, labelKey: 'settings' },
  { href: '/admin/support', icon: HelpCircle, labelKey: 'support' },
];

export function Sidebar({
  role,
  userEmail,
  officeName,
  logoUrl,
  isOfficeAdmin,
  currentView,
  onClose,
}: SidebarProps) {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const router = useRouter();

  // Local view state — initialised from server-side cookie value
  const [view, setView] = useState<'broker' | 'office'>(currentView ?? 'office');
  const [switching, setSwitching] = useState(false);

  async function toggleView() {
    const next = view === 'office' ? 'broker' : 'office';
    setSwitching(true);
    setView(next); // immediate UI feedback
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

  const links =
    role === 'super_admin'
      ? superAdminLinks
      : role === 'office_admin' && view === 'broker'
      ? brokerLinks
      : role === 'office_admin'
      ? officeAdminLinks
      : brokerLinks;

  const isActive = (href: string) => {
    if (href === '/dashboard' || href === '/admin') {
      return pathname === href || pathname === `${href}/`;
    }
    return pathname.startsWith(href);
  };

  const displayName = officeName || (role === 'super_admin' ? 'Super Admin' : 'HomeFlux');

  return (
    <aside
      className="flex flex-col w-[240px] shrink-0"
      style={{ backgroundColor: '#0f172a', position: 'sticky', top: 0, height: '100vh', overflowY: 'auto' }}
    >
      {/* Brand mark — h-14 matches TopBar height so divider aligns with header border */}
      <div className="flex items-center gap-2 px-5 h-14 shrink-0">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={officeName || 'HomeFlux'} className="h-6 w-auto object-contain" />
        ) : (
          <div className="text-white/80 shrink-0">
            <HomeFluxLogoMark size={24} />
          </div>
        )}
        <span className="font-semibold text-[14px] tracking-tight text-white">HomeFlux</span>
        {role === 'super_admin' && (
          <span className="ml-auto shrink-0 text-[9px] font-bold bg-red-500/20 text-red-400 rounded px-1.5 py-0.5 uppercase tracking-wide">
            Admin
          </span>
        )}
      </div>

      {/* Full-width divider — flush with brand bottom, aligns with TopBar border-b */}
      <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.10)' }} className="shrink-0" />

      {/* Office name — label style */}
      <div className="px-4 py-3 shrink-0">
        <p className="text-center text-sm font-medium tracking-wide text-slate-400 uppercase truncate">
          {displayName}
        </p>
      </div>

      {/* View switcher pill — only for office admins */}
      {isOfficeAdmin && role === 'office_admin' && (
        <div className="px-3 pb-3 shrink-0">
          <div
            className="flex h-8 rounded-full p-0.5"
            style={{ backgroundColor: 'rgba(255,255,255,0.07)' }}
          >
            <button
              onClick={view !== 'office' ? toggleView : undefined}
              disabled={switching}
              className={cn(
                'flex-1 rounded-full text-[11px] font-semibold transition-colors duration-150 disabled:opacity-60',
                view === 'office'
                  ? 'bg-white text-slate-800'
                  : 'text-white/40 hover:text-white/65'
              )}
            >
              Escritório
            </button>
            <button
              onClick={view !== 'broker' ? toggleView : undefined}
              disabled={switching}
              className={cn(
                'flex-1 rounded-full text-[11px] font-semibold transition-colors duration-150 disabled:opacity-60',
                view === 'broker'
                  ? 'bg-white text-slate-800'
                  : 'text-white/40 hover:text-white/65'
              )}
            >
              Mediador
            </button>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 pt-1 pb-4 space-y-0.5 overflow-y-auto">
        {links.map(({ href, icon: Icon, labelKey }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors min-h-[44px]',
                active
                  ? 'bg-white/10 text-white'
                  : 'text-white/50 hover:bg-white/[0.08] hover:text-white/85'
              )}
            >
              <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-white' : 'text-white/35')} />
              {t(labelKey as Parameters<typeof t>[0])}
            </Link>
          );
        })}
      </nav>

      {/* Footer — email only */}
      <div className="px-5 py-3 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <p className="text-[11px] text-white/35 truncate">{userEmail}</p>
      </div>
    </aside>
  );
}
