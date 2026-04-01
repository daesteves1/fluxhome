import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FluxHome',
  description: 'Plataforma de mediação de crédito habitação',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
