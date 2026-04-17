import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const body = (await request.json()) as { subject?: string; message?: string };
  const { subject, message } = body;

  if (!subject?.trim() || !message?.trim()) {
    return NextResponse.json({ error: 'Assunto e mensagem são obrigatórios.' }, { status: 400 });
  }
  if (message.trim().length < 20) {
    return NextResponse.json({ error: 'A mensagem deve ter pelo menos 20 caracteres.' }, { status: 400 });
  }

  const serviceClient = await createServiceClient();

  const [{ data: userRaw }, { data: brokerRaw }] = await Promise.all([
    serviceClient.from('users').select('name, email').eq('id', user.id).single(),
    serviceClient.from('brokers').select('office_id').eq('user_id', user.id).eq('is_active', true).single(),
  ]);

  const userInfo = userRaw as { name: string; email: string } | null;
  const broker = brokerRaw as { office_id: string } | null;

  let officeName = 'Desconhecido';
  if (broker?.office_id) {
    const { data: officeRaw } = await serviceClient
      .from('offices').select('name').eq('id', broker.office_id).single();
    officeName = (officeRaw as { name: string } | null)?.name ?? 'Desconhecido';
  }

  const { error } = await serviceClient.from('support_tickets').insert({
    user_id: user.id,
    office_id: broker?.office_id ?? null,
    subject: subject.trim(),
    message: message.trim(),
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Email notification (non-blocking)
  const adminEmail = process.env.SUPER_ADMIN_EMAIL ?? 'daniel.araujo.esteves@gmail.com';
  resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev',
    to: adminEmail,
    subject: `HomeFlux Suporte — ${subject.trim()}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
        <h2 style="color:#1E40AF;margin-bottom:8px;">Novo pedido de suporte</h2>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin-bottom:24px;"/>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:6px 0;color:#64748b;font-size:14px;width:100px;">De</td>
              <td style="padding:6px 0;color:#0f172a;font-size:14px;font-weight:600;">${userInfo?.name ?? 'Desconhecido'} &lt;${userInfo?.email ?? ''}&gt;</td></tr>
          <tr><td style="padding:6px 0;color:#64748b;font-size:14px;">Escritório</td>
              <td style="padding:6px 0;color:#0f172a;font-size:14px;">${officeName}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b;font-size:14px;">Assunto</td>
              <td style="padding:6px 0;color:#0f172a;font-size:14px;font-weight:600;">${subject.trim()}</td></tr>
        </table>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;"/>
        <h3 style="color:#334155;font-size:14px;margin-bottom:8px;">Mensagem</h3>
        <p style="color:#475569;font-size:14px;line-height:1.7;white-space:pre-wrap;">${message.trim()}</p>
      </div>
    `,
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
