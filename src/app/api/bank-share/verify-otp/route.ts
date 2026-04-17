/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const serviceClient = createAdminClient();
    const body = await request.json();

    const { token, otp } = body;

    // Find active link
    const { data: linkData, error: linkError } = await (serviceClient as any)
      .from('bank_share_links')
      .select('*')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .is('revoked_at', null)
      .single();

    if (linkError || !linkData) {
      return NextResponse.json({ error: 'Link inválido ou expirado' }, { status: 404 });
    }

    const link = linkData;

    // Find latest valid OTP
    const { data: otpsData, error: otpsError } = await (serviceClient as any)
      .from('bank_share_otps')
      .select('*')
      .eq('share_link_id', link.id)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (otpsError || !otpsData || otpsData.length === 0) {
      return NextResponse.json({ error: 'Código expirado. Solicite um novo código.' }, { status: 400 });
    }

    const otpRecord = otpsData[0];

    // Verify OTP
    const isValid = await bcrypt.compare(otp, otpRecord.otp_hash);

    // Get IP and user agent
    const ipAddress = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown';
    const userAgent = request.headers.get('user-agent') ?? 'unknown';

    if (isValid) {
      // Mark OTP as used
      await (serviceClient as any)
        .from('bank_share_otps')
        .update({ used_at: new Date().toISOString() })
        .eq('id', otpRecord.id);

      // Log successful verification
      await (serviceClient as any).from('bank_share_access_log').insert({
        share_link_id: link.id,
        event: 'otp_verified',
        ip_address: ipAddress,
        user_agent: userAgent,
      });

      return NextResponse.json({ success: true });
    }

    // OTP failed
    await (serviceClient as any).from('bank_share_access_log').insert({
      share_link_id: link.id,
      event: 'otp_failed',
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    // Count failed attempts
    const { data: failedLogsData } = await (serviceClient as any)
      .from('bank_share_access_log')
      .select('id')
      .eq('share_link_id', link.id)
      .eq('event', 'otp_failed');

    const failCount = failedLogsData ? failedLogsData.length : 0;

    if (failCount >= 5) {
      // Revoke link
      await (serviceClient as any)
        .from('bank_share_links')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', link.id);

      // Log link locked
      await (serviceClient as any).from('bank_share_access_log').insert({
        share_link_id: link.id,
        event: 'link_locked',
        ip_address: ipAddress,
        user_agent: userAgent,
      });

      return NextResponse.json({ locked: true });
    }

    return NextResponse.json({ success: false, attemptsRemaining: 5 - failCount });
  } catch (err) {
    console.error('Verify OTP error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
