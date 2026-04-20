import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { resend, FROM_EMAIL, APP_URL } from '@/lib/email';
import { render } from '@react-email/render';
import { LeadNotificationEmail } from '@/emails/lead-notification-email';

const schema = z.object({
  office_id: z.string().uuid(),
  // P1
  p1_nome: z.string().min(2),
  p1_email: z.string().email().optional().nullable().or(z.literal('')),
  p1_telefone: z.string().min(6),
  p1_nif: z.string().optional().nullable().or(z.literal('')),
  p1_data_nascimento: z.string().optional().nullable().or(z.literal('')),
  p1_tipo_emprego: z.string().optional().nullable(),
  // P2 (all optional)
  p2_nome: z.string().optional().nullable().or(z.literal('')),
  p2_email: z.string().optional().nullable().or(z.literal('')),
  p2_telefone: z.string().optional().nullable().or(z.literal('')),
  p2_nif: z.string().optional().nullable().or(z.literal('')),
  p2_data_nascimento: z.string().optional().nullable().or(z.literal('')),
  p2_tipo_emprego: z.string().optional().nullable(),
  // Operation
  tipo_operacao: z.enum(['aquisicao', 'construcao', 'refinanciamento', 'transferencia']),
  valor_imovel: z.number().optional().nullable(),
  montante_pretendido: z.number().optional().nullable(),
  prazo_pretendido: z.number().optional().nullable(),
  localizacao_imovel: z.string().optional().nullable().or(z.literal('')),
  // Contact prefs
  horario_preferencial: z.enum(['manha', 'tarde', 'qualquer']).optional().nullable(),
  mensagem: z.string().optional().nullable().or(z.literal('')),
  // Turnstile
  turnstile_token: z.string().optional().nullable(),
  // UTM
  utm_source: z.string().optional().nullable(),
  utm_medium: z.string().optional().nullable(),
  utm_campaign: z.string().optional().nullable(),
  // New fields
  rendimento_mensal: z.number().optional().nullable(),
  num_proponentes: z.number().optional().nullable(),
  imovel_escolhido: z.boolean().optional().nullable(),
  vender_imovel_atual: z.boolean().optional().nullable(),
  consent_marketing: z.boolean().optional().default(false),
  nome_proprio: z.string().optional().nullable(),
  apelido: z.string().optional().nullable(),
});

async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // skip in dev when no key configured

  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret, response: token, remoteip: ip }),
  });
  const data = await res.json() as { success: boolean };
  return data.success;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '';
  const userAgent = req.headers.get('user-agent') ?? '';

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  // Verify Turnstile
  if (data.turnstile_token) {
    const ok = await verifyTurnstile(data.turnstile_token, ip);
    if (!ok) {
      return NextResponse.json({ error: 'Verificação de segurança falhou' }, { status: 400 });
    }
  } else if (process.env.TURNSTILE_SECRET_KEY) {
    // Key is configured but no token submitted — reject
    return NextResponse.json({ error: 'Token de segurança em falta' }, { status: 400 });
  }

  const serviceClient = createAdminClient();

  // Check office exists and has lead capture enabled
  const { data: officeRaw } = await serviceClient
    .from('offices')
    .select('id, name, lead_capture_enabled, slug')
    .eq('id', data.office_id)
    .single();

  const office = officeRaw as {
    id: string;
    name: string;
    lead_capture_enabled: boolean;
    slug: string;
  } | null;

  if (!office || !office.lead_capture_enabled) {
    return NextResponse.json({ error: 'Página de captação não disponível' }, { status: 404 });
  }

  // Insert lead
  const { data: lead, error: insertError } = await serviceClient
    .from('leads')
    .insert({
      office_id: data.office_id,
      p1_nome: data.p1_nome,
      p1_email: data.p1_email || null,
      p1_telefone: data.p1_telefone,
      p1_nif: data.p1_nif || null,
      p1_data_nascimento: data.p1_data_nascimento || null,
      p1_tipo_emprego: data.p1_tipo_emprego || null,
      p2_nome: data.p2_nome || null,
      p2_email: data.p2_email || null,
      p2_telefone: data.p2_telefone || null,
      p2_nif: data.p2_nif || null,
      p2_data_nascimento: data.p2_data_nascimento || null,
      p2_tipo_emprego: data.p2_tipo_emprego || null,
      tipo_operacao: data.tipo_operacao,
      valor_imovel: data.valor_imovel ?? null,
      montante_pretendido: data.montante_pretendido ?? null,
      prazo_pretendido: data.prazo_pretendido ?? null,
      localizacao_imovel: data.localizacao_imovel || null,
      horario_preferencial: data.horario_preferencial ?? null,
      mensagem: data.mensagem || null,
      turnstile_token: data.turnstile_token || null,
      ip_address: ip || null,
      user_agent: userAgent || null,
      utm_source: data.utm_source || null,
      utm_medium: data.utm_medium || null,
      utm_campaign: data.utm_campaign || null,
      rendimento_mensal: data.rendimento_mensal ?? null,
      num_proponentes: data.num_proponentes ?? null,
      imovel_escolhido: data.imovel_escolhido ?? null,
      vender_imovel_atual: data.vender_imovel_atual ?? null,
      consent_marketing: data.consent_marketing ?? false,
      nome_proprio: data.nome_proprio ?? null,
      apelido: data.apelido ?? null,
      status: 'novo',
    })
    .select('id')
    .single();

  if (insertError) {
    console.error('Lead insert error:', insertError);
    return NextResponse.json({ error: 'Erro ao guardar contacto' }, { status: 500 });
  }

  // Send notification email to office admin(s)
  // TODO: allow office to configure a dedicated notification email override
  try {
    const { data: adminBrokersRaw } = await serviceClient
      .from('brokers')
      .select('user_id')
      .eq('office_id', data.office_id)
      .eq('is_office_admin', true)
      .eq('is_active', true);

    if (adminBrokersRaw && adminBrokersRaw.length > 0) {
      const userIds = (adminBrokersRaw as { user_id: string }[]).map((b) => b.user_id);
      const { data: usersRaw } = await serviceClient
        .from('users')
        .select('email')
        .in('id', userIds);

      const emails = (usersRaw as { email: string }[] | null)?.map((u) => u.email).filter(Boolean) ?? [];

      if (emails.length > 0 && lead) {
        const leadsUrl = `${APP_URL}/dashboard/leads`;
        const html = await render(
          LeadNotificationEmail({
            officeName: office.name,
            p1_nome: data.p1_nome,
            p1_telefone: data.p1_telefone || null,
            p1_email: data.p1_email || null,
            tipo_operacao: data.tipo_operacao,
            valor_imovel: data.valor_imovel ?? null,
            montante_pretendido: data.montante_pretendido ?? null,
            localizacao_imovel: data.localizacao_imovel || null,
            horario_preferencial: data.horario_preferencial ?? null,
            mensagem: data.mensagem || null,
            leadsUrl,
          })
        );

        await resend.emails.send({
          from: FROM_EMAIL,
          to: emails,
          subject: `Novo lead: ${data.p1_nome} — ${office.name}`,
          html,
        });
      }
    }
  } catch (emailErr) {
    // Non-fatal: lead was saved, email failure is acceptable
    console.error('Lead notification email error:', emailErr);
  }

  return NextResponse.json({ ok: true, id: (lead as { id: string } | null)?.id }, { status: 201 });
}
