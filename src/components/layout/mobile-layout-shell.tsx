'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { Sidebar } from './sidebar';
import { TopBar } from './topbar';
import { ImpersonationBanner } from './impersonation-banner';

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
  children: React.ReactNode;
}

export function MobileLayoutShell({
  role,
  userName,
  userEmail,
  officeName,
  logoUrl,
  primaryColor,
  isOfficeAdmin,
  currentView,
  impersonatedName,
  children,
}: MobileLayoutShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const sidebarProps = { role, userName, userEmail, officeName, logoUrl, primaryColor, isOfficeAdmin, currentView };

  return (
    <div>
      {/* Impersonation banner spans full width — above sidebar */}
      {impersonatedName && <ImpersonationBanner impersonatedName={impersonatedName} />}

      <div style={{ display: 'flex', minHeight: '100vh' }}>
        {/* Desktop sidebar — hidden below md */}
        <div className="hidden md:flex shrink-0">
          <Sidebar {...sidebarProps} />
        </div>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div className="md:hidden">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setSidebarOpen(false)}
            />
            {/* Panel */}
            <div className="fixed inset-y-0 left-0 z-50 w-[280px] flex flex-col shadow-2xl">
              <div className="absolute top-3 right-3 z-10">
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                  aria-label="Fechar menu"
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
          <TopBar userName={userName} onMenuToggle={() => setSidebarOpen(true)} />
          <main className="flex-1 bg-slate-50">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
