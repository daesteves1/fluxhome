'use client';

import { useState } from 'react';
import { cn, formatDate } from '@/lib/utils';
import { Phone, Mail, MapPin, ChevronDown, ChevronUp, MessageSquare, ExternalLink, UserPlus } from 'lucide-react';
import Link from 'next/link';

const STATUS_OPTIONS = [
  { value: 'novo', label: 'Novo', color: 'bg-blue-100 text-blue-700' },
  { value: 'visto', label: 'Visto', color: 'bg-slate-100 text-slate-600' },
  { value: 'em_contacto', label: 'Em contacto', color: 'bg-amber-100 text-amber-700' },
  { value: 'qualificado', label: 'Qualificado', color: 'bg-purple-100 text-purple-700' },
  { value: 'convertido', label: 'Convertido', color: 'bg-green-100 text-green-700' },
  { value: 'descartado', label: 'Descartado', color: 'bg-red-100 text-red-600' },
] as const;

type LeadStatus = (typeof STATUS_OPTIONS)[number]['value'];

const TIPO_LABELS: Record<string, string> = {
  aquisicao: 'Aquisição',
  construcao: 'Construção',
  refinanciamento: 'Refinanciamento',
  transferencia: 'Transferência',
};

const HORARIO_LABELS: Record<string, string> = {
  manha: 'Manhã',
  tarde: 'Tarde',
  qualquer: 'Qualquer hora',
};

const STATUS_FILTERS = [{ value: '', label: 'Todos' }, ...STATUS_OPTIONS];

type Lead = {
  id: string;
  p1_nome: string;
  p1_email: string | null;
  p1_telefone: string | null;
  p2_nome: string | null;
  tipo_operacao: string;
  valor_imovel: number | null;
  montante_pretendido: number | null;
  localizacao_imovel: string | null;
  horario_preferencial: string | null;
  status: string;
  assigned_broker_id: string | null;
  converted_client_id: string | null;
  created_at: string;
  mensagem: string | null;
};

interface Props {
  leads: Lead[];
  officeId: string;
  leadCaptureEnabled: boolean;
}

export function LeadsView({ leads, leadCaptureEnabled }: Props) {
  const [filter, setFilter] = useState('');
  const [statuses, setStatuses] = useState<Record<string, LeadStatus>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [converting, setConverting] = useState<string | null>(null);
  // leadId → clientId after successful conversion
  const [converted, setConverted] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    leads.forEach((l) => { if (l.converted_client_id) initial[l.id] = l.converted_client_id; });
    return initial;
  });

  const filtered = filter ? leads.filter((l) => l.status === filter) : leads;

  function getStatus(lead: Lead): LeadStatus {
    return (statuses[lead.id] ?? lead.status) as LeadStatus;
  }

  async function updateStatus(leadId: string, newStatus: LeadStatus) {
    setUpdating(leadId);
    setStatuses((prev) => ({ ...prev, [leadId]: newStatus }));
    try {
      await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch {
      // silently revert on error
      setStatuses((prev) => {
        const next = { ...prev };
        delete next[leadId];
        return next;
      });
    } finally {
      setUpdating(null);
    }
  }

  async function convertLead(leadId: string) {
    setConverting(leadId);
    try {
      const res = await fetch(`/api/leads/${leadId}/convert`, { method: 'POST' });
      const body = await res.json() as { clientId?: string; error?: string };
      if (res.ok && body.clientId) {
        setConverted((prev) => ({ ...prev, [leadId]: body.clientId! }));
        setStatuses((prev) => ({ ...prev, [leadId]: 'convertido' }));
      }
    } finally {
      setConverting(null);
    }
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

  const statusConfig = (s: string) =>
    STATUS_OPTIONS.find((o) => o.value === s) ?? STATUS_OPTIONS[0];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-900">Leads</h1>
        {!leadCaptureEnabled && (
          <Link
            href="/dashboard/office"
            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
          >
            Ativar captura de leads <ExternalLink className="h-3 w-3" />
          </Link>
        )}
      </div>

      {/* Status filters */}
      <div className="flex flex-wrap gap-1.5">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
              filter === f.value
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
            )}
          >
            {f.label}
            {f.value === '' && (
              <span className="ml-1.5 text-slate-400">{leads.length}</span>
            )}
            {f.value !== '' && (
              <span className="ml-1.5 text-slate-400">
                {leads.filter((l) => l.status === f.value).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-sm text-slate-500">
          {leads.length === 0
            ? leadCaptureEnabled
              ? 'Nenhum lead ainda. Partilhe a sua página de captação.'
              : 'Active a captura de leads para começar a receber contactos.'
            : 'Nenhum lead com este estado.'}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((lead) => {
            const st = getStatus(lead);
            const stCfg = statusConfig(st);
            const expanded = expandedId === lead.id;

            return (
              <div key={lead.id} className="rounded-xl border bg-white overflow-hidden">
                {/* Row */}
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => setExpandedId(expanded ? null : lead.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-slate-900 truncate">{lead.p1_nome}</p>
                      {lead.p2_nome && (
                        <span className="text-xs text-slate-400">& {lead.p2_nome}</span>
                      )}
                      <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', stCfg.color)}>
                        {stCfg.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className="text-xs text-slate-500">{TIPO_LABELS[lead.tipo_operacao] ?? lead.tipo_operacao}</span>
                      {lead.localizacao_imovel && (
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          <MapPin className="h-3 w-3" />{lead.localizacao_imovel}
                        </span>
                      )}
                      {lead.valor_imovel && (
                        <span className="text-xs text-slate-400">{fmt(lead.valor_imovel)}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-slate-400 hidden sm:block">{formatDate(lead.created_at)}</span>
                    {expanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                  </div>
                </div>

                {/* Expanded detail */}
                {expanded && (
                  <div className="border-t px-4 py-4 space-y-4 bg-slate-50/50">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Contact info */}
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Contacto</p>
                        {lead.p1_telefone && (
                          <a
                            href={`tel:${lead.p1_telefone}`}
                            className="flex items-center gap-2 text-sm text-slate-700 hover:text-blue-600"
                          >
                            <Phone className="h-3.5 w-3.5" /> {lead.p1_telefone}
                          </a>
                        )}
                        {lead.p1_email && (
                          <a
                            href={`mailto:${lead.p1_email}`}
                            className="flex items-center gap-2 text-sm text-slate-700 hover:text-blue-600"
                          >
                            <Mail className="h-3.5 w-3.5" /> {lead.p1_email}
                          </a>
                        )}
                        {lead.horario_preferencial && (
                          <p className="text-sm text-slate-500">
                            Horário: <span className="text-slate-700">{HORARIO_LABELS[lead.horario_preferencial] ?? lead.horario_preferencial}</span>
                          </p>
                        )}
                      </div>

                      {/* Financial */}
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Operação</p>
                        <p className="text-sm text-slate-700">{TIPO_LABELS[lead.tipo_operacao] ?? lead.tipo_operacao}</p>
                        {lead.montante_pretendido && (
                          <p className="text-sm text-slate-500">
                            Montante: <span className="text-slate-700 font-medium">{fmt(lead.montante_pretendido)}</span>
                          </p>
                        )}
                        {lead.valor_imovel && (
                          <p className="text-sm text-slate-500">
                            Valor imóvel: <span className="text-slate-700 font-medium">{fmt(lead.valor_imovel)}</span>
                          </p>
                        )}
                        {lead.localizacao_imovel && (
                          <p className="text-sm text-slate-500">
                            Localização: <span className="text-slate-700">{lead.localizacao_imovel}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Message */}
                    {lead.mensagem && (
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" /> Mensagem
                        </p>
                        <p className="text-sm text-slate-700 whitespace-pre-line">{lead.mensagem}</p>
                      </div>
                    )}

                    {/* Convert to client */}
                    <div className="flex items-center justify-between pt-1 border-t">
                      {converted[lead.id] ? (
                        <Link
                          href={`/dashboard/clients/${converted[lead.id]}`}
                          className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-700 hover:text-green-800"
                        >
                          <UserPlus className="h-4 w-4" />
                          Ver ficha do cliente
                        </Link>
                      ) : (
                        <button
                          disabled={converting === lead.id}
                          onClick={() => convertLead(lead.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-700 transition-colors disabled:opacity-60"
                        >
                          <UserPlus className="h-4 w-4" />
                          {converting === lead.id ? 'A converter...' : 'Converter em cliente'}
                        </button>
                      )}
                      <p className="text-xs text-slate-400">{formatDate(lead.created_at)}</p>
                    </div>

                    {/* Status update */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-slate-500 font-medium">Estado:</span>
                      {STATUS_OPTIONS.map((o) => (
                        <button
                          key={o.value}
                          disabled={updating === lead.id}
                          onClick={() => updateStatus(lead.id, o.value)}
                          className={cn(
                            'px-2.5 py-1 rounded-full text-xs font-medium border transition-colors disabled:opacity-60',
                            st === o.value
                              ? cn(o.color, 'border-transparent')
                              : 'border-slate-200 text-slate-500 hover:border-slate-300 bg-white'
                          )}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
