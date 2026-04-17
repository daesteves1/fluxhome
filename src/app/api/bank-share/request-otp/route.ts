/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { resend } from '@/lib/email';
import { BankShareOtpEmail } from '@/emails/BankShareOtpEmail';
import { render } from '@react-email/render';
import bcrypt from 'bcryptjs';

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  const masked = local[0] + '***';
  return `${masked}@${domain}`;
}

export async function POST(request: NextRequest) {
  try {
    const serviceClient = createAdminClient();
    const body = await request.json();

    const { token } = body;
    console.log('[otp] step 1 — find link, token:', token?.slice(0, 8));

    // Find active link
    const { data: linkData, error: linkError } = await (serviceClient as any)
      .from('bank_share_links')
      .select('*')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .is('revoked_at', null)
      .single();

    if (linkError || !linkData) {
      console.error('[otp] link not found:', linkError);
      return NextResponse.json({ error: 'Link inválido ou expirado' }, { status: 404 });
    }

    const link = linkData;
    console.log('[otp] step 2 — rate limit check, link.id:', link.id);

    // Rate limit: count OTP requests in last 60 minutes
    const { data: otpData, error: otpQueryError } = await (serviceClient as any)
      .from('bank_share_otps')
      .select('created_at')
      .eq('share_link_id', link.id);

    if (otpQueryError) {
      console.error('[otp] rate limit query error:', otpQueryError);
    }

    if (!otpQueryError && otpData) {
      const recentOtps = otpData.filter((otp: any) => {
        return new Date(otp.created_at) > new Date(Date.now() - 60 * 60 * 1000);
      });

      if (recentOtps.length >= 3) {
        return NextResponse.json({ error: 'Demasiadas tentativas. Tente mais tarde.' }, { status: 429 });
      }
    }

    console.log('[otp] step 3 — generating OTP');
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash with bcryptjs
    const hash = await bcrypt.hash(otp, 10);
    console.log('[otp] step 4 — insert OTP record');

    // Insert into bank_share_otps
    const { data: insertedOtp, error: insertError } = await (serviceClient as any)
      .from('bank_share_otps')
      .insert({
        share_link_id: link.id,
        otp_hash: hash,
      })
      .select('*')
      .single();

    if (insertError || !insertedOtp) {
      console.error('[otp] insert error:', insertError);
      return NextResponse.json({ error: 'Failed to generate OTP' }, { status: 500 });
    }

    console.log('[otp] step 5 — send email to:', link.contact_email);

    // Send OTP email
    const emailHtml = await render(BankShareOtpEmail({ otp }));

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'noreply@esteeve.com',
      to: link.contact_email,
      subject: `Código de acesso: ${otp}`,
      html: emailHtml,
    });

    if (emailError) {
      console.error('[bank-share/request-otp] Resend error:', emailError);
      // Still return success — OTP was created; user can retry
    } else {
      console.log('[bank-share/request-otp] Email sent, id:', emailData?.id);
    }

    // Get IP and user agent
    const ipAddress = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown';
    const userAgent = request.headers.get('user-agent') ?? 'unknown';

    // Log to bank_share_access_log
    await (serviceClient as any).from('bank_share_access_log').insert({
      share_link_id: link.id,
      event: 'otp_requested',
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    // Mask email
    const maskedEmail = maskEmail(link.contact_email);

    return NextResponse.json({ masked_email: maskedEmail });
  } catch (err) {
    console.error('Request OTP error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
