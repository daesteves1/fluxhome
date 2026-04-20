import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Hr,
  Preview,
} from '@react-email/components';
import * as React from 'react';

const TIPO_LABELS: Record<string, string> = {
  aquisicao: 'Aquisição',
  construcao: 'Construção',
  refinanciamento: 'Refinanciamento',
  transferencia: 'Transferência',
};

const HORARIO_LABELS: Record<string, string> = {
  manha: 'Manhã',
  tarde: 'Tarde',
  qualquer: 'Qualquer hora',
};

interface LeadNotificationEmailProps {
  officeName: string;
  p1_nome: string;
  p1_telefone: string | null;
  p1_email: string | null;
  tipo_operacao: string;
  valor_imovel: number | null;
  montante_pretendido: number | null;
  localizacao_imovel: string | null;
  horario_preferencial: string | null;
  mensagem: string | null;
  leadsUrl: string;
}

export function LeadNotificationEmail({
  officeName,
  p1_nome,
  p1_telefone,
  p1_email,
  tipo_operacao,
  valor_imovel,
  montante_pretendido,
  localizacao_imovel,
  horario_preferencial,
  mensagem,
  leadsUrl,
}: LeadNotificationEmailProps) {
  const fmt = (n: number) =>
    new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

  return (
    <Html>
      <Head />
      <Preview>Novo lead de {p1_nome} — {officeName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section>
            <Text style={heading}>Novo Lead Captado</Text>
            <Text style={paragraph}>
              Um novo contacto foi submetido através da página de captação do escritório{' '}
              <strong>{officeName}</strong>.
            </Text>

            <Hr style={hr} />

            <Text style={sectionTitle}>Contacto</Text>
            <Row label="Nome" value={p1_nome} />
            {p1_telefone && <Row label="Telefone" value={p1_telefone} />}
            {p1_email && <Row label="Email" value={p1_email} />}
            {horario_preferencial && (
              <Row label="Horário preferencial" value={HORARIO_LABELS[horario_preferencial] ?? horario_preferencial} />
            )}

            <Hr style={hr} />

            <Text style={sectionTitle}>Operação</Text>
            <Row label="Tipo" value={TIPO_LABELS[tipo_operacao] ?? tipo_operacao} />
            {valor_imovel && <Row label="Valor do imóvel" value={fmt(valor_imovel)} />}
            {montante_pretendido && <Row label="Montante pretendido" value={fmt(montante_pretendido)} />}
            {localizacao_imovel && <Row label="Localização" value={localizacao_imovel} />}

            {mensagem && (
              <>
                <Hr style={hr} />
                <Text style={sectionTitle}>Mensagem</Text>
                <Text style={paragraph}>{mensagem}</Text>
              </>
            )}

            <Hr style={hr} />

            <Text style={{ ...paragraph, textAlign: 'center' }}>
              <a href={leadsUrl} style={link}>Ver lead no HomeFlux →</a>
            </Text>

            <Hr style={hr} />
            <Text style={footer}>HomeFlux — Plataforma para Mediadores de Crédito</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Text style={row}>
      <span style={rowLabel}>{label}: </span>
      <span>{value}</span>
    </Text>
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

const heading = { fontSize: '20px', fontWeight: '700', color: '#111827', marginBottom: '12px' };
const paragraph = { fontSize: '14px', lineHeight: '1.6', color: '#374151', marginBottom: '8px' };
const sectionTitle = { fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: '4px' };
const row = { fontSize: '14px', color: '#111827', marginBottom: '4px' };
const rowLabel = { color: '#6b7280' };
const hr = { borderColor: '#e5e7eb', margin: '16px 0' };
const footer = { fontSize: '12px', color: '#9ca3af', textAlign: 'center' as const };
const link = { color: '#2563eb', fontWeight: '600' as const };
