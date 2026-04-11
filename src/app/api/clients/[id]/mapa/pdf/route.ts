import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import React from 'react';
import { renderToBuffer, Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import type { DocumentProps } from '@react-pdf/renderer';
import type { BankProposta } from '@/types/proposta';
import {
  ONE_TIME_CHARGE_FIELDS,
  calcTotalRecomendado,
  calcTotalEncargosUnicos,
  fmtEur,
  fmtPct,
  RATE_TYPE_LABELS,
  EURIBOR_LABELS,
} from '@/types/proposta';

interface RouteParams { params: Promise<{ id: string }> }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcSegurosRecomendado(p: BankProposta, hasP2: boolean): number {
  const vida1 = (p.vida_p1_recomendada ?? 'externa') === 'banco' ? (p.vida_p1_banco ?? 0) : (p.vida_p1_externa ?? 0);
  const vida2 = hasP2 ? ((p.vida_p2_recomendada ?? 'externa') === 'banco' ? (p.vida_p2_banco ?? 0) : (p.vida_p2_externa ?? 0)) : 0;
  const multi = (p.multiriscos_recomendada ?? 'banco') === 'banco' ? (p.multiriscos_banco ?? 0) : (p.multiriscos_externa ?? 0);
  return vida1 + vida2 + multi;
}

function getLowest(vals: (number | null)[]): number | null {
  const nums = vals.filter((v): v is number => v !== null && v > 0);
  return nums.length ? Math.min(...nums) : null;
}

const PT_MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page:       { fontFamily: 'Helvetica', fontSize: 7.5, padding: 20, backgroundColor: '#FFFFFF' },
  header:     { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  titleBlock: { flex: 1 },
  title:      { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#1E3A5F', marginBottom: 2 },
  subtitle:   { fontSize: 8, color: '#94A3B8' },
  section:    { marginBottom: 8 },
  sectionHdr: { backgroundColor: '#1E3A5F', padding: '4 6', marginBottom: 0 },
  sectionTxt: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#FFFFFF' },
  row:        { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#E2E8F0', borderBottomStyle: 'solid' },
  labelCell:  { width: '28%', padding: '2.5 5', color: '#334155', fontFamily: 'Helvetica' },
  labelBold:  { width: '28%', padding: '2.5 5', color: '#1E293B', fontFamily: 'Helvetica-Bold' },
  dataCell:   { padding: '2.5 3', textAlign: 'center', flex: 1 },
  dataBold:   { padding: '2.5 3', textAlign: 'center', flex: 1, fontFamily: 'Helvetica-Bold' },
  totalRow:   { backgroundColor: '#F8FAFC' },
  greenText:  { color: '#15803D' },
  recCell:    { backgroundColor: '#EFF6FF' },
  bankHdr:    { backgroundColor: '#1E3A5F', color: '#FFFFFF', fontFamily: 'Helvetica-Bold', padding: '4 3', textAlign: 'center', flex: 1 },
  recBankHdr: { backgroundColor: '#2D5BA3', color: '#FFFFFF', fontFamily: 'Helvetica-Bold', padding: '4 3', textAlign: 'center', flex: 1 },
  bankHdrLabel: { width: '28%', backgroundColor: '#1E3A5F', padding: '4 5' },
  subHdr:     { backgroundColor: '#E8EEF7', padding: '2 3', textAlign: 'center', flex: 1, fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: '#64748B' },
  subHdrLabel: { width: '28%', backgroundColor: '#E8EEF7', padding: '2 5' },
  footer:     { position: 'absolute', bottom: 16, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between' },
  footerTxt:  { fontSize: 6.5, color: '#94A3B8' },
  infoText:   { fontSize: 6.5, color: '#94A3B8', textAlign: 'center', padding: '3 5', backgroundColor: '#F8FAFC' },
  prestTotal: { padding: '4 3', textAlign: 'center', flex: 1, fontFamily: 'Helvetica-Bold', fontSize: 9 },
  prestLabel: { width: '28%', padding: '4 5', color: '#FFFFFF', fontFamily: 'Helvetica-Bold', fontSize: 9, backgroundColor: '#1E3A5F' },
});

// ─── Sub-components ───────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Ce(type: React.ElementType, props: any, ...children: React.ReactNode[]): React.ReactElement {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return React.createElement(type as any, props, ...children);
}

function SectionHeader({ label }: { label: string }) {
  return Ce(View, { style: styles.sectionHdr },
    Ce(Text, { style: styles.sectionTxt }, label)
  );
}

function DataRow({
  label, values, propostas, recId, highlights, bold,
}: {
  label: string;
  values: string[];
  propostas: BankProposta[];
  recId: string | null;
  highlights?: Set<number>;
  bold?: boolean;
}) {
  return Ce(View, { style: styles.row },
    Ce(View, { style: bold ? styles.labelBold : styles.labelCell }, Ce(Text, null, label)),
    ...values.map((v, i) => {
      const isGreen = highlights?.has(i) ?? false;
      const isRec   = !isGreen && propostas[i]?.id === recId;
      const cellStyle = [bold ? styles.dataBold : styles.dataCell, isRec ? styles.recCell : {}];
      const textStyle = isGreen ? styles.greenText : {};
      return Ce(View, { key: i, style: cellStyle },
        Ce(Text, { style: textStyle }, v)
      );
    })
  );
}

function TotalRow({ label, values, propostas, recId, highlights }: {
  label: string; values: string[]; propostas: BankProposta[]; recId: string | null; highlights?: Set<number>;
}) {
  return Ce(View, { style: [styles.row, styles.totalRow] },
    Ce(View, { style: styles.labelBold }, Ce(Text, null, label)),
    ...values.map((v, i) => {
      const isGreen = highlights?.has(i) ?? false;
      const isRec   = !isGreen && propostas[i]?.id === recId;
      return Ce(View, { key: i, style: [styles.dataBold, isRec ? styles.recCell : {}] },
        Ce(Text, { style: isGreen ? styles.greenText : {} }, v)
      );
    })
  );
}

function SegurosSubRow({ propostas }: { propostas: BankProposta[] }) {
  return Ce(View, { style: styles.row },
    Ce(View, { style: styles.subHdrLabel }, Ce(Text, null, '')),
    ...propostas.flatMap((_, i) => [
      Ce(View, { key: `b${i}`, style: styles.subHdr }, Ce(Text, null, 'Banco')),
      Ce(View, { key: `e${i}`, style: styles.subHdr }, Ce(Text, null, 'Ext.')),
    ])
  );
}

function SegurosDataRow({
  label, propostas, getBanco, getExt, getIsRecBanco,
}: {
  label: string;
  propostas: BankProposta[];
  getBanco: (p: BankProposta) => number | null;
  getExt:   (p: BankProposta) => number | null;
  getIsRecBanco: (p: BankProposta) => boolean;
}) {
  return Ce(View, { style: styles.row },
    Ce(View, { style: styles.labelCell }, Ce(Text, null, label)),
    ...propostas.flatMap((p, i) => {
      const bancoVal = getBanco(p);
      const extVal   = getExt(p);
      const isRecBanco = getIsRecBanco(p);
      const bancoExists = (bancoVal ?? 0) > 0;
      const extExists   = (extVal   ?? 0) > 0;

      const bStyle = [styles.dataCell, isRecBanco && bancoExists ? { backgroundColor: '#ECFDF5' } : {}];
      const eStyle = [styles.dataCell, !isRecBanco && extExists  ? { backgroundColor: '#ECFDF5' } : {}];

      return [
        Ce(View, { key: `b${i}`, style: bStyle },
          Ce(Text, { style: isRecBanco && bancoExists ? styles.greenText : {} }, bancoExists ? fmtEur(bancoVal) : '—')
        ),
        Ce(View, { key: `e${i}`, style: eStyle },
          Ce(Text, { style: !isRecBanco && extExists ? styles.greenText : {} }, extExists ? fmtEur(extVal) : '—')
        ),
      ];
    })
  );
}

function SegurosWideRow({
  label, values, propostas, recId, highlights, bold,
}: {
  label: string; values: (string | null)[]; propostas: BankProposta[]; recId: string | null; highlights?: Set<number>; bold?: boolean;
}) {
  return Ce(View, { style: styles.row },
    Ce(View, { style: bold ? styles.labelBold : styles.labelCell }, Ce(Text, null, label)),
    ...propostas.flatMap((p, i) => {
      const isGreen = highlights?.has(i) ?? false;
      const isRec   = !isGreen && p.id === recId;
      // each bank spans 2 sub-cols visually — flex:2
      return [
        Ce(View, { key: `l${i}`, style: [bold ? styles.dataBold : styles.dataCell, isRec ? styles.recCell : {}, { flex: 2 }] },
          Ce(Text, { style: isGreen ? styles.greenText : {} }, values[i] ?? '—')
        ),
      ];
    })
  );
}

// ─── Main document ────────────────────────────────────────────────────────────

function MapaDocument({
  propostas, recId, hasP2, clientName, brokerName, officeName,
}: {
  propostas: BankProposta[];
  recId: string | null;
  hasP2: boolean;
  clientName: string;
  brokerName: string;
  officeName: string;
}) {
  const props = { propostas, recId };

  const allFixa = propostas.every((p) => p.rate_type === 'fixa');
  const hasAnyMistaOrFixa = propostas.some((p) => p.rate_type === 'mista' || p.rate_type === 'fixa');

  const loanVals        = propostas.map((p) => p.loan_amount);
  const monthlyVals     = propostas.map((p) => p.monthly_payment);
  const segurosVals     = propostas.map((p) => calcSegurosRecomendado(p, hasP2));
  const prestacaoTotVals = propostas.map((p) => calcTotalRecomendado(p, hasP2) + (p.manutencao_conta ?? 0));
  const totalUnicosVals = propostas.map(calcTotalEncargosUnicos);
  const mticVals        = propostas.map((p) => (p.mtic && p.mtic > 0) ? p.mtic : null);

  const minPrestacaoTot = getLowest(prestacaoTotVals);

  const today = new Date().toLocaleDateString('pt-PT');

  const doc = Ce(Document, {},
    Ce(Page, { size: 'A4', orientation: 'landscape', style: styles.page },

      // ── Header ──────────────────────────────────────────────────────────
      Ce(View, { style: styles.header },
        Ce(View, { style: styles.titleBlock },
          Ce(Text, { style: styles.title }, `Mapa Comparativo${clientName ? ` — ${clientName}` : ''}`),
          Ce(Text, { style: styles.subtitle }, [brokerName ? `Preparado por ${brokerName}` : null, today].filter(Boolean).join(' · '))
        )
      ),

      // ── Bank header ──────────────────────────────────────────────────────
      Ce(View, { style: styles.row },
        Ce(View, { style: styles.bankHdrLabel }, Ce(Text, null, '')),
        ...propostas.map((p, i) =>
          Ce(View, {
            key: i,
            style: p.id === recId ? styles.recBankHdr : styles.bankHdr,
          }, Ce(Text, null, p.id === recId ? `★ ${p.bank_name}` : p.bank_name))
        )
      ),

      // Válida até row
      propostas.some((p) => p.validade_ate) && Ce(View, { style: styles.row },
        Ce(View, { style: styles.subHdrLabel }, Ce(Text, { style: { fontSize: 6.5, color: '#64748B', fontFamily: 'Helvetica-Bold', padding: '2 5' } }, 'Válida até')),
        ...propostas.map((p, i) => {
          let text = '—';
          let color = '#64748B';
          if (p.validade_ate) {
            const days = Math.ceil((new Date(p.validade_ate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            const [yr, mo, dy] = p.validade_ate.split('-').map(Number);
            const fmt = `${dy} ${PT_MONTHS[mo - 1]} ${yr}`;
            text  = days < 0 ? '⚠ Expirada' : days <= 14 ? `⚠ ${fmt}` : fmt;
            color = days < 0 ? '#DC2626' : days <= 14 ? '#D97706' : '#64748B';
          }
          return Ce(View, { key: i, style: styles.subHdr }, Ce(Text, { style: { color } }, text));
        })
      ),

      // ── Section 1: Informação do Empréstimo ─────────────────────────────
      Ce(SectionHeader, { label: 'INFORMAÇÃO DO EMPRÉSTIMO' }),
      Ce(DataRow, { label: 'Montante de Financiamento', values: propostas.map((p) => fmtEur(p.loan_amount)), highlights: new Set(loanVals.map((v, i) => v !== null && v === getLowest(loanVals) ? i : -1).filter((i) => i >= 0)), ...props }),
      Ce(DataRow, { label: 'Prazo', values: propostas.map((p) => p.term_months ? `${p.term_months} meses` : '—'), ...props }),
      Ce(DataRow, { label: 'Tipo de Taxa', values: propostas.map((p) => p.rate_type ? (RATE_TYPE_LABELS[p.rate_type] ?? p.rate_type) : '—'), ...props }),
      hasAnyMistaOrFixa && Ce(DataRow, { label: 'Período Fixo', values: propostas.map((p) => (p.rate_type === 'mista' || p.rate_type === 'fixa') && p.fixed_period_years ? `${p.fixed_period_years} anos` : '—'), ...props }),
      !allFixa && Ce(DataRow, { label: 'Euribor', values: propostas.map((p) => p.euribor_index ? (EURIBOR_LABELS[p.euribor_index] ?? p.euribor_index) : '—'), ...props }),
      Ce(DataRow, { label: 'Spread', values: propostas.map((p) => fmtPct(p.spread)), ...props }),
      Ce(DataRow, { label: 'TAN',    values: propostas.map((p) => fmtPct(p.tan)),    ...props }),
      propostas.some((p) => p.taeg) && Ce(DataRow, { label: 'TAEG', values: propostas.map((p) => fmtPct(p.taeg)), ...props }),
      Ce(DataRow, { label: 'Prestação base', values: propostas.map((p) => fmtEur(p.monthly_payment)), bold: true, highlights: new Set(monthlyVals.map((v, i) => v !== null && v === getLowest(monthlyVals) ? i : -1).filter((i) => i >= 0)), ...props }),

      // ── Section 2: Seguros ───────────────────────────────────────────────
      Ce(SectionHeader, { label: 'SEGUROS' }),
      Ce(SegurosSubRow, { propostas }),
      Ce(SegurosDataRow, { label: 'Seguro Vida — P1', propostas, getBanco: (p: BankProposta) => p.vida_p1_banco, getExt: (p: BankProposta) => p.vida_p1_externa, getIsRecBanco: (p: BankProposta) => (p.vida_p1_recomendada ?? 'externa') === 'banco' }),
      hasP2 && Ce(SegurosDataRow, { label: 'Seguro Vida — P2', propostas, getBanco: (p: BankProposta) => p.vida_p2_banco, getExt: (p: BankProposta) => p.vida_p2_externa, getIsRecBanco: (p: BankProposta) => (p.vida_p2_recomendada ?? 'externa') === 'banco' }),
      Ce(SegurosDataRow, { label: 'Seguro Multirriscos', propostas, getBanco: (p: BankProposta) => p.multiriscos_banco, getExt: (p: BankProposta) => p.multiriscos_externa, getIsRecBanco: (p: BankProposta) => (p.multiriscos_recomendada ?? 'banco') === 'banco' }),
      Ce(SegurosWideRow, { label: 'Manutenção de conta', values: propostas.map((p) => fmtEur(p.manutencao_conta)), propostas, recId }),
      Ce(SegurosWideRow, { label: 'Total Seguros (recomendado)', values: segurosVals.map((v) => v > 0 ? fmtEur(v) : '—'), propostas, recId, bold: true, highlights: new Set(segurosVals.map((v, i) => v > 0 && v === getLowest(segurosVals) ? i : -1).filter((i) => i >= 0)) }),

      // ── Section 3: Prestação Total ───────────────────────────────────────
      Ce(SectionHeader, { label: 'PRESTAÇÃO TOTAL' }),
      Ce(View, { style: styles.row },
        Ce(View, { style: styles.prestLabel }, Ce(Text, null, 'PRESTAÇÃO TOTAL')),
        ...propostas.map((p, i) => {
          const val    = prestacaoTotVals[i] ?? 0;
          const isMin  = val > 0 && val === minPrestacaoTot;
          const isRec  = !isMin && p.id === recId;
          const bg     = isMin ? '#15803D' : isRec ? '#2D5BA3' : '#475569';
          return Ce(View, { key: i, style: [styles.prestTotal, { backgroundColor: bg, color: '#FFFFFF' }] },
            Ce(Text, null, val > 0 ? fmtEur(val) : '—')
          );
        })
      ),

      // ── Section 4: Encargos Únicos ───────────────────────────────────────
      Ce(SectionHeader, { label: 'ENCARGOS ÚNICOS' }),
      ...ONE_TIME_CHARGE_FIELDS.map(({ key, label }) => {
        const vals = propostas.map((p) => p[key] as number | null);
        return Ce(DataRow, { key, label, values: vals.map(fmtEur), highlights: new Set(vals.map((v, i) => v !== null && v === getLowest(vals) ? i : -1).filter((i) => i >= 0)), ...props });
      }),
      Ce(TotalRow, { label: 'Total Encargos Únicos', values: totalUnicosVals.map((v) => v > 0 ? fmtEur(v) : '—'), highlights: new Set(totalUnicosVals.map((v, i) => v > 0 && v === getLowest(totalUnicosVals) ? i : -1).filter((i) => i >= 0)), ...props }),

      // ── Section 5: MTIC ─────────────────────────────────────────────────
      Ce(SectionHeader, { label: 'MTIC' }),
      Ce(DataRow, { label: 'Montante Total Imputado ao Consumidor', bold: true, values: mticVals.map((v) => v !== null ? fmtEur(v) : 'N/D'), highlights: new Set(mticVals.map((v, i) => v !== null && v === getLowest(mticVals) ? i : -1).filter((i) => i >= 0)), ...props }),
      Ce(View, {}, Ce(Text, { style: styles.infoText }, 'Valor fornecido pelo banco na Ficha de Informação Normalizada Europeia (FINE)')),

      // ── Section 6: Condições ─────────────────────────────────────────────
      propostas.some((p) => p.condicoes_spread?.length) && Ce(View, {},
        Ce(SectionHeader, { label: 'CONDIÇÕES' }),
        Ce(DataRow, {
          label: 'Condições para o spread',
          values: propostas.map((p) => p.condicoes_spread?.length ? p.condicoes_spread.join(' · ') : '—'),
          ...props,
        })
      ),

      // ── Footer ───────────────────────────────────────────────────────────
      Ce(View, { style: styles.footer },
        Ce(Text, { style: styles.footerTxt }, `FluxHome${officeName ? ` — ${officeName}` : ''}`),
        Ce(Text, { style: styles.footerTxt }, `Documento gerado em ${today}`),
        Ce(Text, { style: styles.footerTxt, render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => `${pageNumber} / ${totalPages}` }, '')
      )
    )
  );

  return doc;
}

// ─── Route handler ────────────────────────────────────────────────────────────

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
    .maybeSingle() as unknown as { data: { proposta_ids: string[]; recommended_proposta_id: string | null } | null };

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

  const { data: clientRow } = await serviceClient
    .from('clients' as 'propostas')
    .select('p1_name, p2_name')
    .eq('id', id)
    .maybeSingle() as unknown as { data: { p1_name: string; p2_name: string | null } | null };

  const hasP2 = Boolean(clientRow?.p2_name);
  const clientName = clientRow ? (clientRow.p2_name ? `${clientRow.p1_name} & ${clientRow.p2_name}` : clientRow.p1_name) : '';

  const { data: userRow } = await serviceClient
    .from('users' as 'propostas')
    .select('name')
    .eq('id', user.id)
    .maybeSingle() as unknown as { data: { name: string } | null };
  const brokerName = userRow?.name ?? '';

  const { data: brokerRow } = await serviceClient
    .from('brokers' as 'propostas')
    .select('office_id')
    .eq('user_id' as never, user.id)
    .maybeSingle() as unknown as { data: { office_id: string | null } | null };

  let officeName = '';
  if (brokerRow?.office_id) {
    const { data: officeRow } = await serviceClient
      .from('offices' as 'propostas')
      .select('name')
      .eq('id', brokerRow.office_id)
      .maybeSingle() as unknown as { data: { name: string } | null };
    officeName = officeRow?.name ?? '';
  }

  const buffer = await renderToBuffer(
    React.createElement(MapaDocument, {
      propostas,
      recId: mapaRaw.recommended_proposta_id,
      hasP2,
      clientName,
      brokerName,
      officeName,
    }) as React.ReactElement<DocumentProps>
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="mapa-comparativo.pdf"`,
    },
  });
}
