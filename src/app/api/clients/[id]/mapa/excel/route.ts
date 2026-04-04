import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import ExcelJS from 'exceljs';
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
    // preserve order from proposta_ids
    const map = new Map((data ?? []).map((p) => [p.id, p]));
    propostas = mapaRaw.proposta_ids.map((pid) => map.get(pid)).filter(Boolean) as BankProposta[];
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = 'FluxHome';
  const ws = wb.addWorksheet('Mapa Comparativo');

  const numBanks = propostas.length;
  const bankNames = propostas.map((p) => p.bank_name);
  const recId = mapaRaw.recommended_proposta_id;

  // ── Column widths ──────────────────────────────────────────────────────────
  ws.getColumn(1).width = 34;
  for (let i = 2; i <= numBanks + 1; i++) {
    ws.getColumn(i).width = 18;
  }

  // ── Styles ─────────────────────────────────────────────────────────────────
  const headerFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
  const sectionFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EEF7' } };
  const recFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F0FF' } };
  const greenFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4EDDA' } };
  const whiteFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
  const headerFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  const sectionFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: 'FF1E3A5F' }, size: 10 };
  const boldFont: Partial<ExcelJS.Font> = { bold: true, size: 10 };
  const normalFont: Partial<ExcelJS.Font> = { size: 10 };
  const centerAlign: Partial<ExcelJS.Alignment> = { horizontal: 'center', vertical: 'middle' };
  const leftAlign: Partial<ExcelJS.Alignment> = { horizontal: 'left', vertical: 'middle' };

  const thin: Partial<ExcelJS.Border> = { style: 'thin', color: { argb: 'FFCCCCCC' } };
  const allBorders = { top: thin, left: thin, bottom: thin, right: thin };

  function addSectionHeader(label: string) {
    const row = ws.addRow([label, ...Array(numBanks).fill('')]);
    row.height = 22;
    row.getCell(1).font = sectionFont;
    row.getCell(1).fill = sectionFill;
    row.getCell(1).alignment = leftAlign;
    for (let c = 1; c <= numBanks + 1; c++) {
      row.getCell(c).fill = sectionFill;
      row.getCell(c).border = allBorders;
    }
  }

  function addDataRow(label: string, values: (string | number | null)[], highlight?: boolean[]) {
    const row = ws.addRow([label, ...values]);
    row.height = 18;
    row.getCell(1).font = normalFont;
    row.getCell(1).alignment = leftAlign;
    row.getCell(1).fill = whiteFill;
    row.getCell(1).border = allBorders;
    for (let c = 0; c < numBanks; c++) {
      const cell = row.getCell(c + 2);
      cell.font = normalFont;
      cell.alignment = centerAlign;
      cell.border = allBorders;
      if (highlight?.[c]) {
        cell.fill = greenFill;
      } else if (propostas[c]?.id === recId) {
        cell.fill = recFill;
      } else {
        cell.fill = whiteFill;
      }
    }
  }

  function addTotalRow(label: string, values: (string | number | null)[]) {
    const row = ws.addRow([label, ...values]);
    row.height = 20;
    for (let c = 1; c <= numBanks + 1; c++) {
      const cell = row.getCell(c);
      cell.font = boldFont;
      cell.alignment = c === 1 ? leftAlign : centerAlign;
      cell.fill = sectionFill;
      cell.border = allBorders;
    }
  }

  // ── Title row ──────────────────────────────────────────────────────────────
  const titleRow = ws.addRow(['Mapa Comparativo de Propostas', ...Array(numBanks).fill('')]);
  ws.mergeCells(titleRow.number, 1, titleRow.number, numBanks + 1);
  titleRow.height = 30;
  titleRow.getCell(1).font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  titleRow.getCell(1).fill = headerFill;
  titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

  ws.addRow([]); // spacer

  // ── Bank name headers ──────────────────────────────────────────────────────
  const headerRow = ws.addRow(['', ...bankNames]);
  headerRow.height = 26;
  headerRow.getCell(1).fill = headerFill;
  for (let c = 0; c < numBanks; c++) {
    const cell = headerRow.getCell(c + 2);
    cell.font = headerFont;
    cell.fill = propostas[c].id === recId ? { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2D5BA3' } } : headerFill;
    cell.alignment = centerAlign;
    cell.border = allBorders;
    if (propostas[c].id === recId) {
      cell.value = `★ ${propostas[c].bank_name}`;
    }
  }

  // ── Loan info ──────────────────────────────────────────────────────────────
  addSectionHeader('Informação do Empréstimo');
  addDataRow('Montante', propostas.map((p) => fmtEur(p.loan_amount)));
  addDataRow('Prazo', propostas.map((p) => p.term_months ? `${p.term_months} meses` : '—'));
  addDataRow('Tipo de taxa', propostas.map((p) => p.rate_type ? RATE_TYPE_LABELS[p.rate_type] ?? p.rate_type : '—'));
  addDataRow('Euribor', propostas.map((p) => p.euribor_index ? EURIBOR_LABELS[p.euribor_index] ?? p.euribor_index : '—'));
  addDataRow('Spread', propostas.map((p) => fmtPct(p.spread)));
  addDataRow('TAN', propostas.map((p) => fmtPct(p.tan)));
  addDataRow('TAEG', propostas.map((p) => fmtPct(p.taeg)));

  // ── Monthly costs (banco) ──────────────────────────────────────────────────
  addSectionHeader('Prestação Mensal — Seguro Banco');
  const minSubBanco = Math.min(...propostas.map(calcSubtotalBanco).filter((v) => v > 0));
  addDataRow('Prestação', propostas.map((p) => fmtEur(p.monthly_payment)));
  addDataRow('Seguro de vida (banco)', propostas.map((p) => fmtEur(p.vida_banco)));
  addDataRow('Multirriscos (banco)', propostas.map((p) => fmtEur(p.multiriscos_banco)));
  addTotalRow(
    'Total mensal (banco)',
    propostas.map((p) => fmtEur(calcSubtotalBanco(p))),
  );
  // highlight lowest
  const bancoRow = ws.lastRow!;
  for (let c = 0; c < numBanks; c++) {
    if (calcSubtotalBanco(propostas[c]) === minSubBanco && minSubBanco > 0) {
      bancoRow.getCell(c + 2).fill = greenFill;
    }
  }

  // ── Monthly costs (externa) ────────────────────────────────────────────────
  addSectionHeader('Prestação Mensal — Seguro Externo');
  const minSubExt = Math.min(...propostas.map(calcSubtotalExterno).filter((v) => v > 0));
  addDataRow('Prestação', propostas.map((p) => fmtEur(p.monthly_payment)));
  addDataRow('Seguro de vida (externo)', propostas.map((p) => fmtEur(p.vida_externa)));
  addDataRow('Multirriscos (externo)', propostas.map((p) => fmtEur(p.multiriscos_externa)));
  addTotalRow(
    'Total mensal (externo)',
    propostas.map((p) => fmtEur(calcSubtotalExterno(p))),
  );
  const extRow = ws.lastRow!;
  for (let c = 0; c < numBanks; c++) {
    if (calcSubtotalExterno(propostas[c]) === minSubExt && minSubExt > 0) {
      extRow.getCell(c + 2).fill = greenFill;
    }
  }

  // ── One-time charges ───────────────────────────────────────────────────────
  addSectionHeader('Encargos Únicos');
  for (const { key, label } of ONE_TIME_CHARGE_FIELDS) {
    const vals = propostas.map((p) => p[key] as number | null);
    const min = Math.min(...vals.filter((v): v is number => v !== null && v > 0));
    const highlight = vals.map((v) => typeof v === 'number' && v === min && min > 0);
    addDataRow(label, vals.map(fmtEur), highlight);
  }
  const totals = propostas.map(calcTotalEncargosUnicos);
  const minTotal = Math.min(...totals.filter((v) => v > 0));
  addTotalRow('Total encargos únicos', totals.map(fmtEur));
  const totRow = ws.lastRow!;
  for (let c = 0; c < numBanks; c++) {
    if (totals[c] === minTotal && minTotal > 0) totRow.getCell(c + 2).fill = greenFill;
  }

  // ── Monthly account fee ────────────────────────────────────────────────────
  addSectionHeader('Encargos Mensais');
  addDataRow('Manutenção de conta', propostas.map((p) => fmtEur(p.manutencao_conta)));
  addDataRow('Faturação', propostas.map((p) => p.manutencao_anual ? 'Anual' : 'Mensal'));

  // ── Notes ──────────────────────────────────────────────────────────────────
  const hasNotes = propostas.some((p) => p.notes);
  if (hasNotes) {
    addSectionHeader('Notas');
    addDataRow('', propostas.map((p) => p.notes ?? ''));
  }

  // ── Generate buffer ────────────────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="mapa-comparativo.xlsx"`,
    },
  });
}
