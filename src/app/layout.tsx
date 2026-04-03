import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { Toaster } from '@/components/ui/sonner';
import { CookieBanner } from '@/components/layout/cookie-banner';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'HomeFlux',
  description: 'Plataforma de mediação de crédito habitação',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const messages = await getMessages();

  return (
    <html lang="pt" className={inter.variable}>
      <body className="antialiased min-h-screen bg-background">
        <NextIntlClientProvider messages={messages} locale="pt">
          {children}
          <CookieBanner />
          <Toaster richColors position="top-right" />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
