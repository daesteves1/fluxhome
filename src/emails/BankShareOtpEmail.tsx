import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Preview,
} from '@react-email/components';
import * as React from 'react';

interface BankShareOtpEmailProps {
  otp: string;
}

export function BankShareOtpEmail({ otp }: BankShareOtpEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Código de acesso: {otp}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={{ textAlign: 'center' as const }}>
            <Text style={otpCode}>{otp}</Text>
            <Text style={paragraph}>
              Este código expira em 15 minutos e só pode ser utilizado uma vez.
            </Text>
            <Text style={warningText}>
              Se não solicitou este acesso, ignore este email.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '40px auto',
  padding: '32px',
  borderRadius: '8px',
  maxWidth: '560px',
  border: '1px solid #e5e7eb',
};

const otpCode = {
  fontSize: '48px',
  fontWeight: '700',
  color: '#111827',
  margin: '24px 0',
  fontFamily: 'monospace',
  letterSpacing: '8px',
};

const paragraph = {
  fontSize: '15px',
  lineHeight: '1.6',
  color: '#374151',
  marginBottom: '16px',
  marginTop: '0',
};

const warningText = {
  fontSize: '13px',
  color: '#6b7280',
  marginTop: '16px',
};
