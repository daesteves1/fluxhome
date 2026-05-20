import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { resend, FROM_EMAIL } from '@/lib/email';
import { ResetPasswordEmail } from '@/emails/reset-password-email';
import { render } from '@react-email/render';
import React from 'react';

export async function POST(request: NextRequest) {
  const { email } = await request.json() as { email: string };
  if (!email) return NextResponse.json({ error: 'Missing email' }, { status: 400 });

  // Derive origin from the request so localhost in dev and production both work
  const origin = request.headers.get('origin') ?? request.headers.get('x-forwarded-host')
    ? `https://${request.headers.get('x-forwarded-host')}`
    : new URL(request.url).origin;

  const supabase = await createServiceClient();

  // Generate the Supabase recovery link (admin API — bypasses email sending)
  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: `${origin}/reset-password` },
  });

  if (error || !data?.properties?.action_link) {
    // Always return success to avoid email enumeration
    return NextResponse.json({ ok: true });
  }

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: 'Recuperação de password — HomeFlux',
    html: await render(React.createElement(ResetPasswordEmail, {
      resetUrl: data.properties.action_link,
    })),
  });

  return NextResponse.json({ ok: true });
}
