'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { Sidebar } from './sidebar';
import { TopBar } from './topbar';
import { ImpersonationBanner } from './impersonation-banner';
import { HelpCenter } from './help-center';

interface Office {
  id: string;
  name: string;
  logoUrl?: string;
}

interface MobileLayoutShellProps {
  role: 'super_admin' | 'office_admin' | 'broker';
  userName: string;
  userEmail: string;
  officeName?: string;
  logoUrl?: string;
  primaryColor?: string;
  isOfficeAdmin?: boolean;
  currentView?: 'broker' | 'office';
  impersonatedName?: string | null;
  userOffices?: Office[];
  activeOfficeId?: string;
  children: React.ReactNode;
}

export function MobileLayoutShell({
  role,
  userName,
  officeName,
  logoUrl,
  isOfficeAdmin,
  currentView,
  impersonatedName,
  userOffices,
  activeOfficeId,
  children,
}: MobileLayoutShellProps) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [view, setView] = useState<'broker' | 'office'>(currentView ?? 'office');
  const [switching, setSwitching] = useState(false);

  async function handleToggleView(next: 'broker' | 'office') {
    if (next === view || switching) return;
    setSwitching(true);
    setView(next); // immediate UI update
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

  const sidebarProps = {
    role,
    userName,
    officeName,
    logoUrl,
    isOfficeAdmin,
    view,
    userOffices,
    activeOfficeId,
  };

  return (
    <div>
      {impersonatedName && <ImpersonationBanner impersonatedName={impersonatedName} />}

      <div style={{ display: 'flex', minHeight: '100vh' }}>
        {/* Desktop sidebar */}
        <div className="hidden md:flex shrink-0" style={{ position: 'sticky', top: 0, height: '100vh', alignSelf: 'flex-start' }}>
          <Sidebar {...sidebarProps} />
        </div>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div className="md:hidden">
            <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setSidebarOpen(false)} />
            <div className="fixed inset-y-0 left-0 z-50 w-[260px] flex flex-col shadow-2xl">
              <div className="absolute top-3 right-3 z-10">
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <Sidebar {...sidebarProps} onClose={() => setSidebarOpen(false)} />
            </div>
          </div>
        )}

        {/* Main area */}
        <div className="flex flex-col flex-1 min-w-0">
          <TopBar
            onMenuToggle={() => setSidebarOpen(true)}
            onHelpOpen={() => setHelpOpen(true)}
            isOfficeAdmin={isOfficeAdmin}
            view={view}
            switching={switching}
            onToggleView={handleToggleView}
          />
          <main className="flex-1 bg-slate-50">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
              {children}
            </div>
          </main>
        </div>
      </div>
      <HelpCenter open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
