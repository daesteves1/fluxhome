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

interface ActivationSuccessEmailProps {
  name: string;
  loginUrl: string;
}

export function ActivationSuccessEmail({ name, loginUrl }: ActivationSuccessEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Conta ativada com sucesso — HomeFlux</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section>
            <Text style={heading}>Conta Ativada!</Text>
            <Text style={paragraph}>
              Olá {name},
            </Text>
            <Text style={paragraph}>
              A sua conta HomeFlux foi ativada com sucesso. Já pode aceder à plataforma.
            </Text>
            <Section style={btnContainer}>
              <Button style={button} href={loginUrl}>
                Aceder ao HomeFlux
              </Button>
            </Section>
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
  backgroundColor: '#16a34a',
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
