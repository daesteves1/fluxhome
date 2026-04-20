import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getOfficeDocumentTemplate, type OfficeDocTemplate } from '@/lib/document-defaults';
import type { ProcessTipo } from '@/types/database';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = await createServiceClient();

  const { data: brokerRaw } = await serviceClient
    .from('brokers').select('id, office_id').eq('user_id', user.id).eq('is_active', true).single();
  const broker = brokerRaw as { id: string; office_id: string } | null;
  if (!broker) return NextResponse.json({ error: 'Broker not found' }, { status: 403 });

  const body = await request.json() as {
    client_id: string;
    tipo: ProcessTipo;
    valor_imovel?: number;
    montante_solicitado?: number;
    prazo_meses?: number;
    finalidade?: string;
    localizacao_imovel?: string;
    p1_profissao?: string;
    p1_entidade_empregadora?: string;
    p1_tipo_contrato?: string;
    p1_rendimento_mensal?: number;
    p2_profissao?: string;
    p2_entidade_empregadora?: string;
    p2_tipo_contrato?: string;
    p2_rendimento_mensal?: number;
    observacoes?: string;
    doc_types?: string[];
  };

  // Verify client belongs to broker's office
  const { data: clientRaw } = await serviceClient
    .from('clients').select('id, p1_name, p2_name, office_id, portal_token').eq('id', body.client_id).single();
  const clientInfo = clientRaw as { id: string; p1_name: string; p2_name: string | null; office_id: string; portal_token: string | null } | null;
  if (!clientInfo || clientInfo.office_id !== broker.office_id) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  const { data: processData, error } = await serviceClient
    .from('processes')
    .insert({
      client_id: body.client_id,
      broker_id: broker.id,
      office_id: broker.office_id,
      tipo: body.tipo,
      process_step: 'docs_pending',
      valor_imovel: body.valor_imovel ?? null,
      montante_solicitado: body.montante_solicitado ?? null,
      prazo_meses: body.prazo_meses ?? null,
      finalidade: body.finalidade ?? null,
      localizacao_imovel: body.localizacao_imovel ?? null,
      p1_profissao: body.p1_profissao ?? null,
      p1_entidade_empregadora: body.p1_entidade_empregadora ?? null,
      p1_tipo_contrato: body.p1_tipo_contrato ?? null,
      p1_rendimento_mensal: body.p1_rendimento_mensal ?? null,
      p2_profissao: body.p2_profissao ?? null,
      p2_entidade_empregadora: body.p2_entidade_empregadora ?? null,
      p2_tipo_contrato: body.p2_tipo_contrato ?? null,
      p2_rendimento_mensal: body.p2_rendimento_mensal ?? null,
      observacoes: body.observacoes ?? null,
    })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const processId = (processData as { id: string }).id;

  // Create document requests from office template
  const { data: officeRaw } = await serviceClient
    .from('offices').select('document_template').eq('id', broker.office_id).single();
  const template = getOfficeDocumentTemplate(
    (officeRaw as { document_template: OfficeDocTemplate[] | null } | null)?.document_template ?? null
  );
  const requestedDocs = new Set<string>(body.doc_types ?? []);
  const hasP2 = Boolean(clientInfo.p2_name);

  const docRows: {
    client_id: string; process_id: string; doc_type: string; label: string;
    proponente: 'p1' | 'p2' | 'shared'; is_mandatory: boolean; max_files: number;
    sort_order: number; status: 'pending';
  }[] = [];

  template.forEach((doc, idx) => {
    if (!doc.enabled && !requestedDocs.has(doc.doc_type)) return;
    if (doc.proponente === 'per_proponente') {
      docRows.push({ client_id: body.client_id, process_id: processId, doc_type: `p1_${doc.doc_type}`, label: doc.label, proponente: 'p1', is_mandatory: doc.is_mandatory, max_files: doc.max_files, sort_order: idx, status: 'pending' });
      if (hasP2) docRows.push({ client_id: body.client_id, process_id: processId, doc_type: `p2_${doc.doc_type}`, label: doc.label, proponente: 'p2', is_mandatory: doc.is_mandatory, max_files: doc.max_files, sort_order: idx, status: 'pending' });
    } else {
      docRows.push({ client_id: body.client_id, process_id: processId, doc_type: doc.doc_type, label: doc.label, proponente: 'shared', is_mandatory: doc.is_mandatory, max_files: doc.max_files, sort_order: idx, status: 'pending' });
    }
  });

  if (docRows.length > 0) await serviceClient.from('document_requests').insert(docRows);

  return NextResponse.json({
    id: processId,
    portal_token: clientInfo.portal_token,
    client_name: clientInfo.p1_name,
  }, { status: 201 });
}
