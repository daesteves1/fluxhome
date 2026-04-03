import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import JSZip from 'jszip';

interface RouteParams { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: RouteParams) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const serviceClient = await createServiceClient();

  // Parse optional upload ID filter from ?ids=id1,id2,...
  const idsParam = request.nextUrl.searchParams.get('ids');
  const filterIds = idsParam ? new Set(idsParam.split(',').filter(Boolean)) : null;

  // Fetch client name for zip filename
  const { data: clientRaw } = await serviceClient
    .from('clients')
    .select('p1_name')
    .eq('id', id)
    .single();
  const clientName = (clientRaw as { p1_name: string } | null)?.p1_name ?? 'cliente';

  // Fetch all uploads (or specific ones)
  const { data: allUploads } = await serviceClient
    .from('document_uploads')
    .select('id, storage_path, file_name')
    .eq('client_id', id);

  const uploads = (allUploads ?? []).filter((u) => {
    const item = u as { id: string; storage_path: string; file_name: string | null };
    return filterIds ? filterIds.has(item.id) : true;
  });

  if (uploads.length === 0) {
    return NextResponse.json({ error: 'No files' }, { status: 404 });
  }

  const zip = new JSZip();

  // Track filenames to avoid collisions
  const usedNames = new Map<string, number>();

  for (const upload of uploads) {
    const item = upload as { id: string; storage_path: string; file_name: string | null };

    const { data: fileData } = await serviceClient.storage
      .from('client-documents')
      .download(item.storage_path);

    if (!fileData) continue;

    const arrayBuffer = await fileData.arrayBuffer();
    const baseName = item.file_name ?? item.storage_path.split('/').pop() ?? 'file';

    // Deduplicate filenames
    const count = usedNames.get(baseName) ?? 0;
    usedNames.set(baseName, count + 1);
    const zipName = count === 0 ? baseName : `${baseName.replace(/(\.[^.]+)$/, '')}_${count}${baseName.match(/(\.[^.]+)$/)?.[1] ?? ''}`;

    zip.file(zipName, arrayBuffer);
  }

  const zipBuffer = await zip.generateAsync({ type: 'arraybuffer' });
  const safeClientName = clientName.replace(/[^a-zA-Z0-9\u00C0-\u017F\s-]/g, '').trim();

  return new NextResponse(zipBuffer as BodyInit, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="homeflux-${safeClientName}-documentos.zip"`,
    },
  });
}
