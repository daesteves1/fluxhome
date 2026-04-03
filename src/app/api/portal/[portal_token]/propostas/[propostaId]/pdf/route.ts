import { createServiceClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { PropostaPDF } from '@/components/propostas/proposta-pdf';
import React from 'react';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ portal_token: string; propostaId: string }> }
) {
  const { portal_token, propostaId } = await params;
  const serviceClient = await createServiceClient();

  // Verify portal token → client
  const { data: clientRaw } = await serviceClient
    .from('clients')
    .select('id, p1_name, broker_id')
    .eq('portal_token', portal_token)
    .single();

  if (!clientRaw) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const client = clientRaw as { id: string; p1_name: string; broker_id: string };

  // Verify proposta belongs to this client and is visible
  const { data: propostaRaw } = await serviceClient
    .from('propostas')
    .select('*')
    .eq('id', propostaId)
    .eq('client_id', client.id)
    .eq('is_visible_to_client', true)
    .single();

  if (!propostaRaw) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: brokerRaw } = await serviceClient
    .from('brokers')
    .select('office_id')
    .eq('id', client.broker_id)
    .single();

  const officeId = (brokerRaw as { office_id: string } | null)?.office_id;
  const { data: officeRaw } = officeId
    ? await serviceClient.from('offices').select('name').eq('id', officeId).single()
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

  const buffer = await renderToBuffer(
    React.createElement(PropostaPDF, {
      clientName: client.p1_name,
      officeName: (officeRaw as { name: string } | null)?.name ?? '',
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
