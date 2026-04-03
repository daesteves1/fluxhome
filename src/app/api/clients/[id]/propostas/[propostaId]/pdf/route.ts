import { createClient, createServiceClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { PropostaPDF } from '@/components/propostas/proposta-pdf';
import React from 'react';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; propostaId: string }> }
) {
  const { id, propostaId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = await createServiceClient();

  const { data: propostaRaw } = await serviceClient
    .from('propostas')
    .select('*')
    .eq('id', propostaId)
    .eq('client_id', id)
    .single();

  if (!propostaRaw) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: clientRaw } = await serviceClient
    .from('clients')
    .select('p1_name, p2_name')
    .eq('id', id)
    .single();

  const { data: brokerRaw } = await serviceClient
    .from('brokers')
    .select('id, office_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single();

  const officeId = (brokerRaw as { id: string; office_id: string } | null)?.office_id;
  const { data: officeRaw } = officeId
    ? await serviceClient.from('offices').select('name, white_label').eq('id', officeId).single()
    : { data: null };

  const proposta = propostaRaw as {
    id: string;
    title: string | null;
    comparison_data: unknown;
    insurance_data: unknown;
    one_time_charges: unknown;
    monthly_charges: unknown;
    notes: string | null;
    created_at: string;
  };

  const client = clientRaw as { p1_name: string; p2_name: string | null } | null;
  const officeName = (officeRaw as { name: string } | null)?.name ?? '';

  const buffer = await renderToBuffer(
    React.createElement(PropostaPDF, {
      clientName: client?.p1_name ?? '',
      officeName,
      title: proposta.title ?? '',
      banks: (proposta.comparison_data as import('@/components/propostas/proposta-editor').BankData[]) ?? [],
      insurance: (proposta.insurance_data as import('@/components/propostas/proposta-editor').InsuranceData) ?? {},
      oneTimeCharges: (proposta.one_time_charges as import('@/components/propostas/proposta-editor').ChargeRow[]) ?? [],
      monthlyCharges: (proposta.monthly_charges as import('@/components/propostas/proposta-editor').ChargeRow[]) ?? [],
      notes: proposta.notes ?? '',
      createdAt: proposta.created_at,
    })
  );

  return new NextResponse(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="proposta-${propostaId}.pdf"`,
    },
  });
}
