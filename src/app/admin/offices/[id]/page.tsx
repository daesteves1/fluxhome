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
    .select('id, name, slug, is_active, created_at, settings, white_label, document_template')
    .eq('id', id)
    .single();

  if (!officeRaw) notFound();

  // Fetch lead capture columns separately — they may not exist if migration 016 hasn't run yet
  let leadCols: {
    lead_capture_enabled: boolean;
    lead_capture_hero_title: string | null;
    lead_capture_hero_subtitle: string | null;
    lead_capture_primary_color: string | null;
    lead_capture_logo_url: string | null;
    bdp_intermediario_number: string | null;
    lead_capture_headline: string | null;
    lead_capture_subheadline: string | null;
    lead_capture_cta_label: string | null;
    lead_capture_show_bank_logos: boolean;
    website_url: string | null;
    office_nif: string | null;
    office_address: string | null;
  } = {
    lead_capture_enabled: false,
    lead_capture_hero_title: null,
    lead_capture_hero_subtitle: null,
    lead_capture_primary_color: null,
    lead_capture_logo_url: null,
    bdp_intermediario_number: null,
    lead_capture_headline: null,
    lead_capture_subheadline: null,
    lead_capture_cta_label: null,
    lead_capture_show_bank_logos: true,
    website_url: null,
    office_nif: null,
    office_address: null,
  };

  try {
    const { data: lcRaw } = await serviceClient
      .from('offices')
      .select('lead_capture_enabled, lead_capture_hero_title, lead_capture_hero_subtitle, lead_capture_primary_color, lead_capture_logo_url, bdp_intermediario_number, lead_capture_headline, lead_capture_subheadline, lead_capture_cta_label, lead_capture_show_bank_logos, website_url, office_nif, office_address')
      .eq('id', id)
      .single();
    if (lcRaw) {
      leadCols = lcRaw as unknown as typeof leadCols;
    }
  } catch {
    // Migration not yet applied — use defaults
  }

  const office = {
    ...(officeRaw as unknown as {
      id: string;
      name: string;
      slug: string;
      is_active: boolean;
      created_at: string;
      settings: Record<string, unknown> | null;
      white_label: { logo_url?: string | null; primary_color?: string } | null;
      document_template: import('@/lib/document-defaults').OfficeDocTemplate[] | null;
    }),
    ...leadCols,
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
