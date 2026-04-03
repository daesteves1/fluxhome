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

interface ClientLinkEmailProps {
  clientName: string;
  brokerName: string;
  officeName: string;
  portalUrl: string;
}

export function ClientLinkEmail({ clientName, brokerName, officeName, portalUrl }: ClientLinkEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>O seu portal de documentos — {officeName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section>
            <Text style={heading}>{officeName}</Text>
            <Text style={paragraph}>
              Caro(a) {clientName},
            </Text>
            <Text style={paragraph}>
              O seu mediador <strong>{brokerName}</strong> criou um portal seguro onde pode enviar documentos e consultar propostas relacionadas com o seu crédito habitação.
            </Text>
            <Section style={btnContainer}>
              <Button style={button} href={portalUrl}>
                Aceder ao Portal
              </Button>
            </Section>
            <Text style={smallText}>
              Este link é pessoal e intransmissível. Não partilhe com terceiros.
            </Text>
            <Hr style={hr} />
            <Text style={footer}>{officeName} via HomeFlux</Text>
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

const smallText = {
  fontSize: '12px',
  color: '#6b7280',
  textAlign: 'center' as const,
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
