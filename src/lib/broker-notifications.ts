/* eslint-disable @typescript-eslint/no-explicit-any */

export async function createBrokerNotification(
  serviceClient: any,
  opts: {
    brokerId: string;
    officeId: string;
    type: string;
    title: string;
    body?: string | null;
    link?: string | null;
  },
) {
  try {
    await serviceClient.from('broker_notifications').insert({
      broker_id: opts.brokerId,
      office_id: opts.officeId,
      type: opts.type,
      title: opts.title,
      body: opts.body ?? null,
      link: opts.link ?? null,
    });
  } catch (e) {
    console.error('[createBrokerNotification]', e);
  }
}
