import { notFound, redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Calendar, Plus } from 'lucide-react';
import { ProcessStepBadge } from '@/components/dashboard/process-step-badge';
import { formatDate, formatCurrency } from '@/lib/utils';
import type { ProcessStep, ProcessTipo } from '@/types/database';

const TIPO_LABELS: Record<ProcessTipo, string> = {
  credito_habitacao: 'Crédito Habitação',
  renegociacao: 'Renegociação',
  construcao: 'Construção',
  outro: 'Outro',
};

const TIPO_COLORS: Record<ProcessTipo, string> = {
  credito_habitacao: 'bg-blue-100 text-blue-700',
  renegociacao: 'bg-amber-100 text-amber-700',
  construcao: 'bg-teal-100 text-teal-700',
  outro: 'bg-slate-100 text-slate-600',
};

interface PageProps { params: Promise<{ id: string }> }

export default async function ClientProfilePage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const serviceClient = await createServiceClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: clientRaw, error } = await serviceClient
    .from('clients').select('*').eq('id', id).single();
  if (error || !clientRaw) notFound();

  const client = clientRaw as {
    id: string; broker_id: string; office_id: string;
    p1_name: string; p1_nif: string | null; p1_email: string | null; p1_phone: string | null;
    p1_employment_type: string | null; p1_birth_date: string | null;
    p2_name: string | null; p2_nif: string | null; p2_email: string | null; p2_phone: string | null;
    p2_employment_type: string | null; p2_birth_date: string | null;
    portal_token: string; created_at: string; updated_at: string;
  };

  // Fetch processes for this client
  const { data: processesRaw } = await serviceClient
    .from('processes').select('*').eq('client_id', id).order('created_at', { ascending: false });
  const processes = (processesRaw ?? []) as {
    id: string; tipo: ProcessTipo; process_step: ProcessStep;
    montante_solicitado: number | null; prazo_meses: number | null;
    created_at: string; closed_at: string | null;
    followup_at: string | null; followup_note: string | null;
  }[];

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link href="/dashboard/clients" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ChevronLeft className="h-4 w-4" /> Clientes
      </Link>

      {/* Identity card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">{client.p1_name}</h1>
            {client.p2_name && <p className="text-sm text-slate-400 mt-0.5">+ {client.p2_name}</p>}
            <p className="text-xs text-slate-400 mt-1">Cliente desde {formatDate(client.created_at)}</p>
          </div>
          <Link
            href={`/dashboard/processes/new?client_id=${client.id}`}
            className="inline-flex items-center h-9 px-3 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shrink-0"
          >
            <Plus className="h-4 w-4 mr-1" /> Novo processo
          </Link>
        </div>

        {/* P1 identity */}
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Proponente 1</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            {client.p1_email && <div><p className="text-[10px] text-slate-400">Email</p><p className="text-sm text-slate-700">{client.p1_email}</p></div>}
            {client.p1_phone && <div><p className="text-[10px] text-slate-400">Telefone</p><p className="text-sm text-slate-700">{client.p1_phone}</p></div>}
            {client.p1_nif && <div><p className="text-[10px] text-slate-400">NIF</p><p className="text-sm text-slate-700">{client.p1_nif}</p></div>}
            {client.p1_birth_date && <div><p className="text-[10px] text-slate-400">Data de nascimento</p><p className="text-sm text-slate-700">{formatDate(client.p1_birth_date)}</p></div>}
          </div>
        </div>

        {/* P2 identity */}
        {client.p2_name && (
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Proponente 2</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              <div><p className="text-[10px] text-slate-400">Nome</p><p className="text-sm text-slate-700">{client.p2_name}</p></div>
              {client.p2_email && <div><p className="text-[10px] text-slate-400">Email</p><p className="text-sm text-slate-700">{client.p2_email}</p></div>}
              {client.p2_phone && <div><p className="text-[10px] text-slate-400">Telefone</p><p className="text-sm text-slate-700">{client.p2_phone}</p></div>}
              {client.p2_nif && <div><p className="text-[10px] text-slate-400">NIF</p><p className="text-sm text-slate-700">{client.p2_nif}</p></div>}
            </div>
          </div>
        )}
      </div>

      {/* Processes list */}
      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Processos ({processes.length})</h2>
        {processes.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl py-10 text-center">
            <p className="text-sm text-slate-400 mb-3">Nenhum processo criado ainda</p>
            <Link
              href={`/dashboard/processes/new?client_id=${client.id}`}
              className="inline-flex items-center h-9 px-4 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Plus className="h-4 w-4 mr-1" /> Criar primeiro processo
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {processes.map((proc) => (
              <Link
                key={proc.id}
                href={`/dashboard/processes/${proc.id}`}
                className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4 hover:border-slate-300 hover:shadow-sm transition-all group"
              >
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TIPO_COLORS[proc.tipo]}`}>
                      {TIPO_LABELS[proc.tipo]}
                    </span>
                    <ProcessStepBadge step={proc.process_step} />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                    {proc.montante_solicitado && (
                      <span>{formatCurrency(proc.montante_solicitado)}</span>
                    )}
                    {proc.prazo_meses && <span>{proc.prazo_meses} meses</span>}
                    <span>
                      {formatDate(proc.created_at)}
                      {proc.closed_at ? ` → ${formatDate(proc.closed_at)}` : ' · Em curso'}
                    </span>
                    {proc.followup_at && (
                      <span className="flex items-center gap-1 text-amber-600">
                        <Calendar className="h-3 w-3" />
                        Seguimento: {formatDate(proc.followup_at)}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
