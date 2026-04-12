import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import {
  getOfficeDocumentTemplate,
  TRANSFER_MORTGAGE_TYPES,
  TRANSFER_AUTO_DOC_TYPES,
  TRANSFER_ONLY_DOC_TYPES,
  type OfficeDocTemplate,
} from '@/lib/document-defaults';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const serviceClient = await createServiceClient();
    const body = await request.json();

    const {
      broker_id, office_id, p1_name, p1_nif, p1_email, p1_phone,
      p1_employment_type, p1_birth_date, p2_name, p2_nif, p2_email,
      p2_phone, p2_employment_type, p2_birth_date, mortgage_type,
      property_value, loan_amount, term_months, property_address, notes_general,
      enabled_extra_docs = [],
    } = body;

    const hasP2 = Boolean(p2_name);

    const { data, error } = await serviceClient.from('clients').insert({
      broker_id,
      office_id,
      p1_name,
      p1_nif: p1_nif || null,
      p1_email: p1_email || null,
      p1_phone: p1_phone || null,
      p1_employment_type: p1_employment_type || null,
      p1_birth_date: p1_birth_date || null,
      p2_name: p2_name || null,
      p2_nif: p2_nif || null,
      p2_email: p2_email || null,
      p2_phone: p2_phone || null,
      p2_employment_type: p2_employment_type || null,
      p2_birth_date: p2_birth_date || null,
      mortgage_type: mortgage_type || null,
      property_value: property_value || null,
      loan_amount: loan_amount || null,
      term_months: term_months || null,
      property_address: property_address || null,
      notes_general: notes_general || null,
      process_step: 'lead',
    }).select('id').single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const clientId = (data as { id: string }).id;

    // Fetch office document template
    const { data: officeRaw } = await serviceClient
      .from('offices')
      .select('document_template')
      .eq('id', office_id)
      .single();

    const rawTemplate = (officeRaw as { document_template: OfficeDocTemplate[] | null } | null)?.document_template;
    const template = getOfficeDocumentTemplate(rawTemplate ?? null);

    // Build set of doc_types to force-enable based on mortgage type
    const forceEnabled = new Set<string>();
    if (mortgage_type && TRANSFER_MORTGAGE_TYPES.includes(mortgage_type)) {
      for (const dt of TRANSFER_AUTO_DOC_TYPES) forceEnabled.add(dt);
    }
    if (mortgage_type === 'Transferência') {
      for (const dt of TRANSFER_ONLY_DOC_TYPES) forceEnabled.add(dt);
    }

    // Also include any explicitly passed enabled_extra_docs (backward compat)
    const extraDocSet = new Set<string>(enabled_extra_docs as string[]);

    // Build document request rows
    const docRows: {
      client_id: string;
      doc_type: string;
      label: string;
      proponente: 'p1' | 'p2' | 'shared';
      is_mandatory: boolean;
      max_files: number;
      sort_order: number;
      status: 'pending';
    }[] = [];

    template.forEach((doc, idx) => {
      const shouldCreate = doc.enabled || forceEnabled.has(doc.doc_type) || extraDocSet.has(doc.doc_type);
      if (!shouldCreate) return;

      if (doc.proponente === 'per_proponente') {
        docRows.push({
          client_id: clientId,
          doc_type: `p1_${doc.doc_type}`,
          label: doc.label,
          proponente: 'p1',
          is_mandatory: doc.is_mandatory,
          max_files: doc.max_files,
          sort_order: idx,
          status: 'pending',
        });
        if (hasP2) {
          docRows.push({
            client_id: clientId,
            doc_type: `p2_${doc.doc_type}`,
            label: doc.label,
            proponente: 'p2',
            is_mandatory: doc.is_mandatory,
            max_files: doc.max_files,
            sort_order: idx,
            status: 'pending',
          });
        }
      } else {
        docRows.push({
          client_id: clientId,
          doc_type: doc.doc_type,
          label: doc.label,
          proponente: 'shared',
          is_mandatory: doc.is_mandatory,
          max_files: doc.max_files,
          sort_order: idx,
          status: 'pending',
        });
      }
    });

    if (docRows.length > 0) {
      await serviceClient.from('document_requests').insert(docRows);
    }

    return NextResponse.json({ id: clientId });
  } catch (err) {
    console.error('Create client error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
