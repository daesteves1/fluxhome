'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { FileText, BarChart2, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
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
  brokerNotes: BrokerNote[];
  currentBrokerId: string | null;
  officeId: string;
  officeName: string;
  defaultTab?: string;
}

type Tab = 'documents' | 'propostas' | 'notes';

export function ClientDetailTabs({
  client,
  documentRequests,
  uploads,
  brokerNotes,
  currentBrokerId,
  officeId,
  defaultTab,
}: Props) {
  const t = useTranslations();
  const validDefault = (['documents', 'propostas', 'notes'] as Tab[]).includes(defaultTab as Tab)
    ? (defaultTab as Tab)
    : 'documents';
  const [activeTab, setActiveTab] = useState<Tab>(validDefault);

  const pendingDocs = documentRequests.filter(
    (r) => r.status === 'pending' || r.status === 'em_analise'
  ).length;

  const tabs: { id: Tab; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: 'documents', label: t('documents.title'), icon: FileText,      badge: pendingDocs || undefined },
    { id: 'propostas', label: t('propostas.title'), icon: BarChart2 },
    { id: 'notes',     label: t('notes.title'),     icon: MessageSquare },
  ];

  return (
    <div>
      {/* Tab nav — sits on page background, full width, border-bottom separator */}
      <div className="border-b border-slate-200">
        <div className="flex h-11 items-stretch gap-1">
          {tabs.map(({ id, label, icon: Icon, badge }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                'relative inline-flex items-center gap-1.5 px-3 text-sm font-medium transition-colors',
                activeTab === id
                  ? 'text-blue-600'
                  : 'text-slate-500 hover:text-slate-700'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
              {badge !== undefined && (
                <span
                  className={cn(
                    'inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold',
                    activeTab === id
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-slate-100 text-slate-500'
                  )}
                >
                  {badge}
                </span>
              )}
              {/* Active underline */}
              {activeTab === id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="mt-4">
        {activeTab === 'documents' && (
          <DocumentsTab
            client={client}
            documentRequests={documentRequests}
            uploads={uploads}
            officeId={officeId}
          />
        )}
        {activeTab === 'propostas' && (
          <PropostasTab client={client} />
        )}
        {activeTab === 'notes' && (
          <NotesTab
            clientId={client.id}
            notes={brokerNotes}
            currentBrokerId={currentBrokerId}
          />
        )}
      </div>
    </div>
  );
}
