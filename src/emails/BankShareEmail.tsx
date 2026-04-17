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
  Img,
} from '@react-email/components';
import * as React from 'react';

interface BankShareEmailProps {
  officeName: string;
  officeLogoUrl: string | null;
  brokerName: string;
  note: string | null;
  shareUrl: string;
  expiresAt: string;
  contactEmail: string;
}

export function BankShareEmail({
  officeName,
  officeLogoUrl,
  brokerName,
  note,
  shareUrl,
  expiresAt,
  contactEmail,
}: BankShareEmailProps) {
  const expiresDate = new Date(expiresAt).toLocaleDateString('pt-PT');

  return (
    <Html>
      <Head />
      <Preview>Documentação de crédito habitação para análise — {officeName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section>
            {officeLogoUrl && (
              <Img
                src={officeLogoUrl}
                alt={officeName}
                style={{
                  height: '40px',
                  marginBottom: '16px',
                  display: 'block',
                }}
              />
            )}
            <Text style={heading}>{officeName}</Text>
            <Text style={paragraph}>
              O mediador <strong>{brokerName}</strong> da <strong>{officeName}</strong> partilhou consigo a documentação de um processo de crédito habitação para análise.
            </Text>
            {note && (
              <Section
                style={{
                  borderLeft: '4px solid #9ca3af',
                  backgroundColor: '#f3f4f6',
                  padding: '12px 16px',
                  marginBottom: '16px',
                  borderRadius: '4px',
                }}
              >
                <Text
                  style={{
                    fontSize: '14px',
                    lineHeight: '1.5',
                    color: '#374151',
                    fontStyle: 'italic',
                    margin: '0',
                  }}
                >
                  Nota do mediador: {note}
                </Text>
              </Section>
            )}
            <Section style={btnContainer}>
              <Button style={button} href={shareUrl}>
                Aceder à documentação
              </Button>
            </Section>
            <Text style={securityText}>
              Por razões de segurança, ser-lhe-á pedido um código de verificação enviado para este endereço de email. Este link expira em <strong>{expiresDate}</strong>.
            </Text>
            <Hr style={hr} />
            <Text style={footer}>
              Este acesso é estritamente confidencial e destinado exclusivamente a {contactEmail}. Não partilhe este link. Acesso fornecido por {officeName} via HomeFlux.
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

const securityText = {
  fontSize: '13px',
  color: '#6b7280',
  textAlign: 'center' as const,
  marginTop: '16px',
  marginBottom: '16px',
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
