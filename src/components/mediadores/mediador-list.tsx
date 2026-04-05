'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { UserPlus, Mail, ShieldCheck, UserX, UserCheck, Clock, RotateCcw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface Broker {
  id: string;
  is_office_admin: boolean;
  is_active: boolean;
  invited_at: string | null;
  activated_at: string | null;
  users: { id: string; name: string; email: string } | null;
}

interface PendingInvitation {
  id: string;
  email: string;
  role: string;
  status: string;
  sent_at: string;
  expires_at: string;
}

interface Props {
  brokers: Broker[];
  pendingInvitations: PendingInvitation[];
  currentBrokerId: string;
  officeId: string;
}

export function MediadorList({ brokers, pendingInvitations, currentBrokerId, officeId }: Props) {
  const t = useTranslations();
  const router = useRouter();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<'broker' | 'office_admin'>('broker');
  const [sending, setSending] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);

  async function handleResend(id: string) {
    setResendingId(id);
    try {
      const res = await fetch(`/api/admin/invitations/${id}/resend`, { method: 'POST' });
      if (res.ok) {
        toast.success(t('invitations.resend') + ' ✓');
        router.refresh();
      } else {
        const data = await res.json();
        toast.error(data.error ?? t('errors.generic'));
      }
    } finally {
      setResendingId(null);
    }
  }

  async function handleInvite() {
    if (!inviteEmail || !inviteName) return;
    setSending(true);
    try {
      const res = await fetch('/api/admin/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          office_id: officeId,
          invitee_name: inviteName,
        }),
      });
      if (res.ok) {
        toast.success(t('admin.invitationSent'));
        setInviteEmail('');
        setInviteName('');
        setInviteRole('broker');
        setInviteOpen(false);
        router.refresh();
      } else {
        const data = await res.json();
        toast.error(data.error ?? t('errors.generic'));
      }
    } finally {
      setSending(false);
    }
  }

  async function toggleActive(broker: Broker) {
    setTogglingId(broker.id);
    try {
      const res = await fetch(`/api/office/brokers/${broker.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !broker.is_active }),
      });
      if (res.ok) {
        toast.success(broker.is_active ? 'Mediador desativado' : 'Mediador ativado');
        router.refresh();
      } else {
        const data = await res.json();
        toast.error(data.error ?? t('errors.generic'));
      }
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{t('nav.mediadores')}</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {brokers.length} {brokers.length === 1 ? 'mediador' : 'mediadores'}
          </p>
        </div>

        <Dialog open={inviteOpen} onOpenChange={(v) => { setInviteOpen(v); if (!v) { setInviteEmail(''); setInviteName(''); setInviteRole('broker'); } }}>
          <DialogTrigger asChild>
            <Button className="gap-1.5">
              <UserPlus className="h-4 w-4" />
              + Convidar mediador
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Convidar mediador</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label>Nome *</Label>
                <Input
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="Nome completo"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="email@exemplo.pt"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Perfil</Label>
                <div
                  className="flex h-9 rounded-full p-0.5 border border-slate-200"
                >
                  <button
                    type="button"
                    onClick={() => setInviteRole('broker')}
                    className={cn(
                      'flex-1 rounded-full text-sm font-medium transition-colors duration-150',
                      inviteRole === 'broker'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-500 hover:text-slate-700'
                    )}
                  >
                    Mediador
                  </button>
                  <button
                    type="button"
                    onClick={() => setInviteRole('office_admin')}
                    className={cn(
                      'flex-1 rounded-full text-sm font-medium transition-colors duration-150',
                      inviteRole === 'office_admin'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-500 hover:text-slate-700'
                    )}
                  >
                    Admin de Escritório
                  </button>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" onClick={() => setInviteOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleInvite}
                  disabled={sending || !inviteEmail || !inviteName}
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Enviar convite
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Brokers list */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-5">
        <div className="px-4 py-3 border-b border-slate-100">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Mediadores</p>
        </div>
        {brokers.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-slate-400">Nenhum mediador encontrado</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {brokers.map((broker) => {
              const isSelf = broker.id === currentBrokerId;
              const isToggling = togglingId === broker.id;
              return (
                <div key={broker.id} className="flex items-center gap-3 px-4 py-3 min-h-[60px]">
                  {/* Avatar */}
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${broker.is_active ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'}`}>
                    {broker.users?.name?.charAt(0).toUpperCase() ?? '?'}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {broker.users?.name ?? '—'}
                        {isSelf && <span className="ml-1 text-slate-400 font-normal text-xs">(você)</span>}
                      </p>
                      {broker.is_office_admin && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">
                          <ShieldCheck className="h-3 w-3" />
                          Admin
                        </span>
                      )}
                      {!broker.is_active && (
                        <span className="text-[10px] font-semibold bg-red-50 text-red-600 border border-red-200 px-1.5 py-0.5 rounded-full">
                          {t('common.inactive')}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 truncate">{broker.users?.email}</p>
                  </div>

                  {/* Dates */}
                  <div className="hidden sm:block text-right shrink-0">
                    {broker.activated_at ? (
                      <p className="text-xs text-slate-400">Ativo desde {formatDate(broker.activated_at)}</p>
                    ) : broker.invited_at ? (
                      <p className="text-xs text-slate-400">Convidado em {formatDate(broker.invited_at)}</p>
                    ) : null}
                  </div>

                  {/* Toggle button */}
                  {!isSelf && (
                    <button
                      onClick={() => toggleActive(broker)}
                      disabled={isToggling}
                      className={`flex items-center gap-1.5 h-9 px-3 text-xs font-medium border rounded-lg transition-colors disabled:opacity-50 shrink-0 min-w-[44px] ${
                        broker.is_active
                          ? 'border-slate-200 text-slate-600 hover:bg-slate-50'
                          : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                      }`}
                    >
                      {broker.is_active ? (
                        <><UserX className="h-3.5 w-3.5" />{isToggling ? '...' : t('common.inactive')}</>
                      ) : (
                        <><UserCheck className="h-3.5 w-3.5" />{isToggling ? '...' : t('common.active')}</>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pending invitations */}
      {pendingInvitations.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {t('invitations.pending')} ({pendingInvitations.length})
            </p>
          </div>
          <div className="divide-y divide-slate-100">
            {pendingInvitations.map((inv) => (
              <div key={inv.id} className="flex items-center gap-3 px-4 py-3 min-h-[60px]">
                <div className="w-9 h-9 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <Mail className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{inv.email}</p>
                  <p className="text-xs text-slate-400">Enviado em {formatDate(inv.sent_at)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                    <Clock className="h-3 w-3" />
                    {t('invitations.pending')}
                  </span>
                  <button
                    onClick={() => handleResend(inv.id)}
                    disabled={resendingId === inv.id}
                    className="flex items-center gap-1 h-7 px-2.5 text-xs font-medium border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                  >
                    <RotateCcw className="h-3 w-3" />
                    {resendingId === inv.id ? '...' : t('invitations.resend')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
