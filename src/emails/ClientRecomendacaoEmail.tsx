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

interface ClientRecomendacaoEmailProps {
  clientName: string;
  officeName: string;
  brokerName: string;
  portalUrl: string;
}

export function ClientRecomendacaoEmail({
  clientName,
  officeName,
  brokerName,
  portalUrl,
}: ClientRecomendacaoEmailProps) {
  const firstName = clientName.trim().split(/\s+/)[0];

  return (
    <Html>
      <Head />
      <Preview>O seu mediador tem uma recomendação para si — {officeName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section>
            <Text style={heading}>{officeName}</Text>
            <Text style={paragraph}>
              Olá <strong>{firstName}</strong>,
            </Text>
            <Text style={paragraph}>
              O mediador <strong>{brokerName}</strong> da <strong>{officeName}</strong> analisou as propostas do seu processo e tem uma recomendação para si. Consulte a análise comparativa no seu portal.
            </Text>
            <Section style={btnContainer}>
              <Button style={button} href={portalUrl}>
                Ver recomendação
              </Button>
            </Section>
            <Hr style={hr} />
            <Text style={footer}>
              Acesso fornecido por {officeName} via HomeFlux.
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

const heading = {
  fontSize: '22px',
  fontWeight: '700',
  color: '#111827',
  marginBottom: '16px',
  marginTop: '0',
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
  fontSize: '11px',
  color: '#9ca3af',
  textAlign: 'center' as const,
  lineHeight: '1.5',
};
