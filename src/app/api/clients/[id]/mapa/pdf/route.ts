import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import React from 'react';
import { renderToBuffer, Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import type { BankProposta } from '@/types/proposta';
import {
  ONE_TIME_CHARGE_FIELDS,
  calcSubtotalBanco,
  calcSubtotalExterno,
  calcTotalEncargosUnicos,
  fmtEur,
  fmtPct,
  RATE_TYPE_LABELS,
  EURIBOR_LABELS,
} from '@/types/proposta';

interface RouteParams { params: Promise<{ id: string }> }

const styles = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 8, padding: 24, backgroundColor: '#FFFFFF' },
  title: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#1E3A5F', marginBottom: 12 },
  sectionHeader: {
    backgroundColor: '#E8EEF7', padding: '4 6', marginTop: 8, marginBottom: 2,
    fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#1E3A5F',
  },
  table: { display: 'flex', flexDirection: 'column', width: '100%' },
  row: { display: 'flex', flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#CCCCCC', borderBottomStyle: 'solid' },
  labelCell: { width: '30%', padding: '3 6', color: '#333333' },
  dataCell: { padding: '3 4', textAlign: 'center', flex: 1 },
  totalRow: { backgroundColor: '#E8EEF7', fontFamily: 'Helvetica-Bold' },
  greenCell: { backgroundColor: '#D4EDDA' },
  recCell: { backgroundColor: '#E8F0FF' },
  bankHeader: { backgroundColor: '#1E3A5F', color: '#FFFFFF', fontFamily: 'Helvetica-Bold', padding: '5 4', textAlign: 'center', flex: 1 },
  recBankHeader: { backgroundColor: '#2D5BA3', color: '#FFFFFF', fontFamily: 'Helvetica-Bold', padding: '5 4', textAlign: 'center', flex: 1 },
  headerLabelCell: { width: '30%', backgroundColor: '#1E3A5F', padding: '5 6' },
  footer: { marginTop: 16, fontSize: 7, color: '#999999', textAlign: 'center' },
});

function SectionHeader({ label }: { label: string }) {
  return React.createElement(View, { style: styles.sectionHeader },
    React.createElement(Text, null, label)
  );
}

function DataRow({
  label, values, propostas, recId, highlights,
}: {
  label: string;
  values: string[];
  propostas: BankProposta[];
  recId: string | null;
  highlights?: boolean[];
}) {
  return React.createElement(View, { style: styles.row },
    React.createElement(View, { style: styles.labelCell },
      React.createElement(Text, null, label)
    ),
    ...values.map((v, i) => {
      const isGreen = highlights?.[i];
      const isRec = !isGreen && propostas[i]?.id === recId;
      return React.createElement(View, {
        key: i,
        style: [styles.dataCell, isGreen ? styles.greenCell : isRec ? styles.recCell : {}],
      }, React.createElement(Text, null, v));
    })
  );
}

function TotalRow({
  label, values, propostas, recId, highlights,
}: {
  label: string;
  values: string[];
  propostas: BankProposta[];
  recId: string | null;
  highlights?: boolean[];
}) {
  return React.createElement(View, { style: [styles.row, styles.totalRow] },
    React.createElement(View, { style: styles.labelCell },
      React.createElement(Text, null, label)
    ),
    ...values.map((v, i) => {
      const isGreen = highlights?.[i];
      const isRec = !isGreen && propostas[i]?.id === recId;
      return React.createElement(View, {
        key: i,
        style: [styles.dataCell, styles.totalRow, isGreen ? styles.greenCell : isRec ? styles.recCell : {}],
      }, React.createElement(Text, null, v));
    })
  );
}

function MapaDocument({ propostas, recId }: { propostas: BankProposta[]; recId: string | null }) {
  const minSubBanco = Math.min(...propostas.map(calcSubtotalBanco).filter((v) => v > 0));
  const minSubExt = Math.min(...propostas.map(calcSubtotalExterno).filter((v) => v > 0));
  const totals = propostas.map(calcTotalEncargosUnicos);
  const minTotal = Math.min(...totals.filter((v) => v > 0));

  const props = { propostas, recId };

  return React.createElement(Document, null,
    React.createElement(Page, { size: 'A4', orientation: 'landscape', style: styles.page },
      React.createElement(Text, { style: styles.title }, 'Mapa Comparativo de Propostas'),

      // Bank headers
      React.createElement(View, { style: styles.row },
        React.createElement(View, { style: styles.headerLabelCell }, React.createElement(Text, null, '')),
        ...propostas.map((p, i) =>
          React.createElement(View, {
            key: i,
            style: p.id === recId ? styles.recBankHeader : styles.bankHeader,
          }, React.createElement(Text, null, p.id === recId ? `★ ${p.bank_name}` : p.bank_name))
        )
      ),

      // Loan info
      React.createElement(SectionHeader, { label: 'Informação do Empréstimo' }),
      React.createElement(DataRow, { label: 'Montante', values: propostas.map((p) => fmtEur(p.loan_amount)), ...props }),
      React.createElement(DataRow, { label: 'Prazo', values: propostas.map((p) => p.term_months ? `${p.term_months} meses` : '—'), ...props }),
      React.createElement(DataRow, { label: 'Tipo de taxa', values: propostas.map((p) => p.rate_type ? (RATE_TYPE_LABELS[p.rate_type] ?? p.rate_type) : '—'), ...props }),
      React.createElement(DataRow, { label: 'Euribor', values: propostas.map((p) => p.euribor_index ? (EURIBOR_LABELS[p.euribor_index] ?? p.euribor_index) : '—'), ...props }),
      React.createElement(DataRow, { label: 'Spread', values: propostas.map((p) => fmtPct(p.spread)), ...props }),
      React.createElement(DataRow, { label: 'TAN', values: propostas.map((p) => fmtPct(p.tan)), ...props }),
      React.createElement(DataRow, { label: 'TAEG', values: propostas.map((p) => fmtPct(p.taeg)), ...props }),

      // Monthly banco
      React.createElement(SectionHeader, { label: 'Prestação Mensal — Seguro Banco' }),
      React.createElement(DataRow, { label: 'Prestação', values: propostas.map((p) => fmtEur(p.monthly_payment)), ...props }),
      React.createElement(DataRow, { label: 'Vida (banco)', values: propostas.map((p) => fmtEur(p.vida_banco)), ...props }),
      React.createElement(DataRow, { label: 'Multirriscos (banco)', values: propostas.map((p) => fmtEur(p.multiriscos_banco)), ...props }),
      React.createElement(TotalRow, {
        label: 'Total mensal (banco)',
        values: propostas.map((p) => fmtEur(calcSubtotalBanco(p))),
        highlights: propostas.map((p) => calcSubtotalBanco(p) === minSubBanco && minSubBanco > 0),
        ...props,
      }),

      // Monthly externa
      React.createElement(SectionHeader, { label: 'Prestação Mensal — Seguro Externo' }),
      React.createElement(DataRow, { label: 'Prestação', values: propostas.map((p) => fmtEur(p.monthly_payment)), ...props }),
      React.createElement(DataRow, { label: 'Vida (externo)', values: propostas.map((p) => fmtEur(p.vida_externa)), ...props }),
      React.createElement(DataRow, { label: 'Multirriscos (externo)', values: propostas.map((p) => fmtEur(p.multiriscos_externa)), ...props }),
      React.createElement(TotalRow, {
        label: 'Total mensal (externo)',
        values: propostas.map((p) => fmtEur(calcSubtotalExterno(p))),
        highlights: propostas.map((p) => calcSubtotalExterno(p) === minSubExt && minSubExt > 0),
        ...props,
      }),

      // One-time charges
      React.createElement(SectionHeader, { label: 'Encargos Únicos' }),
      ...ONE_TIME_CHARGE_FIELDS.map(({ key, label }) => {
        const vals = propostas.map((p) => p[key] as number | null);
        const min = Math.min(...vals.filter((v): v is number => v !== null && v > 0));
        return React.createElement(DataRow, {
          key,
          label,
          values: vals.map(fmtEur),
          highlights: vals.map((v) => typeof v === 'number' && v === min && min > 0),
          ...props,
        });
      }),
      React.createElement(TotalRow, {
        label: 'Total encargos únicos',
        values: totals.map(fmtEur),
        highlights: totals.map((v) => v === minTotal && minTotal > 0),
        ...props,
      }),

      // Monthly fee
      React.createElement(SectionHeader, { label: 'Encargos Mensais' }),
      React.createElement(DataRow, { label: 'Manutenção de conta', values: propostas.map((p) => fmtEur(p.manutencao_conta)), ...props }),
      React.createElement(DataRow, { label: 'Faturação', values: propostas.map((p) => p.manutencao_anual ? 'Anual' : 'Mensal'), ...props }),

      React.createElement(Text, { style: styles.footer }, `Gerado por FluxHome — ${new Date().toLocaleDateString('pt-PT')}`)
    )
  );
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = await createServiceClient();

  const { data: mapaRaw } = await serviceClient
    .from('mapa_comparativo' as 'propostas')
    .select('*')
    .eq('client_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle() as unknown as { data: { proposta_ids: string[]; recommended_proposta_id: string | null; title: string } | null };

  if (!mapaRaw) return NextResponse.json({ error: 'No mapa found' }, { status: 404 });

  let propostas: BankProposta[] = [];
  if (mapaRaw.proposta_ids?.length > 0) {
    const { data } = await serviceClient
      .from('bank_propostas' as 'propostas')
      .select('*')
      .in('id', mapaRaw.proposta_ids) as unknown as { data: BankProposta[] };
    const map = new Map((data ?? []).map((p) => [p.id, p]));
    propostas = mapaRaw.proposta_ids.map((pid) => map.get(pid)).filter(Boolean) as BankProposta[];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(
    React.createElement(MapaDocument, { propostas, recId: mapaRaw.recommended_proposta_id }) as any
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="mapa-comparativo.pdf"`,
    },
  });
}
