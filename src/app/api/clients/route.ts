import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

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
    } = body;

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

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('Create client error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
