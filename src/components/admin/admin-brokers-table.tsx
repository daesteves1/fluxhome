'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';

type Broker = {
  id: string;
  user_id: string;
  office_id: string;
  is_active: boolean;
  is_office_admin: boolean;
  activated_at: string | null;
  invited_at: string | null;
  userName: string;
  userEmail: string;
  officeName: string;
};

interface Props {
  brokers: Broker[];
}

export function AdminBrokersTable({ brokers }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState('');

  const filtered = brokers.filter(
    (b) =>
      b.userName.toLowerCase().includes(search.toLowerCase()) ||
      b.userEmail.toLowerCase().includes(search.toLowerCase()) ||
      b.officeName.toLowerCase().includes(search.toLowerCase())
  );

  async function toggleActive(brokerId: string, officeId: string, current: boolean) {
    const res = await fetch(`/api/admin/brokers/${brokerId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !current }),
    });
    if (res.ok) {
      router.refresh();
    } else {
      toast.error('Erro ao atualizar');
    }
  }

  return (
    <div className="space-y-4">
      <Input
        placeholder="Pesquisar mediador..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Escritório</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead>Ativado</TableHead>
              <TableHead>Ativo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Nenhum mediador encontrado
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((broker) => (
                <TableRow key={broker.id}>
                  <TableCell className="font-medium">
                    <Link href={`/admin/brokers/${broker.id}`} className="hover:underline">
                      {broker.userName}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{broker.userEmail}</TableCell>
                  <TableCell className="text-sm">{broker.officeName}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {broker.is_office_admin ? 'Admin' : 'Mediador'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {broker.activated_at ? formatDate(broker.activated_at) : '—'}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={broker.is_active}
                      onCheckedChange={() => toggleActive(broker.id, broker.office_id, broker.is_active)}
                    />
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
