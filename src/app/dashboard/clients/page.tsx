export const dynamic = 'force-dynamic';

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';

export default async function ClientsPage() {
  const supabase = await createClient();
  const serviceClient = await createServiceClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: userProfileRaw } = await serviceClient
    .from('users').select('id, role').eq('id', user.id).single();
  const userProfile = userProfileRaw as { id: string; role: string } | null;

  const { data: brokerRaw } = await serviceClient
    .from('brokers').select('id, office_id, is_office_admin')
    .eq('user_id', user.id).eq('is_active', true).single();
  const broker = brokerRaw as { id: string; office_id: string; is_office_admin: boolean } | null;

  if (!broker && userProfile?.role !== 'super_admin') redirect('/login');

  const cookieStore = await cookies();
  const viewCookie = cookieStore.get('homeflux_view')?.value as 'broker' | 'office' | undefined;
  const showOwnOnly =
    userProfile?.role === 'broker' ||
    (broker?.is_office_admin && viewCookie === 'broker');

  type ClientRow = {
    id: string;
    p1_name: string;
    p1_email: string | null;
    p1_phone: string | null;
    p2_name: string | null;
    created_at: string;
    broker_id: string;
    brokers: { users: { name: string } | null } | null;
  };

  let clients: ClientRow[] = [];

  if (showOwnOnly && broker) {
    const { data } = await serviceClient
      .from('clients')
      .select('id, p1_name, p1_email, p1_phone, p2_name, created_at, broker_id')
      .eq('broker_id', broker.id)
      .order('p1_name', { ascending: true });
    clients = (data ?? []) as unknown as ClientRow[];
  } else if (broker?.office_id) {
    const { data } = await serviceClient
      .from('clients')
      .select('id, p1_name, p1_email, p1_phone, p2_name, created_at, broker_id, brokers(users(name))')
      .eq('office_id', broker.office_id)
      .order('p1_name', { ascending: true });
    clients = (data ?? []) as unknown as ClientRow[];
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Clientes</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {clients.length} {clients.length === 1 ? 'cliente' : 'clientes'}
          </p>
        </div>
        <Link
          href="/dashboard/clients/new"
          className="inline-flex items-center h-9 px-4 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          + Novo cliente
        </Link>
      </div>

      {clients.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl py-12 text-center">
          <p className="text-sm text-slate-400">Nenhum cliente ainda</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
          {/* Header row */}
          <div className="flex items-center gap-4 px-4 py-2 bg-slate-50">
            <div className="w-8 shrink-0" />
            <p className="flex-1 min-w-0 text-xs font-medium text-slate-400 uppercase tracking-wide">Nome</p>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide shrink-0 hidden sm:block w-20 text-right">Criado em</p>
            <div className="w-4 shrink-0" />
          </div>
          {clients.map((client) => (
            <Link
              key={client.id}
              href={`/dashboard/clients/${client.id}`}
              className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50 transition-colors group"
            >
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold shrink-0">
                {client.p1_name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {client.p1_name}
                  {client.p2_name && (
                    <span className="text-slate-400 font-normal ml-1.5">+ {client.p2_name}</span>
                  )}
                </p>
                <p className="text-xs text-slate-400 truncate">
                  {client.p1_email ?? '—'}
                  {!showOwnOnly && (client.brokers?.users as { name: string } | null)?.name && (
                    <span className="ml-2">· {(client.brokers?.users as { name: string }).name}</span>
                  )}
                </p>
              </div>
              <p className="text-xs text-slate-400 shrink-0 hidden sm:block">
                {formatDate(client.created_at)}
              </p>
              <ChevronRight className="h-4 w-4 text-slate-300 shrink-0 group-hover:text-slate-400 transition-colors" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
