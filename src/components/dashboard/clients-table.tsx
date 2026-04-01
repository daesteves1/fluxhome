'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Search, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ProcessStepBadge } from './process-step-badge';
import { formatDate } from '@/lib/utils';
import type { ProcessStep } from '@/types/database';

interface Client {
  id: string;
  p1_name: string;
  p2_name: string | null;
  process_step: string;
  updated_at: string;
  broker_id: string;
  brokers: {
    id: string;
    users: { name: string } | null;
  } | null;
}

interface ClientsTableProps {
  clients: Client[];
  showBrokerColumn?: boolean;
}

const ALL_STEPS = 'all';

export function ClientsTable({ clients, showBrokerColumn = false }: ClientsTableProps) {
  const t = useTranslations('clients');
  const tSteps = useTranslations('processSteps');
  const [search, setSearch] = useState('');
  const [stepFilter, setStepFilter] = useState(ALL_STEPS);

  const steps: ProcessStep[] = [
    'lead',
    'docs_pending',
    'docs_complete',
    'propostas_sent',
    'approved',
    'closed',
  ];

  const filtered = clients.filter((c) => {
    const matchesSearch =
      c.p1_name.toLowerCase().includes(search.toLowerCase()) ||
      (c.p2_name?.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchesStep = stepFilter === ALL_STEPS || c.process_step === stepFilter;
    return matchesSearch && matchesStep;
  });

  return (
    <Card className="shadow-sm">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 p-4 border-b">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={stepFilter} onValueChange={setStepFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder={t('filterByStep')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_STEPS}>{t('allSteps')}</SelectItem>
            {steps.map((step) => (
              <SelectItem key={step} value={step}>
                {tSteps(step)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('name')}</TableHead>
            <TableHead>{t('processStep')}</TableHead>
            {showBrokerColumn && <TableHead>{t('broker')}</TableHead>}
            <TableHead>{t('lastUpdated')}</TableHead>
            <TableHead className="w-8" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={showBrokerColumn ? 5 : 4}
                className="text-center text-muted-foreground py-12"
              >
                {t('noClients')}
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((client) => (
              <TableRow key={client.id} className="hover:bg-muted/30 cursor-pointer">
                <TableCell>
                  <Link href={`/dashboard/clients/${client.id}`} className="block">
                    <span className="font-medium text-foreground">{client.p1_name}</span>
                    {client.p2_name && (
                      <span className="text-muted-foreground text-xs ml-1.5">
                        + {client.p2_name}
                      </span>
                    )}
                  </Link>
                </TableCell>
                <TableCell>
                  <ProcessStepBadge step={client.process_step as ProcessStep} />
                </TableCell>
                {showBrokerColumn && (
                  <TableCell className="text-muted-foreground text-sm">
                    {(client.brokers?.users as { name: string } | null)?.name ?? '—'}
                  </TableCell>
                )}
                <TableCell className="text-muted-foreground text-sm">
                  {formatDate(client.updated_at)}
                </TableCell>
                <TableCell>
                  <Link href={`/dashboard/clients/${client.id}`}>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Card>
  );
}
