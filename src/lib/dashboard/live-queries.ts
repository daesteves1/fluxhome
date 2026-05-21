import { createAdminClient } from '@/lib/supabase/server';
import type { DashboardScope, ActionQueues, ActionQueueItem } from './types';

type ScopeFilter = { field: 'broker_id' | 'office_id'; value: string };

function scopeFilter(scope: DashboardScope): ScopeFilter {
  if (scope.filterBrokerId) return { field: 'broker_id', value: scope.filterBrokerId };
  if (scope.view === 'broker') return { field: 'broker_id', value: scope.brokerId };
  return { field: 'office_id', value: scope.officeId };
}

function daysAgoIso(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function daysFromNowIso(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
}

function relativeLabel(iso: string): string {
  const days = Math.round((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Hoje';
  if (days === 1) return 'Ontem';
  if (days > 0) return `Há ${days} ${days === 1 ? 'dia' : 'dias'}`;
  const futureDays = Math.abs(days);
  if (futureDays === 1) return 'Amanhã';
  return `Em ${futureDays} dias`;
}

function urgency(iso: string): 0 | 1 | 2 {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff < 0) return 0;
  if (diff < 24 * 60 * 60 * 1000) return 1;
  return 2;
}

export async function loadActionQueues(scope: DashboardScope): Promise<ActionQueues> {
  const admin = createAdminClient();
  const { field, value } = scopeFilter(scope);

  const today = new Date().toISOString().split('T')[0];
  const in7days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Run all independent queries in parallel
  const [
    followupResult,
    docsPendingResult,
    docsAnalysisResult,
    expiringResult,
    waitingResult,
    paradosResult,
    leadsResult,
  ] = await Promise.all([
    // 1. Follow-ups
    admin
      .from('processes')
      .select('id, followup_at, followup_note, clients(p1_name), brokers(users(name))')
      .eq(field, value)
      .not('followup_at', 'is', null)
      .is('followup_dismissed_at', null)
      .lte('followup_at', daysFromNowIso(7))
      .not('process_step', 'in', '("closed")')
      .order('followup_at', { ascending: true })
      .limit(20),

    // 2. Docs pending >5 days
    admin
      .from('document_requests')
      .select('id, label, process_id, created_at, processes!inner(id, broker_id, office_id, clients(p1_name), brokers(users(name)))')
      .eq(`processes.${field}`, value)
      .eq('status', 'pending')
      .lte('created_at', daysAgoIso(5))
      .order('created_at', { ascending: true })
      .limit(20),

    // 3. Docs em análise >3 days
    admin
      .from('document_requests')
      .select('id, label, process_id, created_at, processes!inner(id, broker_id, office_id, clients(p1_name), brokers(users(name)))')
      .eq(`processes.${field}`, value)
      .eq('status', 'em_analise')
      .lte('created_at', daysAgoIso(3))
      .order('created_at', { ascending: true })
      .limit(20),

    // 4. Propostas expiring ≤7 days
    admin
      .from('bank_propostas')
      .select('id, bank_name, validade_ate, process_id, processes!inner(id, broker_id, office_id, process_step, clients(p1_name), brokers(users(name)))')
      .eq(`processes.${field}`, value)
      .not('processes.process_step', 'in', '("closed")')
      .gte('validade_ate', today)
      .lte('validade_ate', in7days)
      .order('validade_ate', { ascending: true })
      .limit(20),

    // 5. Propostas awaiting decision >10 days
    admin
      .from('processes')
      .select('id, updated_at, clients(p1_name), brokers(users(name))')
      .eq(field, value)
      .eq('process_step', 'propostas_sent')
      .lte('updated_at', daysAgoIso(10))
      .order('updated_at', { ascending: true })
      .limit(20),

    // 6. Processos parados >14 days
    admin
      .from('processes')
      .select('id, updated_at, clients(p1_name), brokers(users(name))')
      .eq(field, value)
      .not('process_step', 'in', '("closed")')
      .lte('updated_at', daysAgoIso(14))
      .order('updated_at', { ascending: true })
      .limit(20),

    // 7. Leads not contacted >24h
    admin
      .from('processes')
      .select('id, created_at, clients(p1_name), brokers(users(name))')
      .eq(field, value)
      .eq('process_step', 'lead')
      .lte('created_at', daysAgoIso(1))
      .order('created_at', { ascending: true })
      .limit(40),
  ]);

  // Broker notes lookup depends on lead IDs — run after
  const leadProcessIds = ((leadsResult.data ?? []) as unknown as { id: string }[]).map((p) => p.id);
  let contactedIds = new Set<string>();
  if (leadProcessIds.length > 0) {
    const { data: notesRaw } = await admin
      .from('broker_notes')
      .select('process_id')
      .in('process_id', leadProcessIds);
    contactedIds = new Set(
      ((notesRaw ?? []) as { process_id: string | null }[])
        .map((n) => n.process_id)
        .filter(Boolean) as string[]
    );
  }

  // ── Map results ────────────────────────────────────────────────────────────

  const followups: ActionQueueItem[] = (
    (followupResult.data ?? []) as unknown as {
      id: string;
      followup_at: string;
      followup_note: string | null;
      clients: { p1_name: string } | null;
      brokers: { users: { name: string } | null } | null;
    }[]
  ).map((p) => ({
    id: p.id,
    processId: p.id,
    clientName: p.clients?.p1_name ?? '—',
    label: p.followup_note ?? 'Follow-up agendado',
    statusLabel: relativeLabel(p.followup_at!),
    urgency: urgency(p.followup_at!),
    brokerName: p.brokers?.users?.name,
  }));

  const docsPending: ActionQueueItem[] = (
    (docsPendingResult.data ?? []) as unknown as {
      id: string;
      label: string;
      process_id: string | null;
      created_at: string;
      processes: {
        id: string;
        clients: { p1_name: string } | null;
        brokers: { users: { name: string } | null } | null;
      } | null;
    }[]
  ).map((d) => ({
    id: d.id,
    processId: d.process_id ?? d.processes?.id ?? '',
    clientName: d.processes?.clients?.p1_name ?? '—',
    label: `Doc em falta: ${d.label}`,
    statusLabel: relativeLabel(d.created_at),
    urgency: 0 as const,
    brokerName: d.processes?.brokers?.users?.name,
  }));

  const docsAnalysis: ActionQueueItem[] = (
    (docsAnalysisResult.data ?? []) as unknown as {
      id: string;
      label: string;
      process_id: string | null;
      created_at: string;
      processes: {
        id: string;
        clients: { p1_name: string } | null;
        brokers: { users: { name: string } | null } | null;
      } | null;
    }[]
  ).map((d) => ({
    id: d.id,
    processId: d.process_id ?? d.processes?.id ?? '',
    clientName: d.processes?.clients?.p1_name ?? '—',
    label: `Em análise: ${d.label}`,
    statusLabel: relativeLabel(d.created_at),
    urgency: 0 as const,
    brokerName: d.processes?.brokers?.users?.name,
  }));

  const propostasExpiring: ActionQueueItem[] = (
    (expiringResult.data ?? []) as unknown as {
      id: string;
      bank_name: string;
      validade_ate: string;
      process_id: string | null;
      processes: {
        id: string;
        clients: { p1_name: string } | null;
        brokers: { users: { name: string } | null } | null;
      } | null;
    }[]
  ).map((bp) => {
    const daysLeft = Math.round((new Date(bp.validade_ate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return {
      id: bp.id,
      processId: bp.process_id ?? bp.processes?.id ?? '',
      clientName: bp.processes?.clients?.p1_name ?? '—',
      label: `Proposta ${bp.bank_name} expira em ${daysLeft <= 0 ? 'hoje' : `${daysLeft} dias`}`,
      statusLabel: daysLeft <= 0 ? 'Hoje' : `Em ${daysLeft} dias`,
      urgency: (daysLeft <= 0 ? 0 : daysLeft <= 1 ? 1 : 2) as 0 | 1 | 2,
      brokerName: bp.processes?.brokers?.users?.name,
    };
  });

  const propostasWaiting: ActionQueueItem[] = (
    (waitingResult.data ?? []) as unknown as {
      id: string;
      updated_at: string;
      clients: { p1_name: string } | null;
      brokers: { users: { name: string } | null } | null;
    }[]
  ).map((p) => ({
    id: p.id,
    processId: p.id,
    clientName: p.clients?.p1_name ?? '—',
    label: 'Aguarda decisão do cliente',
    statusLabel: relativeLabel(p.updated_at),
    urgency: 0 as const,
    brokerName: p.brokers?.users?.name,
  }));

  const processosParados: ActionQueueItem[] = (
    (paradosResult.data ?? []) as unknown as {
      id: string;
      updated_at: string;
      clients: { p1_name: string } | null;
      brokers: { users: { name: string } | null } | null;
    }[]
  ).map((p) => ({
    id: p.id,
    processId: p.id,
    clientName: p.clients?.p1_name ?? '—',
    label: 'Processo sem atividade',
    statusLabel: `Parado ${relativeLabel(p.updated_at).toLowerCase()}`,
    urgency: 0 as const,
    brokerName: p.brokers?.users?.name,
  }));

  const leadsNaoContactados: ActionQueueItem[] = (
    (leadsResult.data ?? []) as unknown as {
      id: string;
      created_at: string;
      clients: { p1_name: string } | null;
      brokers: { users: { name: string } | null } | null;
    }[]
  )
    .filter((p) => !contactedIds.has(p.id))
    .slice(0, 20)
    .map((p) => ({
      id: p.id,
      processId: p.id,
      clientName: p.clients?.p1_name ?? '—',
      label: 'Lead sem contacto',
      statusLabel: relativeLabel(p.created_at),
      urgency: 0 as const,
      brokerName: p.brokers?.users?.name,
    }));

  return {
    followups,
    docs_pending: docsPending,
    docs_analysis: docsAnalysis,
    propostas_expiring: propostasExpiring,
    propostas_waiting: propostasWaiting,
    processos_parados: processosParados,
    leads_nao_contactados: leadsNaoContactados,
  };
}
