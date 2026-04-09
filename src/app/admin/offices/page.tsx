import { createServiceClient } from '@/lib/supabase/server';
import { AdminOfficesTable } from '@/components/admin/admin-offices-table';

export default async function AdminOfficesPage() {
  const serviceClient = await createServiceClient();

  const { data: officesRaw } = await serviceClient
    .from('offices')
    .select('id, name, is_active, created_at')
    .order('name');

  type Office = { id: string; name: string; is_active: boolean; created_at: string };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Escritórios</h1>
      <AdminOfficesTable offices={(officesRaw ?? []) as Office[]} />
    </div>
  );
}
