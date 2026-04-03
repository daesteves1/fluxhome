import { Resend } from 'resend';

export const resend = new Resend(process.env.RESEND_API_KEY);

export const FROM_EMAIL = process.env.EMAIL_FROM ?? 'noreply@homeflux.pt';

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.homeflux.pt';
