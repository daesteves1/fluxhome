'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  LayoutDashboard,
  Users,
  Settings,
  Building2,
  Shield,
  FileText,
  UserPlus,
  UserCog,
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
  { href: '/dashboard/settings', icon: Settings, labelKey: 'settings' },
];

const officeAdminLinks = [
  { href: '/dashboard', icon: LayoutDashboard, labelKey: 'dashboard' },
  { href: '/dashboard/clients', icon: Users, labelKey: 'clients' },
  { href: '/dashboard/office', icon: Building2, labelKey: 'office' },
  { href: '/dashboard/settings', icon: Settings, labelKey: 'settings' },
];

const superAdminLinks = [
  { href: '/admin', icon: Shield, labelKey: 'dashboard' },
  { href: '/admin/institutions', icon: Building2, labelKey: 'institutions' },
  { href: '/admin/offices', icon: Building2, labelKey: 'offices' },
  { href: '/admin/brokers', icon: UserCog, labelKey: 'brokers' },
  { href: '/admin/invitations', icon: UserPlus, labelKey: 'invitations' },
  { href: '/admin/impersonate', icon: FileText, labelKey: 'impersonate' },
];

export function Sidebar({
  role,
  userName,
  userEmail,
  officeName,
  logoUrl,
}: SidebarProps) {
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

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-sidebar border-r border-sidebar-border">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border shrink-0">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={officeName || 'FluxHome'} className="h-8 w-auto object-contain" />
        ) : (
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shrink-0">
            <span className="text-primary-foreground font-bold text-sm">F</span>
          </div>
        )}
        <span className="font-semibold text-sidebar-foreground truncate">
          {officeName || 'FluxHome'}
        </span>
        {role === 'super_admin' && (
          <span className="ml-auto shrink-0 text-xs font-semibold bg-red-100 text-red-700 rounded px-1.5 py-0.5">
            Admin
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
        {links.map(({ href, icon: Icon, labelKey }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
              isActive(href)
                ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {t(labelKey as Parameters<typeof t>[0])}
          </Link>
        ))}
      </nav>

      {/* User footer */}
      <div className="px-4 py-4 border-t border-sidebar-border shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
            {userName.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">{userName}</p>
            <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
