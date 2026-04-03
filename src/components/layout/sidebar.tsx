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
  FileText,
  UserPlus,
  UserCog,
  User,
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
}

const brokerLinks = [
  { href: '/dashboard', icon: LayoutDashboard, labelKey: 'dashboard' },
  { href: '/dashboard/clients', icon: Users, labelKey: 'clients' },
];

const officeAdminLinks = [
  { href: '/dashboard', icon: LayoutDashboard, labelKey: 'dashboard' },
  { href: '/dashboard/clients', icon: Users, labelKey: 'clients' },
  { href: '/dashboard/mediadores', icon: UserCog, labelKey: 'mediadores' },
  { href: '/dashboard/office', icon: Building2, labelKey: 'office' },
];

const superAdminLinks = [
  { href: '/admin', icon: Shield, labelKey: 'dashboard' },
  { href: '/admin/offices', icon: Building2, labelKey: 'offices' },
  { href: '/admin/brokers', icon: UserCog, labelKey: 'brokers' },
  { href: '/admin/invitations', icon: UserPlus, labelKey: 'invitations' },
  { href: '/admin/impersonate', icon: FileText, labelKey: 'impersonate' },
];

export function Sidebar({
  role,
  userEmail,
  officeName,
  logoUrl,
  isOfficeAdmin,
  currentView,
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
    <aside className="flex flex-col w-[240px] min-h-screen shrink-0" style={{ backgroundColor: '#0f172a' }}>
      {/* Brand mark */}
      <div className="flex items-center gap-2 px-5 pt-5 pb-3 shrink-0">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={officeName || 'HomeFlux'} className="h-6 w-auto object-contain" />
        ) : (
          <div className="text-white/60 shrink-0">
            <HomeFluxLogoMark size={20} />
          </div>
        )}
        <span className="font-semibold text-[12px] tracking-tight text-white/50">HomeFlux</span>
        {role === 'super_admin' && (
          <span className="ml-auto shrink-0 text-[9px] font-bold bg-red-500/20 text-red-400 rounded px-1.5 py-0.5 uppercase tracking-wide">
            Admin
          </span>
        )}
      </div>

      {/* Full-width divider below brand */}
      <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.10)' }} />

      {/* Office name */}
      <div className="px-5 pt-4 pb-3 shrink-0">
        <p className="text-[15px] font-semibold text-white leading-tight truncate">{displayName}</p>
      </div>

      {/* Short centered divider below office name */}
      <div className="flex justify-center pb-2 shrink-0">
        <div style={{ width: '60%', height: '1px', backgroundColor: 'rgba(255,255,255,0.06)' }} />
      </div>

      {/* View switcher — only for office admins */}
      {isOfficeAdmin && role === 'office_admin' && (
        <div className="px-3 pb-2 shrink-0">
          <button
            onClick={toggleView}
            disabled={switching}
            className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-medium text-white/50 hover:text-white/80 hover:bg-white/[0.06] transition-colors disabled:opacity-40"
          >
            {view === 'office' ? (
              <>
                <User className="h-3.5 w-3.5 shrink-0 text-white/30" />
                Mudar para Vista de Mediador
              </>
            ) : (
              <>
                <Building2 className="h-3.5 w-3.5 shrink-0 text-white/30" />
                Mudar para Vista de Escritório
              </>
            )}
          </button>
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
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors',
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
