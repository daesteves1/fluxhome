import { createServiceClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { OfficeDetailTabs } from '@/components/admin/office-detail-tabs';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminOfficeDetailPage({ params }: PageProps) {
  const { id } = await params;
  const serviceClient = await createServiceClient();

  const { data: officeRaw } = await serviceClient
    .from('offices')
    .select('id, name, is_active, created_at, settings, white_label, document_template')
    .eq('id', id)
    .single();

  if (!officeRaw) notFound();

  const office = officeRaw as unknown as {
    id: string;
    name: string;
    is_active: boolean;
    created_at: string;
    settings: Record<string, unknown> | null;
    white_label: { logo_url?: string | null; primary_color?: string } | null;
    document_template: import('@/lib/document-defaults').OfficeDocTemplate[] | null;
  };

  const [{ count: brokersCount }, { count: clientsCount }] = await Promise.all([
    serviceClient
      .from('brokers')
      .select('*', { count: 'exact', head: true })
      .eq('office_id', id)
      .eq('is_active', true),
    serviceClient
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .eq('office_id', id),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/offices"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"
        >
          <ChevronLeft className="h-4 w-4" />
          Escritórios
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">{office.name}</h1>
      </div>

      <OfficeDetailTabs
        office={office}
        brokersCount={brokersCount ?? 0}
        clientsCount={clientsCount ?? 0}
      />
    </div>
  );
}
