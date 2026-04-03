import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import {
  PER_PROPONENTE_TEMPLATES,
  ALL_OPTIONAL_TEMPLATES,
} from '@/lib/document-templates';

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

    // Build document requests to insert
    const docRows: {
      client_id: string;
      doc_type: string;
      label: string;
      proponente: 'p1' | 'p2' | 'shared';
      is_mandatory: boolean;
      max_files: number;
      sort_order: number;
      status: 'pending' | 'em_analise' | 'approved' | 'rejected';
    }[] = [];

    // Per-proponente docs for p1
    for (const tpl of PER_PROPONENTE_TEMPLATES) {
      docRows.push({
        client_id: clientId,
        doc_type: `p1_${tpl.key}`,
        label: tpl.label,
        proponente: 'p1',
        is_mandatory: tpl.is_mandatory,
        max_files: tpl.max_files,
        sort_order: tpl.sort_order,
        status: 'pending',
      });
    }

    // Per-proponente docs for p2
    if (hasP2) {
      for (const tpl of PER_PROPONENTE_TEMPLATES) {
        docRows.push({
          client_id: clientId,
          doc_type: `p2_${tpl.key}`,
          label: tpl.label,
          proponente: 'p2',
          is_mandatory: tpl.is_mandatory,
          max_files: tpl.max_files,
          sort_order: tpl.sort_order,
          status: 'pending',
        });
      }
    }

    // Enabled optional docs chosen in the form
    const enabledKeys = new Set<string>(enabled_extra_docs as string[]);
    for (const tpl of ALL_OPTIONAL_TEMPLATES) {
      if (enabledKeys.has(tpl.key)) {
        docRows.push({
          client_id: clientId,
          doc_type: tpl.key,
          label: tpl.label,
          proponente: 'shared',
          is_mandatory: tpl.is_mandatory,
          max_files: tpl.max_files,
          sort_order: tpl.sort_order,
          status: 'pending',
        });
      }
    }

    if (docRows.length > 0) {
      await serviceClient.from('document_requests').insert(docRows);
    }

    return NextResponse.json({ id: clientId });
  } catch (err) {
    console.error('Create client error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
