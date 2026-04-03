'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { UserCog } from 'lucide-react';

type BrokerItem = { id: string; userName: string; userEmail: string; officeName: string };

interface Props {
  brokers: BrokerItem[];
}

export function ImpersonateBrokerList({ brokers }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const filtered = brokers.filter(
    (b) =>
      b.userName.toLowerCase().includes(search.toLowerCase()) ||
      b.userEmail.toLowerCase().includes(search.toLowerCase()) ||
      b.officeName.toLowerCase().includes(search.toLowerCase())
  );

  async function impersonate(brokerId: string) {
    setLoadingId(brokerId);
    const res = await fetch('/api/admin/impersonate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ broker_id: brokerId }),
    });
    setLoadingId(null);
    if (res.ok) {
      toast.success('A impersonar mediador...');
      router.push('/dashboard');
    } else {
      toast.error('Erro ao impersonar');
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
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground col-span-full py-8 text-center">
            Nenhum mediador ativo encontrado
          </p>
        ) : (
          filtered.map((broker) => (
            <Card key={broker.id} className="hover:border-primary/50 transition-colors">
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{broker.userName}</p>
                  <p className="text-xs text-muted-foreground truncate">{broker.userEmail}</p>
                  <p className="text-xs text-muted-foreground">{broker.officeName}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => impersonate(broker.id)}
                  disabled={loadingId === broker.id}
                >
                  <UserCog className="h-3.5 w-3.5 mr-1" />
                  {loadingId === broker.id ? '...' : 'Entrar'}
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
