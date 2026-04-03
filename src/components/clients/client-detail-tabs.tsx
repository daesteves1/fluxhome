'use client';

import { useTranslations } from 'next-intl';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DocumentsTab } from './documents-tab';
import { PropostasTab } from './propostas-tab';
import { NotesTab } from './notes-tab';
import type { ProcessStep } from '@/types/database';

export interface DocumentRequest {
  id: string;
  client_id: string;
  proponente: 'p1' | 'p2' | 'shared';
  doc_type: string | null;
  label: string;
  description: string | null;
  is_mandatory: boolean;
  max_files: number;
  sort_order: number;
  status: 'pending' | 'em_analise' | 'approved' | 'rejected';
  broker_notes: string | null;
  created_at: string;
}

export interface DocumentUpload {
  id: string;
  document_request_id: string;
  client_id: string;
  storage_path: string;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  uploaded_by: 'client' | 'broker';
  uploaded_at: string;
}

export interface Proposta {
  id: string;
  title: string | null;
  is_visible_to_client: boolean;
  created_at: string;
  updated_at: string;
}

export interface BrokerNote {
  id: string;
  client_id: string;
  broker_id: string;
  content: string;
  created_at: string;
}

interface Client {
  id: string;
  p1_name: string;
  p2_name: string | null;
  process_step: ProcessStep;
  [key: string]: unknown;
}

interface Props {
  client: Client;
  documentRequests: DocumentRequest[];
  uploads: DocumentUpload[];
  propostas: Proposta[];
  brokerNotes: BrokerNote[];
  currentBrokerId: string | null;
  officeId: string;
  officeName: string;
}

export function ClientDetailTabs({
  client,
  documentRequests,
  uploads,
  propostas,
  brokerNotes,
  currentBrokerId,
  officeId,
}: Props) {
  const t = useTranslations();

  const pendingDocs = documentRequests.filter(r => r.status === 'pending' || r.status === 'em_analise').length;

  return (
    <Tabs defaultValue="documents">
      <TabsList className="bg-white border border-slate-200 rounded-xl p-1 gap-0.5 h-auto">
        <TabsTrigger
          value="documents"
          className="rounded-lg text-sm font-medium px-4 py-1.5 text-slate-500 data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all"
        >
          {t('documents.title')}
          {pendingDocs > 0 && (
            <span className="ml-1.5 bg-amber-500 text-white text-[10px] font-bold rounded-full w-4 h-4 inline-flex items-center justify-center">
              {pendingDocs}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger
          value="propostas"
          className="rounded-lg text-sm font-medium px-4 py-1.5 text-slate-500 data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all"
        >
          {t('propostas.title')}
          {propostas.length > 0 && (
            <span className="ml-1.5 bg-blue-500 text-white text-[10px] font-bold rounded-full w-4 h-4 inline-flex items-center justify-center">
              {propostas.length}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger
          value="notes"
          className="rounded-lg text-sm font-medium px-4 py-1.5 text-slate-500 data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all"
        >
          {t('notes.title')}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="documents" className="mt-4">
        <DocumentsTab
          client={client}
          documentRequests={documentRequests}
          uploads={uploads}
          officeId={officeId}
        />
      </TabsContent>

      <TabsContent value="propostas" className="mt-4">
        <PropostasTab
          client={client}
          propostas={propostas}
          currentBrokerId={currentBrokerId}
        />
      </TabsContent>

      <TabsContent value="notes" className="mt-4">
        <NotesTab
          clientId={client.id}
          notes={brokerNotes}
          currentBrokerId={currentBrokerId}
        />
      </TabsContent>
    </Tabs>
  );
}
