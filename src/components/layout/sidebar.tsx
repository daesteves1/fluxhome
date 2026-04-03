'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  LayoutDashboard,
  Users,
  Building2,
  Shield,
  FileText,
  UserPlus,
  UserCog,
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

export function Sidebar({ role, userEmail, officeName, logoUrl }: SidebarProps) {
  const t = useTranslations('nav');
  const pathname = usePathname();

  const links =
    role === 'super_admin'
      ? superAdminLinks
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

      {/* Office name */}
      <div className="px-5 pb-4 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <p className="text-[15px] font-semibold text-white leading-tight truncate">{displayName}</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 pt-3 pb-4 space-y-0.5 overflow-y-auto">
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
