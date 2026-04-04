import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

interface RouteParams { params: Promise<{ uploadId: string }> }

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { uploadId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = await createServiceClient();

  const { data: uploadRaw } = await serviceClient
    .from('document_uploads')
    .select('storage_path')
    .eq('id', uploadId)
    .single();

  if (!uploadRaw) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const upload = uploadRaw as { storage_path: string };

  const { data, error } = await serviceClient.storage
    .from('client-documents')
    .createSignedUrl(upload.storage_path, 3600);

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: error?.message ?? 'Failed to create signed URL' }, { status: 500 });
  }

  return NextResponse.json({ url: data.signedUrl });
}
