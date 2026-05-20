'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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
  BookUser,
  ChevronDown,
  LogOut,
  User,
  KeyRound,
  MoreHorizontal,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { HomeFluxLogoMark } from './homeflux-logo';
import { createClient } from '@/lib/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface NavItem {
  href: string;
  icon: React.ElementType;
  label: string;
}

interface NavGroup {
  groupLabel?: string;
  items: NavItem[];
}

interface Office {
  id: string;
  name: string;
  logoUrl?: string;
}

interface SidebarProps {
  role: 'super_admin' | 'office_admin' | 'broker';
  userName: string;
  userEmail: string;
  officeName?: string;
  logoUrl?: string;
  isOfficeAdmin?: boolean;
  userOffices?: Office[];
  activeOfficeId?: string;
  onClose?: () => void;
}

function buildNavGroups(role: string, isOfficeAdmin: boolean): NavGroup[] {
  if (role === 'super_admin') {
    return [
      {
        items: [
          { href: '/admin', icon: Shield, label: 'Dashboard' },
          { href: '/admin/offices', icon: Building2, label: 'Escritórios' },
          { href: '/admin/brokers', icon: UserCog, label: 'Mediadores' },
          { href: '/admin/invitations', icon: UserPlus, label: 'Convites' },
          { href: '/admin/impersonate', icon: Users, label: 'Impersonar' },
          { href: '/admin/settings', icon: Settings, label: 'Definições' },
          { href: '/admin/support', icon: HelpCircle, label: 'Suporte' },
        ],
      },
    ];
  }

  const operacao: NavGroup = {
    groupLabel: 'OPERAÇÃO',
    items: [
      { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { href: '/dashboard/processes', icon: FolderKanban, label: 'Pipeline' },
      { href: '/dashboard/clients', icon: Users, label: 'Clientes' },
      { href: '/dashboard/leads', icon: Inbox, label: 'Leads' },
    ],
  };

  if (!isOfficeAdmin) return [operacao];

  return [
    operacao,
    {
      groupLabel: 'PARCEIROS',
      items: [
        { href: '/dashboard/office/bank-contacts', icon: BookUser, label: 'Contactos Bancários' },
      ],
    },
    {
      groupLabel: 'ESCRITÓRIO',
      items: [
        { href: '/dashboard/mediadores', icon: UserCog, label: 'Mediadores' },
        { href: '/dashboard/office', icon: Building2, label: 'Definições' },
      ],
    },
  ];
}

export function Sidebar({
  role,
  userName,
  userEmail,
  officeName,
  logoUrl,
  isOfficeAdmin = false,
  userOffices = [],
  activeOfficeId,
  onClose,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [switching, setSwitching] = useState(false);

  async function switchOffice(officeId: string) {
    if (officeId === activeOfficeId || switching) return;
    setSwitching(true);
    try {
      await fetch('/api/settings/office', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ officeId }),
      });
      router.refresh();
    } finally {
      setSwitching(false);
    }
  }

  async function handleLogout() {
    const supabase = createClient();
    await fetch('/api/admin/impersonate/exit', { method: 'POST' });
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  const navGroups = buildNavGroups(role, isOfficeAdmin);

  const isActive = (href: string) => {
    if (href === '/dashboard' || href === '/admin') {
      return pathname === href || pathname === `${href}/`;
    }
    if (href === '/dashboard/office') {
      return pathname === '/dashboard/office' || pathname === '/dashboard/office/';
    }
    return pathname.startsWith(href);
  };

  const initials = userName
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  const roleLabel =
    role === 'super_admin'
      ? 'Super Admin'
      : isOfficeAdmin
      ? 'Office Admin'
      : 'Mediador';

  const displayOfficeName = officeName ?? (role === 'super_admin' ? 'Super Admin' : 'HomeFlux');
  const multiOffice = userOffices.length > 1;

  return (
    <aside
      className="flex flex-col w-[240px] shrink-0"
      style={{ backgroundColor: '#0f172a', position: 'sticky', top: 0, height: '100vh', overflowY: 'auto' }}
    >
      {/* Office switcher / brand */}
      <div className="h-14 px-4 flex items-center shrink-0">
        {multiOffice ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex items-center gap-2 min-w-0 w-full rounded-lg px-1 py-1.5 hover:bg-white/[0.07] transition-colors"
                disabled={switching}
              >
                <OfficeLogo logoUrl={logoUrl} name={displayOfficeName} />
                <span className="text-sm font-semibold text-white truncate flex-1 text-left">
                  {displayOfficeName}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-white/40 shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              sideOffset={4}
              className="w-52"
            >
              {userOffices.map((office) => (
                <DropdownMenuItem
                  key={office.id}
                  onClick={() => switchOffice(office.id)}
                  className="flex items-center gap-2"
                >
                  <span className="flex-1 truncate">{office.name}</span>
                  {office.id === activeOfficeId && (
                    <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex items-center gap-2 min-w-0 px-1">
            <OfficeLogo logoUrl={logoUrl} name={displayOfficeName} />
            <span className="text-sm font-semibold text-white truncate">
              {displayOfficeName}
            </span>
          </div>
        )}
      </div>

      <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.08)' }} className="shrink-0" />

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-4">
        {navGroups.map((group, gi) => (
          <div key={gi}>
            {group.groupLabel && (
              <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-white/30">
                {group.groupLabel}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map(({ href, icon: Icon, label }) => {
                const active = isActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    prefetch={false}
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors min-h-[36px]',
                      active
                        ? 'bg-white/10 text-white'
                        : 'text-white/50 hover:bg-white/[0.06] hover:text-white/85'
                    )}
                  >
                    <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-white' : 'text-white/35')} />
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom profile */}
      <div
        className="px-3 py-3 shrink-0 flex items-center gap-2.5"
        style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-white truncate leading-tight">{userName}</p>
          <p className="text-[11px] text-white/40 truncate leading-tight">{roleLabel}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center justify-center w-7 h-7 rounded-md hover:bg-white/10 transition-colors shrink-0">
              <MoreHorizontal className="h-4 w-4 text-white/40" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings" className="flex items-center gap-2" onClick={onClose}>
                <User className="h-4 w-4" />
                Perfil
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings/password" className="flex items-center gap-2" onClick={onClose}>
                <KeyRound className="h-4 w-4" />
                Alterar password
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive flex items-center gap-2"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Terminar sessão
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}

function OfficeLogo({ logoUrl, name }: { logoUrl?: string; name: string }) {
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={logoUrl} alt={name} className="h-6 w-6 object-contain rounded shrink-0" />
    );
  }
  const initials = name.slice(0, 2).toUpperCase();
  return (
    <div className="h-6 w-6 rounded bg-blue-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
      {initials}
    </div>
  );
}
