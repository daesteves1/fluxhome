import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Button,
  Hr,
  Preview,
} from '@react-email/components';
import * as React from 'react';

interface InvitationEmailProps {
  officeName: string;
  inviteeName: string;
  activationUrl: string;
}

export function InvitationEmail({ officeName, inviteeName, activationUrl }: InvitationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Convite para {officeName} — HomeFlux</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section>
            <Text style={heading}>Bem-vindo ao HomeFlux</Text>
            <Text style={paragraph}>
              Olá {inviteeName},
            </Text>
            <Text style={paragraph}>
              Recebeu um convite para se juntar ao escritório <strong>{officeName}</strong> na plataforma HomeFlux.
            </Text>
            <Text style={paragraph}>
              Clique no botão abaixo para ativar a sua conta:
            </Text>
            <Section style={btnContainer}>
              <Button style={button} href={activationUrl}>
                Ativar Conta
              </Button>
            </Section>
            <Text style={paragraph}>
              Este link é válido por 72 horas. Se não solicitou este convite, pode ignorar este email.
            </Text>
            <Hr style={hr} />
            <Text style={footer}>HomeFlux — Plataforma para Mediadores de Crédito</Text>
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

const heading = {
  fontSize: '22px',
  fontWeight: '700',
  color: '#111827',
  marginBottom: '16px',
};

const paragraph = {
  fontSize: '15px',
  lineHeight: '1.6',
  color: '#374151',
  marginBottom: '12px',
};

const btnContainer = {
  textAlign: 'center' as const,
  margin: '24px 0',
};

const button = {
  backgroundColor: '#2563eb',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '15px',
  fontWeight: '600',
  padding: '12px 28px',
  textDecoration: 'none',
  display: 'inline-block',
};

const hr = {
  borderColor: '#e5e7eb',
  margin: '24px 0',
};

const footer = {
  fontSize: '12px',
  color: '#9ca3af',
  textAlign: 'center' as const,
};
