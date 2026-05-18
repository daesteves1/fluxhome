/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

interface RouteParams { params: Promise<{ id: string; propostaId: string }> }

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id, propostaId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = await createServiceClient();

  const { data: propostaRaw } = await serviceClient
    .from('bank_propostas' as 'propostas')
    .select('bank_pdf_path, bank_name')
    .eq('id', propostaId)
    .eq('client_id', id)
    .single() as unknown as { data: { bank_pdf_path: string | null; bank_name: string } | null };

  if (!propostaRaw?.bank_pdf_path) {
    return NextResponse.json({ error: 'No PDF available' }, { status: 404 });
  }

  // Determine bucket — FINE PDFs go to fine-pdfs, legacy PDFs go to propostas-docs
  const bucket = propostaRaw.bank_pdf_path.includes('.pdf') && propostaRaw.bank_pdf_path.split('/').length === 3
    ? 'fine-pdfs'
    : 'propostas-docs';

  const { data: fileData, error } = await serviceClient.storage
    .from(bucket)
    .download(propostaRaw.bank_pdf_path);

  if (error || !fileData) {
    // Fallback: try other bucket
    const altBucket = bucket === 'fine-pdfs' ? 'propostas-docs' : 'fine-pdfs';
    const { data: altData, error: altError } = await serviceClient.storage
      .from(altBucket)
      .download(propostaRaw.bank_pdf_path);

    if (altError || !altData) {
      return NextResponse.json({ error: 'PDF not found in storage' }, { status: 404 });
    }

    const buffer = await altData.arrayBuffer();
    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="FINE-${propostaRaw.bank_name}.pdf"`,
      },
    });
  }

  const buffer = await fileData.arrayBuffer();
  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="FINE-${propostaRaw.bank_name}.pdf"`,
    },
  });
}
