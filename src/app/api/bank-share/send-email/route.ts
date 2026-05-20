/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { resend } from '@/lib/email';
import { formatDocFileName } from '@/lib/file-utils';
import JSZip from 'jszip';

const TIPO_LABELS: Record<string, string> = {
  credito_habitacao: 'Crédito Habitação',
  renegociacao: 'Renegociação',
  construcao: 'Construção',
  outro: 'Outro',
};

function fmt(val: unknown): string {
  if (val == null || val === '') return '—';
  return String(val);
}

function fmtCurrency(val: unknown): string {
  const n = Number(val);
  if (!val || isNaN(n)) return '—';
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}

function fmtDate(val: unknown): string {
  if (!val) return '—';
  try { return new Date(String(val)).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
  catch { return '—'; }
}

function fmtPrazo(months: unknown): string {
  const n = Number(months);
  if (!n) return '—';
  return n % 12 === 0 ? `${n / 12} anos` : `${n} meses`;
}

function row(label: string, value: string): string {
  return `<tr>
    <td style="padding:6px 12px 6px 0;font-size:12px;color:#64748b;white-space:nowrap;vertical-align:top">${label}</td>
    <td style="padding:6px 0;font-size:13px;color:#1e293b;font-weight:500">${value}</td>
  </tr>`;
}

function section(title: string, rows: string): string {
  return `<div style="margin-top:24px">
    <p style="font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#94a3b8;margin:0 0 8px">${title}</p>
    <table cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;background:#f8fafc;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0">
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const serviceClient = createAdminClient();

    const { data: brokerDataRaw, error: brokerError } = await (serviceClient as any)
      .from('brokers')
      .select('id, office_id, is_office_admin')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1);
    const brokerData = ((brokerDataRaw ?? [])[0] ?? null);
    if (brokerError || !brokerData) return NextResponse.json({ error: 'Broker not found' }, { status: 404 });

    const body = await request.json() as {
      clientId: string;
      bankId: string;
      bankName: string;
      contactEmail: string;
      emailBody: string;
      checkedDocRequestIds: string[];
      expiresAt: string;
    };
    const { clientId, bankId, bankName, contactEmail, emailBody, checkedDocRequestIds, expiresAt } = body;

    if (!clientId || !bankId || !bankName || !contactEmail || !expiresAt) {
      return NextResponse.json({ error: 'Campos obrigatórios em falta' }, { status: 400 });
    }

    // Verify broker access to client
    const { data: clientData, error: clientError } = await (serviceClient as any)
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();
    if (clientError || !clientData) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

    const isOwner = clientData.broker_id === brokerData.id;
    const isOfficeAdmin = brokerData.is_office_admin && clientData.office_id === brokerData.office_id;
    if (!isOwner && !isOfficeAdmin) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

    // Office + broker name
    const { data: officeData } = await (serviceClient as any)
      .from('offices')
      .select('name')
      .eq('id', brokerData.office_id)
      .single();
    const officeName: string = officeData?.name ?? 'HomeFlux';

    const { data: userData } = await (serviceClient as any)
      .from('users').select('name').eq('id', user.id).single();
    const brokerName: string = (userData as { name?: string } | null)?.name ?? user.email ?? 'Mediador';

    // Most recent process for client (for email details section)
    const { data: processData } = await (serviceClient as any)
      .from('processes')
      .select('tipo, finalidade, montante_solicitado, prazo_meses, valor_imovel, p1_profissao, p1_entidade_empregadora, p1_tipo_contrato, p1_rendimento_mensal, p2_profissao, p2_entidade_empregadora, p2_tipo_contrato, p2_rendimento_mensal')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Build ZIP from selected approved doc requests
    const zip = new JSZip();
    let docCount = 0;
    const docNames: string[] = [];

    if (checkedDocRequestIds.length > 0) {
      const { data: docRequests } = await (serviceClient as any)
        .from('document_requests')
        .select('id, label, doc_type, proponente, status')
        .in('id', checkedDocRequestIds)
        .eq('client_id', clientId)
        .eq('status', 'approved');

      if (docRequests && docRequests.length > 0) {
        for (const req of docRequests) {
          const { data: uploads } = await (serviceClient as any)
            .from('document_uploads')
            .select('id, storage_path, file_name')
            .eq('document_request_id', req.id);

          if (!uploads || uploads.length === 0) continue;

          const folder = req.proponente === 'p1' ? 'Proponente_1' : req.proponente === 'p2' ? 'Proponente_2' : 'Partilhado';

          for (let i = 0; i < uploads.length; i++) {
            const upload = uploads[i];
            const { data: fileData, error: fileError } = await serviceClient.storage
              .from('client-documents')
              .download(upload.storage_path);

            if (!fileError && fileData) {
              const fileName = formatDocFileName(req.doc_type, req.proponente, upload.file_name, uploads.length > 1 ? i : undefined);
              // Supabase returns a Blob in Node.js; convert to ArrayBuffer for JSZip
              const arrayBuffer = await fileData.arrayBuffer();
              zip.folder(folder)?.file(fileName, arrayBuffer);
              docCount++;
              docNames.push(req.label);
            }
          }
        }
      }
    }

    // Create bank_share_link for audit trail
    const { data: shareLink } = await (serviceClient as any)
      .from('bank_share_links')
      .insert({
        client_id: clientId,
        broker_id: brokerData.id,
        bank_id: bankId,
        bank_name: bankName,
        contact_email: contactEmail,
        note: emailBody || null,
        expires_at: expiresAt,
      })
      .select('id')
      .single();

    // ── Build email HTML ──────────────────────────────────────────────────────
    const c = clientData as any;
    const p = processData as any;

    const montante = p?.montante_solicitado ?? c.loan_amount ?? null;
    const prazo = p?.prazo_meses ?? c.term_months ?? null;
    const valorImovel = p?.valor_imovel ?? c.property_value ?? null;
    const ltv = montante && valorImovel ? `${Math.round((Number(montante) / Number(valorImovel)) * 100)}%` : '—';
    const tipo = p?.tipo ? (TIPO_LABELS[p.tipo] ?? p.tipo) : (c.mortgage_type ?? '—');

    const bodyHtml = emailBody
      ? `<div style="background:#f8fafc;border-radius:8px;padding:16px 20px;margin-bottom:0;color:#334155;line-height:1.7;font-size:14px;white-space:pre-line">${emailBody.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>`
      : '';

    const processRows = [
      row('Tipo', fmt(tipo)),
      row('Finalidade', fmt(p?.finalidade)),
      row('Montante solicitado', fmtCurrency(montante)),
      row('Prazo', fmtPrazo(prazo)),
      row('Valor do imóvel', fmtCurrency(valorImovel)),
      row('Rácio LTV', ltv),
    ].join('');

    const proponenteSection = (prefix: 'p1' | 'p2', label: string) => {
      const name = c[`${prefix}_name`];
      if (!name) return '';
      const rows = [
        row('Nome completo', fmt(name)),
        row('Data de nascimento', fmtDate(c[`${prefix}_birth_date`])),
        row('NIF', fmt(c[`${prefix}_nif`])),
        row('Profissão', fmt(p?.[`${prefix}_profissao`])),
        row('Entidade empregadora', fmt(p?.[`${prefix}_entidade_empregadora`])),
        row('Tipo de contrato', fmt(p?.[`${prefix}_tipo_contrato`] ?? c[`${prefix}_employment_type`])),
        row('Rendimento mensal líquido', fmtCurrency(p?.[`${prefix}_rendimento_mensal`])),
      ].join('');
      return section(label, rows);
    };

    const docListHtml = docNames.length > 0
      ? `<div style="margin-top:24px">
          <p style="font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#94a3b8;margin:0 0 8px">Documentos anexados (ZIP)</p>
          <ul style="margin:0;padding-left:20px;color:#475569;font-size:13px;line-height:1.8">
            ${docNames.map((n) => `<li>${n}</li>`).join('')}
          </ul>
        </div>`
      : '';

    const emailHtml = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<div style="max-width:580px;margin:32px auto;padding:0 16px 48px">
  <!-- Header -->
  <div style="background:#0f172a;border-radius:12px 12px 0 0;padding:20px 24px">
    <p style="margin:0;font-size:14px;font-weight:600;color:#fff">${officeName}</p>
    <p style="margin:4px 0 0;font-size:12px;color:#94a3b8">${brokerName}</p>
  </div>
  <!-- Body -->
  <div style="background:#fff;border-radius:0 0 12px 12px;padding:28px 24px;border:1px solid #e2e8f0;border-top:none">
    <h2 style="margin:0 0 4px;font-size:18px;font-weight:700;color:#0f172a">Documentação do processo</h2>
    <p style="margin:0 0 20px;font-size:14px;color:#64748b">${fmt(c.p1_name)}${c.p2_name ? ` &amp; ${fmt(c.p2_name)}` : ''}</p>

    ${bodyHtml}

    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">

    ${section('Dados do processo', processRows)}
    ${proponenteSection('p1', 'Proponente 1')}
    ${proponenteSection('p2', 'Proponente 2')}
    ${docListHtml}
  </div>
  <!-- Footer -->
  <p style="text-align:center;font-size:11px;color:#94a3b8;margin-top:16px">${officeName} via HomeFlux &middot; Acesso confidencial</p>
</div>
</body>
</html>`;

    // Build email with optional ZIP attachment
    const emailPayload: Parameters<typeof resend.emails.send>[0] = {
      from: `${officeName} <noreply@esteeve.com>`,
      to: contactEmail,
      subject: `Documentação — ${fmt(c.p1_name)} — ${officeName}`,
      html: emailHtml,
    };

    if (docCount > 0) {
      const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
      (emailPayload as any).attachments = [{
        filename: `Documentos_${String(c.p1_name).replace(/\s+/g, '_')}.zip`,
        content: zipBuffer,
      }];
    }

    const { error: emailError } = await resend.emails.send(emailPayload);
    if (emailError) {
      console.error('[bank-share/send-email] Resend error:', emailError);
      return NextResponse.json({ error: 'Erro ao enviar email' }, { status: 500 });
    }

    // Audit log (non-fatal)
    if (shareLink) {
      try {
        await (serviceClient as any).from('audit_log').insert({
          action: 'bank_share_email_sent',
          actor_user_id: user.id,
          target_type: 'bank_share_link',
          target_id: shareLink.id,
          metadata: { bank_name: bankName, contact_email: contactEmail, doc_count: docCount },
        });
      } catch { /* non-fatal */ }
    }

    return NextResponse.json({ success: true, docCount });
  } catch (err) {
    console.error('[bank-share/send-email] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
