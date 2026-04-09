import { createServiceClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { BrokerDetailTabs } from '@/components/admin/broker-detail-tabs';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import type { PlatformSettings } from '@/lib/settings';
import type { BrokerSettingsOverride } from '@/lib/settings';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminBrokerDetailPage({ params }: PageProps) {
  const { id } = await params;
  const serviceClient = await createServiceClient();

  const { data: brokerRaw } = await serviceClient
    .from('brokers')
    .select('id, user_id, office_id, is_active, is_office_admin, activated_at, invited_at, settings')
    .eq('id', id)
    .single();

  if (!brokerRaw) notFound();

  const broker = brokerRaw as {
    id: string;
    user_id: string;
    office_id: string;
    is_active: boolean;
    is_office_admin: boolean;
    activated_at: string | null;
    invited_at: string | null;
    settings: BrokerSettingsOverride | null;
  };

  const [{ data: userRaw }, { data: officeRaw }] = await Promise.all([
    serviceClient.from('users').select('name, email').eq('id', broker.user_id).single(),
    serviceClient.from('offices').select('name, settings').eq('id', broker.office_id).single(),
  ]);

  const user = userRaw as { name: string; email: string } | null;
  const office = officeRaw as { name: string; settings: Partial<PlatformSettings> | null } | null;

  const brokerDetail = {
    ...broker,
    userName: user?.name ?? '—',
    userEmail: user?.email ?? '—',
    officeName: office?.name ?? '—',
    officeSettings: office?.settings ?? null,
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/brokers"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"
        >
          <ChevronLeft className="h-4 w-4" />
          Mediadores
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">{brokerDetail.userName}</h1>
        <p className="text-sm text-muted-foreground">{brokerDetail.userEmail}</p>
      </div>

      <BrokerDetailTabs broker={brokerDetail} />
    </div>
  );
}
