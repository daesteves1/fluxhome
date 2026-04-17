'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';

type TicketStatus = 'open' | 'in_progress' | 'resolved';

interface Ticket {
  id: string;
  subject: string;
  message: string;
  status: TicketStatus;
  created_at: string;
  user_name: string | null;
  user_email: string | null;
  office_name: string | null;
}

const STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Aberto',
  in_progress: 'Em progresso',
  resolved: 'Resolvido',
};

const STATUS_VARIANTS: Record<TicketStatus, 'default' | 'secondary' | 'outline'> = {
  open: 'default',
  in_progress: 'secondary',
  resolved: 'outline',
};

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const supabase = createClient();

  const fetchTickets = useCallback(async () => {
    const { data } = await supabase
      .from('support_tickets')
      .select(`
        id, subject, message, status, created_at,
        users:user_id ( name, email ),
        offices:office_id ( name )
      `)
      .order('created_at', { ascending: false });

    if (data) {
      setTickets(
        data.map((row: Record<string, unknown>) => {
          const user = row.users as { name: string; email: string } | null;
          const office = row.offices as { name: string } | null;
          return {
            id: row.id as string,
            subject: row.subject as string,
            message: row.message as string,
            status: row.status as TicketStatus,
            created_at: row.created_at as string,
            user_name: user?.name ?? null,
            user_email: user?.email ?? null,
            office_name: office?.name ?? null,
          };
        })
      );
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  async function updateStatus(ticketId: string, status: TicketStatus) {
    setUpdating(ticketId);
    await fetch(`/api/admin/support/${ticketId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, status } : t))
    );
    setUpdating(null);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Pedidos de Suporte</h1>

      {loading ? (
        <p className="text-sm text-slate-500">A carregar...</p>
      ) : tickets.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhum pedido de suporte.</p>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <div key={ticket.id} className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="space-y-0.5">
                  <p className="font-semibold text-slate-900 text-sm">{ticket.subject}</p>
                  <p className="text-xs text-slate-500">
                    {ticket.user_name ?? '—'} · {ticket.user_email ?? '—'}
                    {ticket.office_name ? ` · ${ticket.office_name}` : ''}
                    {' · '}{formatDate(ticket.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={STATUS_VARIANTS[ticket.status]}>
                    {STATUS_LABELS[ticket.status]}
                  </Badge>
                  <select
                    value={ticket.status}
                    disabled={updating === ticket.id}
                    onChange={(e) => updateStatus(ticket.id, e.target.value as TicketStatus)}
                    className="text-xs border border-slate-200 rounded-md px-2 py-1 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    <option value="open">Aberto</option>
                    <option value="in_progress">Em progresso</option>
                    <option value="resolved">Resolvido</option>
                  </select>
                </div>
              </div>
              <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{ticket.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
