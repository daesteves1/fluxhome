import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import ExcelJS from 'exceljs';
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

function getLowestIdx(vals: (number | null)[]): Set<number> {
  const nums = vals.filter((v): v is number => v !== null && v > 0);
  if (!nums.length) return new Set();
  const min = Math.min(...nums);
  const result = new Set<number>();
  vals.forEach((v, i) => { if (v === min) result.add(i); });
  return result;
}

const PT_MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function fmtDate(d: Date) {
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' });
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = await createServiceClient();

  // ── Fetch mapa ─────────────────────────────────────────────────────────────
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

  const recId = mapaRaw.recommended_proposta_id;
  const numBanks = propostas.length;

  // ── Fetch supporting data ──────────────────────────────────────────────────
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

  // ── Workbook setup ─────────────────────────────────────────────────────────
  const wb = new ExcelJS.Workbook();
  wb.creator = 'FluxHome';
  const ws = wb.addWorksheet('Mapa Comparativo');

  // Column structure: col 1 = label, then 2 sub-cols per bank (banco + ext)
  const totalCols = 1 + 2 * numBanks;
  const bancoColOf  = (i: number) => 2 + 2 * i;
  const extColOf    = (i: number) => 3 + 2 * i;

  ws.getColumn(1).width = 35;
  for (let i = 0; i < numBanks; i++) {
    ws.getColumn(bancoColOf(i)).width = 13;
    ws.getColumn(extColOf(i)).width   = 13;
  }

  // ── Style helpers ──────────────────────────────────────────────────────────
  const navyFill:   ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
  const blueFill:   ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2D5BA3' } };
  const subhdrFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EEF7' } };
  const recFill:    ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
  const whiteFill:  ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
  const slateFill:  ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };

  const thin: Partial<ExcelJS.Border>  = { style: 'thin', color: { argb: 'FFE2E8F0' } };
  const allB = { top: thin, left: thin, bottom: thin, right: thin };

  const whtText  = { argb: 'FFFFFFFF' };
  const navText  = { argb: 'FF1E3A5F' };
  const mutText  = { argb: 'FF94A3B8' };
  const greenText = { argb: 'FF15803D' };

  const hdrFont:  Partial<ExcelJS.Font> = { bold: true, color: whtText,  size: 10 };
  const secFont:  Partial<ExcelJS.Font> = { bold: true, color: whtText,  size: 9  };
  const boldFont: Partial<ExcelJS.Font> = { bold: true, color: navText,  size: 9  };
  const normFont: Partial<ExcelJS.Font> = {             color: navText,  size: 9  };
  const mutFont:  Partial<ExcelJS.Font> = {             color: mutText,  size: 8  };
  const subFont:  Partial<ExcelJS.Font> = { bold: true, color: { argb: 'FF64748B' }, size: 8 };

  const cCenter: Partial<ExcelJS.Alignment> = { horizontal: 'center', vertical: 'middle', wrapText: true };
  const cLeft:   Partial<ExcelJS.Alignment> = { horizontal: 'left',   vertical: 'middle', wrapText: true };

  // ── Utility: merge cells for a single-value-per-bank row ──────────────────
  function styleDataCell(cell: ExcelJS.Cell, isGreen: boolean, isRec: boolean, isBold = false) {
    cell.font  = isBold ? boldFont : normFont;
    if (isGreen) {
      cell.font = { ...(isBold ? boldFont : normFont), color: greenText, bold: true };
    }
    cell.alignment = cCenter;
    cell.border    = allB;
    cell.fill      = isGreen ? whiteFill : isRec ? recFill : whiteFill;
  }

  function addSectionHeader(label: string) {
    const row = ws.addRow([label]);
    row.height = 20;
    ws.mergeCells(row.number, 1, row.number, totalCols);
    const cell = row.getCell(1);
    cell.font      = secFont;
    cell.fill      = navyFill;
    cell.alignment = cLeft;
    cell.border    = allB;
  }

  // Add a merged row (one value spanning both sub-cols per bank)
  function addMergedRow(
    label: string,
    values: (string | null)[],
    opts?: { bold?: boolean; highlights?: Set<number>; labelBold?: boolean; totalRow?: boolean }
  ) {
    const row = ws.addRow([label]);
    row.height = 18;
    const labelCell = row.getCell(1);
    labelCell.font      = opts?.labelBold ? boldFont : normFont;
    labelCell.alignment = cLeft;
    labelCell.fill      = opts?.totalRow ? slateFill : whiteFill;
    labelCell.border    = allB;

    for (let i = 0; i < numBanks; i++) {
      const col = bancoColOf(i);
      ws.mergeCells(row.number, col, row.number, extColOf(i));
      const cell = row.getCell(col);
      cell.value = values[i] ?? '—';
      const isGreen = opts?.highlights?.has(i) ?? false;
      const isRec   = propostas[i].id === recId;
      styleDataCell(cell, isGreen, isRec, opts?.bold);
      if (opts?.totalRow && !isGreen && !isRec) cell.fill = slateFill;
    }
  }

  // Add a seguros sub-col row (separate banco/ext values)
  function addSegurosRow(
    label: string,
    getBanco: (p: BankProposta) => number | null,
    getExt:   (p: BankProposta) => number | null,
    getIsRecBanco: (p: BankProposta) => boolean
  ) {
    const row = ws.addRow([label]);
    row.height = 18;
    const labelCell = row.getCell(1);
    labelCell.font      = normFont;
    labelCell.alignment = cLeft;
    labelCell.fill      = whiteFill;
    labelCell.border    = allB;

    for (let i = 0; i < numBanks; i++) {
      const p = propostas[i];
      const bancoVal = getBanco(p);
      const extVal   = getExt(p);
      const isRecBanco = getIsRecBanco(p);
      const bancoExists = (bancoVal ?? 0) > 0;
      const extExists   = (extVal   ?? 0) > 0;

      const bancoCell = row.getCell(bancoColOf(i));
      bancoCell.value     = bancoExists ? fmtEur(bancoVal) : '—';
      bancoCell.font      = isRecBanco && bancoExists ? { ...normFont, color: greenText, bold: true } : normFont;
      bancoCell.alignment = cCenter;
      bancoCell.fill      = isRecBanco && bancoExists ? { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECFDF5' } } : whiteFill;
      bancoCell.border    = allB;

      const extCell = row.getCell(extColOf(i));
      extCell.value     = extExists ? fmtEur(extVal) : '—';
      extCell.font      = !isRecBanco && extExists ? { ...normFont, color: greenText, bold: true } : normFont;
      extCell.alignment = cCenter;
      extCell.fill      = !isRecBanco && extExists ? { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECFDF5' } } : whiteFill;
      extCell.border    = allB;
    }
  }

  function addEmptyRow() {
    ws.addRow([]);
  }

  // ── Row 1: Title ───────────────────────────────────────────────────────────
  const titleRow = ws.addRow([`Mapa Comparativo${clientName ? ` — ${clientName}` : ''}`]);
  ws.mergeCells(titleRow.number, 1, titleRow.number, totalCols);
  titleRow.height = 28;
  const tCell = titleRow.getCell(1);
  tCell.font      = { bold: true, size: 14, color: whtText };
  tCell.fill      = navyFill;
  tCell.alignment = { horizontal: 'left', vertical: 'middle' };

  // ── Row 2: Subtitle ────────────────────────────────────────────────────────
  const subtitleParts = [];
  if (brokerName) subtitleParts.push(`Preparado por ${brokerName}`);
  subtitleParts.push(fmtDate(new Date()));
  const subtitleRow = ws.addRow([subtitleParts.join(' · ')]);
  ws.mergeCells(subtitleRow.number, 1, subtitleRow.number, totalCols);
  subtitleRow.height = 18;
  subtitleRow.getCell(1).font      = mutFont;
  subtitleRow.getCell(1).alignment = cLeft;

  // ── Row 3: Spacer ──────────────────────────────────────────────────────────
  addEmptyRow();

  // ── Row 4: Bank headers ────────────────────────────────────────────────────
  const bankHdrRow = ws.addRow(['']);
  bankHdrRow.height = 24;
  bankHdrRow.getCell(1).fill   = navyFill;
  bankHdrRow.getCell(1).border = allB;

  for (let i = 0; i < numBanks; i++) {
    const col = bancoColOf(i);
    ws.mergeCells(bankHdrRow.number, col, bankHdrRow.number, extColOf(i));
    const cell = bankHdrRow.getCell(col);
    const p = propostas[i];
    cell.value     = p.id === recId ? `★ ${p.bank_name}` : p.bank_name;
    cell.font      = hdrFont;
    cell.fill      = p.id === recId ? blueFill : navyFill;
    cell.alignment = cCenter;
    cell.border    = allB;
  }

  // ── Row 5: Válida até ──────────────────────────────────────────────────────
  if (propostas.some((p) => p.validade_ate)) {
    const validRow = ws.addRow(['Válida até']);
    validRow.height = 16;
    validRow.getCell(1).font      = subFont;
    validRow.getCell(1).fill      = subhdrFill;
    validRow.getCell(1).alignment = cLeft;
    validRow.getCell(1).border    = allB;

    for (let i = 0; i < numBanks; i++) {
      const p = propostas[i];
      const col = bancoColOf(i);
      ws.mergeCells(validRow.number, col, validRow.number, extColOf(i));
      const cell = validRow.getCell(col);
      if (p.validade_ate) {
        const expiry = new Date(p.validade_ate);
        const days = Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        const [yr, mo, dy] = p.validade_ate.split('-').map(Number);
        const fmt = `${dy} ${PT_MONTHS[mo - 1]} ${yr}`;
        cell.value     = days < 0 ? '⚠ Expirada' : days <= 14 ? `⚠ ${fmt}` : fmt;
        cell.font      = { ...subFont, color: days < 0 ? { argb: 'FFDC2626' } : days <= 14 ? { argb: 'FFD97706' } : { argb: 'FF64748B' } };
      } else {
        cell.value = '—';
        cell.font  = subFont;
      }
      cell.alignment = cCenter;
      cell.fill      = subhdrFill;
      cell.border    = allB;
    }
  }

  // ── Section 1: Informação do Empréstimo ────────────────────────────────────
  addSectionHeader('INFORMAÇÃO DO EMPRÉSTIMO');

  const allFixa = propostas.every((p) => p.rate_type === 'fixa');
  const hasAnyMistaOrFixa = propostas.some((p) => p.rate_type === 'mista' || p.rate_type === 'fixa');

  const loanVals  = propostas.map((p) => p.loan_amount);
  addMergedRow('Montante de Financiamento', propostas.map((p) => fmtEur(p.loan_amount)), { highlights: getLowestIdx(loanVals) });
  addMergedRow('Prazo', propostas.map((p) => p.term_months ? `${p.term_months} meses` : '—'));
  addMergedRow('Tipo de Taxa', propostas.map((p) => p.rate_type ? (RATE_TYPE_LABELS[p.rate_type] ?? p.rate_type) : '—'));

  if (hasAnyMistaOrFixa) {
    addMergedRow('Período Fixo', propostas.map((p) =>
      (p.rate_type === 'mista' || p.rate_type === 'fixa') && p.fixed_period_years
        ? `${p.fixed_period_years} anos` : '—'
    ));
  }
  if (propostas.some((p) => p.condicoes_pos_fixo)) {
    addMergedRow('Após período fixo', propostas.map((p) => p.condicoes_pos_fixo ?? '—'));
  }
  if (!allFixa) {
    addMergedRow('Euribor', propostas.map((p) => p.euribor_index ? (EURIBOR_LABELS[p.euribor_index] ?? p.euribor_index) : '—'));
  }
  addMergedRow('Spread', propostas.map((p) => fmtPct(p.spread)));
  addMergedRow('TAN',    propostas.map((p) => fmtPct(p.tan)));
  if (propostas.some((p) => p.taeg)) {
    addMergedRow('TAEG', propostas.map((p) => fmtPct(p.taeg)));
  }

  const monthlyVals = propostas.map((p) => p.monthly_payment);
  addMergedRow('Prestação base', propostas.map((p) => fmtEur(p.monthly_payment)), { bold: true, labelBold: true, highlights: getLowestIdx(monthlyVals) });

  // ── Section 2: Seguros ─────────────────────────────────────────────────────
  addEmptyRow();
  addSectionHeader('SEGUROS');

  // Sub-header row: Banco | Ext. per bank
  const subHdrRow = ws.addRow(['']);
  subHdrRow.height = 16;
  subHdrRow.getCell(1).fill   = subhdrFill;
  subHdrRow.getCell(1).border = allB;
  for (let i = 0; i < numBanks; i++) {
    const bc = subHdrRow.getCell(bancoColOf(i));
    bc.value     = 'Banco';
    bc.font      = subFont;
    bc.alignment = cCenter;
    bc.fill      = subhdrFill;
    bc.border    = allB;

    const ec = subHdrRow.getCell(extColOf(i));
    ec.value     = 'Ext.';
    ec.font      = subFont;
    ec.alignment = cCenter;
    ec.fill      = subhdrFill;
    ec.border    = allB;
  }

  addSegurosRow('Seguro Vida — P1', (p) => p.vida_p1_banco, (p) => p.vida_p1_externa, (p) => (p.vida_p1_recomendada ?? 'externa') === 'banco');
  if (hasP2) {
    addSegurosRow('Seguro Vida — P2', (p) => p.vida_p2_banco, (p) => p.vida_p2_externa, (p) => (p.vida_p2_recomendada ?? 'externa') === 'banco');
  }
  addSegurosRow('Seguro Multirriscos', (p) => p.multiriscos_banco, (p) => p.multiriscos_externa, (p) => (p.multiriscos_recomendada ?? 'banco') === 'banco');
  addMergedRow('Manutenção de conta', propostas.map((p) => fmtEur(p.manutencao_conta)));

  const segurosVals = propostas.map((p) => calcSegurosRecomendado(p, hasP2));
  addMergedRow('Total Seguros (recomendado)', segurosVals.map((v) => v > 0 ? fmtEur(v) : '—'), {
    bold: true, labelBold: true, highlights: getLowestIdx(segurosVals),
  });

  // ── Section 3: Prestação Total ─────────────────────────────────────────────
  addEmptyRow();
  addSectionHeader('PRESTAÇÃO TOTAL');

  const prestacaoTotalVals = propostas.map((p) => calcTotalRecomendado(p, hasP2) + (p.manutencao_conta ?? 0));
  const minPrestacao = prestacaoTotalVals.filter((v) => v > 0);
  const minPrestacaoVal = minPrestacao.length ? Math.min(...minPrestacao) : null;

  const ptRow = ws.addRow(['PRESTAÇÃO TOTAL']);
  ptRow.height = 22;
  ptRow.getCell(1).font      = { bold: true, size: 10, color: whtText };
  ptRow.getCell(1).fill      = navyFill;
  ptRow.getCell(1).alignment = cLeft;
  ptRow.getCell(1).border    = allB;

  for (let i = 0; i < numBanks; i++) {
    const col = bancoColOf(i);
    ws.mergeCells(ptRow.number, col, ptRow.number, extColOf(i));
    const cell  = ptRow.getCell(col);
    const val   = prestacaoTotalVals[i] ?? 0;
    const isMin = val > 0 && val === minPrestacaoVal;
    cell.value     = val > 0 ? fmtEur(val) : '—';
    cell.font      = { bold: true, size: 10, color: whtText };
    cell.alignment = cCenter;
    cell.border    = allB;
    cell.fill      = isMin
      ? { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF15803D' } }
      : propostas[i].id === recId
        ? blueFill
        : navyFill;
  }

  // ── Section 4: Encargos Únicos ─────────────────────────────────────────────
  addEmptyRow();
  addSectionHeader('ENCARGOS ÚNICOS');

  for (const { key, label } of ONE_TIME_CHARGE_FIELDS) {
    const vals = propostas.map((p) => p[key] as number | null);
    addMergedRow(label, vals.map(fmtEur), { highlights: getLowestIdx(vals) });
  }

  const totalUnicosVals = propostas.map(calcTotalEncargosUnicos);
  addMergedRow('Total Encargos Únicos', totalUnicosVals.map((v) => v > 0 ? fmtEur(v) : '—'), {
    bold: true, labelBold: true, highlights: getLowestIdx(totalUnicosVals), totalRow: true,
  });

  // ── Section 5: MTIC ────────────────────────────────────────────────────────
  addEmptyRow();
  addSectionHeader('MTIC');

  const mticVals = propostas.map((p) => (p.mtic && p.mtic > 0) ? p.mtic : null);
  addMergedRow('Montante Total Imputado ao Consumidor', mticVals.map((v) => v !== null ? fmtEur(v) : 'N/D'), {
    bold: true, highlights: getLowestIdx(mticVals),
  });

  const infoRow = ws.addRow(['Valor fornecido pelo banco na Ficha de Informação Normalizada Europeia (FINE)']);
  ws.mergeCells(infoRow.number, 1, infoRow.number, totalCols);
  infoRow.getCell(1).font      = mutFont;
  infoRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

  // ── Section 6: Condições ───────────────────────────────────────────────────
  if (propostas.some((p) => p.condicoes_spread?.length)) {
    addEmptyRow();
    addSectionHeader('CONDIÇÕES');
    addMergedRow(
      'Condições para o spread',
      propostas.map((p) => p.condicoes_spread?.length ? p.condicoes_spread.join(' · ') : '—')
    );
  }

  // ── Footer ─────────────────────────────────────────────────────────────────
  addEmptyRow();
  const footer1 = ws.addRow([`FluxHome${officeName ? ` — ${officeName}` : ''}`]);
  footer1.getCell(1).font      = mutFont;
  footer1.getCell(1).alignment = cLeft;

  const footer2 = ws.addRow([`Documento gerado em ${fmtDate(new Date())}`]);
  footer2.getCell(1).font      = mutFont;
  footer2.getCell(1).alignment = cLeft;

  // ── Generate ───────────────────────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="mapa-comparativo.xlsx"`,
    },
  });
}
