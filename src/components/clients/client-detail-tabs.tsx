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
  status: 'pending' | 'uploaded' | 'approved' | 'rejected';
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

  return (
    <Tabs defaultValue="documents">
      <TabsList>
        <TabsTrigger value="documents">{t('documents.title')}</TabsTrigger>
        <TabsTrigger value="propostas">{t('propostas.title')}</TabsTrigger>
        <TabsTrigger value="notes">{t('notes.title')}</TabsTrigger>
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
