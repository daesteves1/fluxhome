/* eslint-disable @typescript-eslint/no-explicit-any */
import { render } from '@react-email/render';
import { resend, FROM_EMAIL, APP_URL } from '@/lib/email';
import { ClientWelcomeEmail } from '@/emails/ClientWelcomeEmail';
import { ClientNudgeEmail } from '@/emails/ClientNudgeEmail';
import { ClientPropostasEmail } from '@/emails/ClientPropostasEmail';
import { ClientRecomendacaoEmail } from '@/emails/ClientRecomendacaoEmail';
import { ClientDocRequestedEmail } from '@/emails/ClientDocRequestedEmail';

async function getContext(serviceClient: any, brokerId: string, officeId: string) {
  const [{ data: brokerData }, { data: officeData }] = await Promise.all([
    serviceClient.from('brokers').select('user_id').eq('id', brokerId).single(),
    serviceClient.from('offices').select('name, settings').eq('id', officeId).single(),
  ]);

  const officeName: string = officeData?.name ?? 'HomeFlux';
  const notifSettings: Record<string, any> = officeData?.settings?.notifications ?? {};

  let brokerName = 'Mediador';
  if (brokerData?.user_id) {
    const { data: userData } = await serviceClient.from('users').select('name, email').eq('id', brokerData.user_id).single();
    brokerName = userData?.name ?? userData?.email ?? 'Mediador';
  }

  return { officeName, brokerName, notifSettings };
}

export async function sendClientWelcomeEmail(
  serviceClient: any,
  opts: { clientName: string; clientEmail: string | null; portalToken: string | null; brokerId: string; officeId: string },
) {
  if (!opts.clientEmail || !opts.portalToken) return;
  try {
    const { officeName, brokerName, notifSettings } = await getContext(serviceClient, opts.brokerId, opts.officeId);
    if (notifSettings.client_process_created === false) return;
    const portalUrl = `${APP_URL}/portal/${opts.portalToken}`;
    const html = await render(ClientWelcomeEmail({ clientName: opts.clientName, officeName, brokerName, portalUrl }));
    await resend.emails.send({ from: `${officeName} <${FROM_EMAIL}>`, to: opts.clientEmail, subject: `O seu processo foi criado — ${officeName}`, html });
  } catch (e) {
    console.error('[sendClientWelcomeEmail]', e);
  }
}

export async function sendClientNudgeEmail(
  serviceClient: any,
  opts: { clientName: string; clientEmail: string | null; portalToken: string | null; brokerId: string; officeId: string; pendingCount: number },
) {
  if (!opts.clientEmail || !opts.portalToken || opts.pendingCount === 0) return;
  try {
    const { officeName, brokerName, notifSettings } = await getContext(serviceClient, opts.brokerId, opts.officeId);
    if ((notifSettings.client_nudge_days ?? 7) <= 0) return;
    const portalUrl = `${APP_URL}/portal/${opts.portalToken}`;
    const html = await render(ClientNudgeEmail({ clientName: opts.clientName, officeName, brokerName, portalUrl, pendingCount: opts.pendingCount }));
    await resend.emails.send({ from: `${officeName} <${FROM_EMAIL}>`, to: opts.clientEmail, subject: `Documentos pendentes no seu processo — ${officeName}`, html });
  } catch (e) {
    console.error('[sendClientNudgeEmail]', e);
  }
}

export async function sendClientPropostasEmail(
  serviceClient: any,
  opts: { clientName: string; clientEmail: string | null; portalToken: string | null; brokerId: string; officeId: string },
) {
  if (!opts.clientEmail || !opts.portalToken) return;
  try {
    const { officeName, brokerName, notifSettings } = await getContext(serviceClient, opts.brokerId, opts.officeId);
    if (notifSettings.client_propostas_available === false) return;
    const portalUrl = `${APP_URL}/portal/${opts.portalToken}`;
    const html = await render(ClientPropostasEmail({ clientName: opts.clientName, officeName, brokerName, portalUrl }));
    await resend.emails.send({ from: `${officeName} <${FROM_EMAIL}>`, to: opts.clientEmail, subject: `Propostas disponíveis no seu processo — ${officeName}`, html });
  } catch (e) {
    console.error('[sendClientPropostasEmail]', e);
  }
}

export async function sendClientRecomendacaoEmail(
  serviceClient: any,
  opts: { clientName: string; clientEmail: string | null; portalToken: string | null; brokerId: string; officeId: string },
) {
  if (!opts.clientEmail || !opts.portalToken) return;
  try {
    const { officeName, brokerName, notifSettings } = await getContext(serviceClient, opts.brokerId, opts.officeId);
    if (notifSettings.client_recomendacao_available === false) return;
    const portalUrl = `${APP_URL}/portal/${opts.portalToken}`;
    const html = await render(ClientRecomendacaoEmail({ clientName: opts.clientName, officeName, brokerName, portalUrl }));
    await resend.emails.send({ from: `${officeName} <${FROM_EMAIL}>`, to: opts.clientEmail, subject: `O seu mediador tem uma recomendação — ${officeName}`, html });
  } catch (e) {
    console.error('[sendClientRecomendacaoEmail]', e);
  }
}

export async function sendClientDocRequestedEmail(
  serviceClient: any,
  opts: { clientName: string; clientEmail: string | null; portalToken: string | null; brokerId: string; officeId: string; docLabels: string[] },
) {
  if (!opts.clientEmail || !opts.portalToken || opts.docLabels.length === 0) return;
  try {
    const { officeName, brokerName, notifSettings } = await getContext(serviceClient, opts.brokerId, opts.officeId);
    if (notifSettings.client_doc_requested_after_creation === false) return;
    const portalUrl = `${APP_URL}/portal/${opts.portalToken}`;
    const html = await render(ClientDocRequestedEmail({ clientName: opts.clientName, officeName, brokerName, portalUrl, docLabels: opts.docLabels }));
    await resend.emails.send({ from: `${officeName} <${FROM_EMAIL}>`, to: opts.clientEmail, subject: `Novos documentos solicitados — ${officeName}`, html });
  } catch (e) {
    console.error('[sendClientDocRequestedEmail]', e);
  }
}
