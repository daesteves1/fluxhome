import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { name, email, office, message } = (await request.json()) as {
      name: string;
      email: string;
      office?: string;
      message: string;
    };

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Campos obrigatórios em falta.' }, { status: 400 });
    }

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev',
      to: 'daniel.araujo.esteves@gmail.com',
      subject: `HomeFlux — Contacto do website: ${name}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1E40AF; margin-bottom: 8px;">Novo contacto via HomeFlux</h2>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin-bottom: 24px;" />
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px; width: 120px;">Nome</td>
              <td style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: 600;">${name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Email</td>
              <td style="padding: 8px 0; color: #0f172a; font-size: 14px;"><a href="mailto:${email}" style="color: #1E40AF;">${email}</a></td>
            </tr>
            ${office ? `
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Escritório</td>
              <td style="padding: 8px 0; color: #0f172a; font-size: 14px;">${office}</td>
            </tr>
            ` : ''}
          </table>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <h3 style="color: #334155; font-size: 14px; margin-bottom: 8px;">Mensagem</h3>
          <p style="color: #475569; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${message}</p>
        </div>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Contact form error:', err);
    return NextResponse.json({ error: 'Erro ao enviar mensagem.' }, { status: 500 });
  }
}
