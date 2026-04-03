'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, RotateCcw } from 'lucide-react';
import { formatDate } from '@/lib/utils';

type Invitation = {
  id: string;
  email: string;
  role: string;
  status: string;
  sent_at: string;
  expires_at: string | null;
  accepted_at: string | null;
  office_id: string | null;
  officeName: string | null;
};

type OfficeOption = { id: string; name: string };

interface Props {
  invitations: Invitation[];
  officeOptions: OfficeOption[];
}

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'outline',
  accepted: 'default',
  expired: 'secondary',
};

export function AdminInvitationsTable({ invitations, officeOptions }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [inviteeName, setInviteeName] = useState('');
  const [role, setRole] = useState('broker');
  const [officeId, setOfficeId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);

  async function handleResend(id: string) {
    setResendingId(id);
    try {
      const res = await fetch(`/api/admin/invitations/${id}/resend`, { method: 'POST' });
      if (res.ok) {
        toast.success('Convite reenviado');
        router.refresh();
      } else {
        const data = await res.json();
        toast.error(data.error ?? 'Erro ao reenviar convite');
      }
    } finally {
      setResendingId(null);
    }
  }

  async function handleInvite() {
    if (!email || !role) return;
    setSubmitting(true);
    const res = await fetch('/api/admin/invitations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        role,
        office_id: officeId || null,
        invitee_name: inviteeName,
      }),
    });
    setSubmitting(false);
    if (res.ok) {
      toast.success('Convite enviado');
      setOpen(false);
      setEmail('');
      setInviteeName('');
      setRole('broker');
      setOfficeId('');
      router.refresh();
    } else {
      const data = await res.json();
      toast.error(data.error ?? 'Erro ao enviar convite');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1.5" />
              Convidar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Enviar Convite</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label>Email *</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Nome</Label>
                <Input value={inviteeName} onChange={(e) => setInviteeName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Perfil *</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="broker">Mediador</SelectItem>
                    <SelectItem value="office_admin">Admin de Escritório</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {role !== 'super_admin' && (
                <div className="space-y-1.5">
                  <Label>Escritório</Label>
                  <Select value={officeId} onValueChange={setOfficeId}>
                    <SelectTrigger><SelectValue placeholder="Selecionar escritório" /></SelectTrigger>
                    <SelectContent>
                      {officeOptions.map((o) => (
                        <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={handleInvite} disabled={submitting || !email}>
                  {submitting ? 'A enviar...' : 'Enviar Convite'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead>Escritório</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Enviado</TableHead>
              <TableHead>Aceite</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invitations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Nenhum convite encontrado
                </TableCell>
              </TableRow>
            ) : (
              invitations.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium">{inv.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{inv.role}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{inv.officeName ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[inv.status] ?? 'secondary'}>{inv.status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{formatDate(inv.sent_at)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {inv.accepted_at ? formatDate(inv.accepted_at) : '—'}
                  </TableCell>
                  <TableCell>
                    {inv.status !== 'accepted' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleResend(inv.id)}
                        disabled={resendingId === inv.id}
                        className="h-7 px-2 text-xs"
                      >
                        <RotateCcw className="h-3.5 w-3.5 mr-1" />
                        {resendingId === inv.id ? '...' : 'Reenviar'}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
