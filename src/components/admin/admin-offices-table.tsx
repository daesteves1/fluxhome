'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { formatDate } from '@/lib/utils';

type Office = { id: string; name: string; slug: string; is_active: boolean; created_at: string };

interface Props {
  offices: Office[];
}

export function AdminOfficesTable({ offices }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = offices.filter(
    (o) =>
      o.name.toLowerCase().includes(search.toLowerCase()) ||
      o.slug.toLowerCase().includes(search.toLowerCase())
  );

  async function handleCreate() {
    if (!name || !slug) return;
    setSubmitting(true);
    const res = await fetch('/api/admin/offices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, slug }),
    });
    setSubmitting(false);
    if (res.ok) {
      toast.success('Escritório criado');
      setOpen(false);
      setName('');
      setSlug('');
      router.refresh();
    } else {
      const data = await res.json();
      toast.error(data.error ?? 'Erro');
    }
  }

  async function toggleActive(officeId: string, current: boolean) {
    await fetch(`/api/admin/offices/${officeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !current }),
    });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Input
          placeholder="Pesquisar escritório..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1.5" />
              Novo Escritório
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Escritório</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label>Nome</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Slug</Label>
                <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="ex: escritorio-lisboa" />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={handleCreate} disabled={submitting || !name || !slug}>
                  {submitting ? 'A criar...' : 'Criar'}
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
              <TableHead>Nome</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead>Ativo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Nenhum escritório encontrado
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((office) => (
                <TableRow key={office.id}>
                  <TableCell className="font-medium">
                    <Link href={`/admin/offices/${office.id}`} className="hover:underline">
                      {office.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground font-mono text-sm">{office.slug}</TableCell>
                  <TableCell>
                    <Badge variant={office.is_active ? 'default' : 'secondary'}>
                      {office.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{formatDate(office.created_at)}</TableCell>
                  <TableCell>
                    <Switch
                      checked={office.is_active}
                      onCheckedChange={() => toggleActive(office.id, office.is_active)}
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
