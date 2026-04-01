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

  const { data: uploads } = await serviceClient
    .from('document_uploads')
    .select('storage_path, file_name')
    .eq('client_id', id);

  if (!uploads || uploads.length === 0) {
    return NextResponse.json({ error: 'No files' }, { status: 404 });
  }

  const zip = new JSZip();

  for (const upload of uploads) {
    const uploadItem = upload as { storage_path: string; file_name: string | null };
    const { data: fileData } = await supabase.storage
      .from('client-documents')
      .download(uploadItem.storage_path);

    if (fileData) {
      const arrayBuffer = await fileData.arrayBuffer();
      zip.file(uploadItem.file_name ?? uploadItem.storage_path.split('/').pop() ?? 'file', arrayBuffer);
    }
  }

  const zipBuffer = await zip.generateAsync({ type: 'arraybuffer' });

  return new NextResponse(zipBuffer as BodyInit, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="documents.zip"`,
    },
  });
}
