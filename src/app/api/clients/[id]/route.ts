import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import type { ProcessStep } from '@/types/database';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const serviceClient = await createServiceClient();

    const allowedFields = [
      'p1_name', 'p1_nif', 'p1_email', 'p1_phone', 'p1_employment_type', 'p1_birth_date',
      'p2_name', 'p2_nif', 'p2_email', 'p2_phone', 'p2_employment_type', 'p2_birth_date',
      'mortgage_type', 'property_value', 'loan_amount', 'term_months',
      'property_address', 'notes_general', 'process_step',
    ];

    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field];
      }
    }

    if (updateData.process_step) {
      updateData.process_step = updateData.process_step as ProcessStep;
    }

    const { error } = await serviceClient
      .from('clients')
      .update(updateData)
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Update client error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
