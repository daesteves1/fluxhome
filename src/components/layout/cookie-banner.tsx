'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

const COOKIE_KEY = 'homeflux_cookie_consent';

export function CookieBanner() {
  const t = useTranslations('gdpr');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_KEY);
    if (!consent) setVisible(true);
  }, []);

  function accept() {
    localStorage.setItem(COOKIE_KEY, 'accepted');
    setVisible(false);
  }

  function reject() {
    localStorage.setItem(COOKIE_KEY, 'rejected');
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t shadow-lg">
      <div className="max-w-5xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
        <p className="text-sm text-muted-foreground flex-1">
          {t('cookieBannerText')}{' '}
          <Link href="/cookies" className="text-primary underline underline-offset-2">
            {t('cookiePolicy')}
          </Link>
          {' '}{t('and')}{' '}
          <Link href="/privacy" className="text-primary underline underline-offset-2">
            {t('privacyPolicy')}
          </Link>
          .
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={reject}>
            {t('reject')}
          </Button>
          <Button size="sm" onClick={accept}>
            {t('accept')}
          </Button>
        </div>
      </div>
    </div>
  );
}
