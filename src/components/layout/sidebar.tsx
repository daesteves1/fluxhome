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
  Landmark,
  ChevronDown,
  LogOut,
  User,
  KeyRound,
  MoreHorizontal,
  Check,
  Home,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const ACCENT = '#2754ff';
const BG = '#0e1320';
const INK = '#e7e8ec';
const MUTED = '#8b92a7';
const DIVIDER = 'rgba(255,255,255,0.06)';
const HOVER_BG = 'rgba(255,255,255,0.05)';
const ACTIVE_BG = 'rgba(255,255,255,0.09)';

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
  officeName?: string;
  logoUrl?: string;
  isOfficeAdmin?: boolean;
  view?: 'broker' | 'office';
  userOffices?: Office[];
  activeOfficeId?: string;
  onClose?: () => void;
}

function buildNavGroups(role: string, isOfficeAdmin: boolean, view: 'broker' | 'office'): NavGroup[] {
  if (role === 'super_admin') {
    return [{
      items: [
        { href: '/admin',             icon: Shield,       label: 'Dashboard'  },
        { href: '/admin/offices',     icon: Building2,    label: 'Escritórios' },
        { href: '/admin/brokers',     icon: UserCog,      label: 'Mediadores'  },
        { href: '/admin/invitations', icon: UserPlus,     label: 'Convites'    },
        { href: '/admin/impersonate', icon: Users,        label: 'Impersonar'  },
        { href: '/admin/settings',    icon: Settings,     label: 'Definições'  },
        { href: '/admin/support',     icon: HelpCircle,   label: 'Suporte'     },
      ],
    }];
  }

  const operacao: NavGroup = {
    groupLabel: 'Operação',
    items: [
      { href: '/dashboard',          icon: LayoutDashboard, label: 'Dashboard' },
      { href: '/dashboard/processes', icon: FolderKanban,   label: 'Processos' },
      { href: '/dashboard/clients',   icon: Users,          label: 'Clientes'  },
      { href: '/dashboard/leads',     icon: Inbox,          label: 'Leads'     },
    ],
  };

  // Office admin acting as broker sees only OPERAÇÃO
  if (!isOfficeAdmin || view === 'broker') return [operacao];

  return [
    operacao,
    {
      groupLabel: 'Parceiros',
      items: [
        { href: '/dashboard/office/bank-contacts', icon: Landmark, label: 'Contactos bancários' },
      ],
    },
    {
      groupLabel: 'Escritório',
      items: [
        { href: '/dashboard/mediadores', icon: UserCog,   label: 'Mediadores' },
        { href: '/dashboard/office',     icon: Settings,  label: 'Definições' },
      ],
    },
  ];
}

export function Sidebar({
  role,
  userName,
  officeName,
  logoUrl,
  isOfficeAdmin = false,
  view = 'office',
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
  }

  const isActive = (href: string) => {
    if (href === '/dashboard' || href === '/admin') {
      return pathname === href || pathname === `${href}/`;
    }
    if (href === '/dashboard/office') {
      return pathname === '/dashboard/office' || pathname === '/dashboard/office/';
    }
    return pathname.startsWith(href);
  };

  const navGroups = buildNavGroups(role, isOfficeAdmin, view);
  const multiOffice = userOffices.length > 1;
  const displayOfficeName = officeName ?? (role === 'super_admin' ? 'Super Admin' : 'HomeFlux');
  const officeInitials = displayOfficeName.slice(0, 2).toUpperCase();

  const userInitials = userName.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
  const roleLabel = role === 'super_admin' ? 'Super Admin' : isOfficeAdmin ? 'Office Admin' : 'Mediador';

  return (
    <aside style={{
      width: 232,
      minWidth: 232,
      height: '100%',
      background: BG,
      color: INK,
      display: 'flex',
      flexDirection: 'column',
      borderRight: '1px solid #000',
    }}>
      {/* Brand */}
      <div style={{
        height: 64,
        padding: '0 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        borderBottom: `1px solid ${DIVIDER}`,
        flexShrink: 0,
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8, background: ACCENT,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Home size={15} strokeWidth={2} color="#fff" />
        </div>
        <span style={{ fontWeight: 600, fontSize: 15, letterSpacing: -0.2, color: INK }}>
          HomeFlux
        </span>
      </div>

      {/* Office context */}
      {role !== 'super_admin' && (
        <div style={{ padding: '12px 12px 4px', flexShrink: 0 }}>
          {multiOffice ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button disabled={switching} style={{
                  width: '100%', display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', padding: '7px 10px',
                  borderRadius: 8, background: HOVER_BG, border: 0, cursor: 'pointer',
                  gap: 8,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <OfficeBadge logoUrl={logoUrl} initials={officeInitials} accent={ACCENT} />
                    <span style={{ fontSize: 12.5, fontWeight: 500, color: INK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {displayOfficeName}
                    </span>
                  </div>
                  <ChevronDown size={13} color={MUTED} style={{ flexShrink: 0 }} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" sideOffset={4} className="w-52">
                {userOffices.map((office) => (
                  <DropdownMenuItem key={office.id} onClick={() => switchOffice(office.id)} className="flex items-center gap-2">
                    <span className="flex-1 truncate">{office.name}</span>
                    {office.id === activeOfficeId && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '7px 10px', borderRadius: 8, background: HOVER_BG,
            }}>
              <OfficeBadge logoUrl={logoUrl} initials={officeInitials} accent={ACCENT} />
              <span style={{ fontSize: 12.5, fontWeight: 500, color: INK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {displayOfficeName}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Nav */}
      <nav style={{ flex: 1, padding: '6px 12px', overflowY: 'auto' }}>
        {navGroups.map((group, gi) => (
          <div key={gi} style={{ marginTop: gi === 0 ? 6 : 20 }}>
            {group.groupLabel && (
              <div style={{
                fontSize: 10.5, letterSpacing: 0.8, textTransform: 'uppercase',
                color: MUTED, padding: '4px 10px 6px', fontWeight: 600,
              }}>
                {group.groupLabel}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {group.items.map(({ href, icon: Icon, label }) => {
                const active = isActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    prefetch={false}
                    onClick={onClose}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      gap: 10, padding: '8px 10px', borderRadius: 8, textDecoration: 'none',
                      background: active ? ACTIVE_BG : 'transparent',
                      color: active ? '#fff' : INK,
                      position: 'relative',
                      transition: 'background 0.12s',
                    }}
                    onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = HOVER_BG; }}
                    onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    {active && (
                      <span style={{
                        position: 'absolute', left: -12, top: 8, bottom: 8,
                        width: 2.5, background: ACCENT, borderRadius: 999,
                      }} />
                    )}
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                      <Icon size={16} strokeWidth={1.6} style={{ opacity: active ? 1 : 0.75, flexShrink: 0 }} />
                      <span style={{ fontSize: 13.5, fontWeight: active ? 500 : 400 }}>{label}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div style={{
        padding: '10px 12px',
        borderTop: `1px solid ${DIVIDER}`,
        display: 'flex', alignItems: 'center', gap: 10,
        flexShrink: 0,
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%', background: ACCENT,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 11, fontWeight: 600, flexShrink: 0,
        }}>
          {userInitials}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 12.5, fontWeight: 500, color: '#fff', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {userName}
          </div>
          <div style={{ fontSize: 11, color: MUTED, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {roleLabel}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button style={{ background: 'none', border: 0, cursor: 'pointer', padding: 4, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
              <MoreHorizontal size={14} color={MUTED} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings" className="flex items-center gap-2" onClick={onClose}>
                <User className="h-4 w-4" />Perfil
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings/password" className="flex items-center gap-2" onClick={onClose}>
                <KeyRound className="h-4 w-4" />Alterar password
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive flex items-center gap-2" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />Terminar sessão
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}

function OfficeBadge({ logoUrl, initials, accent }: { logoUrl?: string; initials: string; accent: string }) {
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={logoUrl} alt="" style={{ width: 22, height: 22, borderRadius: 6, objectFit: 'contain', flexShrink: 0 }} />
    );
  }
  return (
    <div style={{
      width: 22, height: 22, borderRadius: 6, background: '#fff',
      color: accent, fontWeight: 700, fontSize: 10,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}
