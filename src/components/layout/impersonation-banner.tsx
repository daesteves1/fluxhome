'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ImpersonationBannerProps {
  impersonatedName: string;
}

export function ImpersonationBanner({ impersonatedName }: ImpersonationBannerProps) {
  const t = useTranslations('admin');
  const router = useRouter();

  async function exitImpersonation() {
    await fetch('/api/admin/impersonate/exit', { method: 'POST' });
    router.push('/admin');
    router.refresh();
  }

  return (
    <div className="sticky top-0 z-50 flex items-center justify-between gap-4 bg-red-600 px-6 py-2 text-white text-sm font-medium">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>{t('impersonationBanner', { name: impersonatedName })}</span>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="border-white/50 text-white hover:bg-red-700 hover:text-white bg-transparent h-7"
        onClick={exitImpersonation}
      >
        {t('exitImpersonation')}
      </Button>
    </div>
  );
}
