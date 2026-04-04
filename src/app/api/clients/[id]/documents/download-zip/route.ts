import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import JSZip from 'jszip';

interface RouteParams { params: Promise<{ id: string }> }

const PROPONENTE_LABELS: Record<string, string> = {
  p1: 'Proponente 1',
  p2: 'Proponente 2',
  shared: 'Partilhados',
};

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json() as { uploadIds: string[] };
  const uploadIds: string[] = Array.isArray(body.uploadIds) ? body.uploadIds : [];
  if (uploadIds.length === 0) return NextResponse.json({ error: 'No uploads selected' }, { status: 400 });

  const serviceClient = await createServiceClient();

  // Fetch client name
  const { data: clientRaw } = await serviceClient
    .from('clients').select('p1_name').eq('id', id).single();
  const clientName = (clientRaw as { p1_name: string } | null)?.p1_name ?? 'cliente';

  // Fetch selected uploads joined with document_request info
  const { data: uploadsRaw } = await serviceClient
    .from('document_uploads')
    .select('id, storage_path, file_name, document_request_id')
    .in('id', uploadIds)
    .eq('client_id', id);

  if (!uploadsRaw || uploadsRaw.length === 0) {
    return NextResponse.json({ error: 'No files found' }, { status: 404 });
  }

  // Fetch document_requests for label + proponente
  const reqIds = Array.from(new Set(uploadsRaw.map((u) => (u as { document_request_id: string }).document_request_id)));
  const { data: reqsRaw } = await serviceClient
    .from('document_requests')
    .select('id, label, proponente')
    .in('id', reqIds);

  const reqMap = new Map(
    (reqsRaw ?? []).map((r) => {
      const req = r as { id: string; label: string; proponente: string };
      return [req.id, req];
    })
  );

  const zip = new JSZip();
  const usedNames = new Map<string, number>();

  for (const u of uploadsRaw) {
    const upload = u as { id: string; storage_path: string; file_name: string | null; document_request_id: string };
    const req = reqMap.get(upload.document_request_id);
    const folder = PROPONENTE_LABELS[req?.proponente ?? 'shared'] ?? 'Partilhados';
    const label = (req?.label ?? 'Documento').replace(/[/\\:*?"<>|]/g, '_');

    const { data: fileData } = await serviceClient.storage
      .from('client-documents')
      .download(upload.storage_path);
    if (!fileData) continue;

    const arrayBuffer = await fileData.arrayBuffer();
    const rawName = upload.file_name ?? upload.storage_path.split('/').pop() ?? 'file';
    const pathKey = `${folder}/${label}/${rawName}`;

    // Deduplicate within same folder/label
    const count = usedNames.get(pathKey) ?? 0;
    usedNames.set(pathKey, count + 1);
    const finalName = count === 0
      ? rawName
      : `${rawName.replace(/(\.[^.]+)$/, '')}_${count}${rawName.match(/(\.[^.]+)$/)?.[1] ?? ''}`;

    zip.folder(folder)?.folder(label)?.file(finalName, arrayBuffer);
  }

  const zipBuffer = await zip.generateAsync({ type: 'arraybuffer' });
  const safeClientName = clientName.replace(/[^a-zA-Z0-9\u00C0-\u017F\s-]/g, '').trim();

  return new NextResponse(zipBuffer as BodyInit, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="HomeFlux_${safeClientName}_documentos.zip"`,
    },
  });
}
