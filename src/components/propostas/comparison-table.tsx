'use client';

import { Fragment, useState } from 'react';
import { Star, ChevronDown, ChevronRight, Check, Info, Pencil, CreditCard, FileText, BarChart3, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BankProposta } from '@/types/proposta';
import {
  ONE_TIME_CHARGE_FIELDS,
  calcTotalRecomendado,
  calcTotalEncargosUnicos,
  getRecomendadaLabel,
  fmtEur,
  fmtPct,
  RATE_TYPE_LABELS,
  EURIBOR_LABELS,
} from '@/types/proposta';

interface ComparisonTableProps {
  propostas: BankProposta[];
  recommendedId: string | null;
  hasP2?: boolean;
  /** Cells to highlight: key = `${rowKey}-${propostaId}`, value = CSS color class */
  highlightedCells?: Record<string, string>;
  mode?: 'broker' | 'client';
  /** Required in broker mode for edit links */
  clientId?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getLowest(vals: (number | null)[]): number | null {
  const nums = vals.filter((v): v is number => v !== null && v > 0);
  if (!nums.length) return null;
  return Math.min(...nums);
}

function fmtMticVal(v: number): string {
  if (v <= 0) return '—';
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace('.', ',')}M€`;
  if (v >= 1_000) return `${Math.round(v / 1_000)}k€`;
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);
}

function withEditLink(val: string | null | React.ReactNode, propostaId: string, clientId: string): React.ReactNode {
  return (
    <span className="relative group/ec inline-flex items-center justify-center w-full gap-1">
      <span>{val ?? '—'}</span>
      <a
        href={`/dashboard/clients/${clientId}/bank-propostas/${propostaId}/edit`}
        className="opacity-0 group-hover/ec:opacity-100 transition-opacity shrink-0"
        onClick={(e) => e.stopPropagation()}
        title="Editar proposta"
      >
        <Pencil className="h-2.5 w-2.5 text-slate-400 hover:text-blue-500" />
      </a>
    </span>
  );
}

// ─── Row components (DO NOT CHANGE) ──────────────────────────────────────────

interface DataRowProps {
  label: string;
  values: (string | null | React.ReactNode)[];
  propostas: BankProposta[];
  recommendedId: string | null;
  highlightedCells?: Record<string, string>;
  rowKey: string;
  isBold?: boolean;
  greenIndices?: number[];
}

function DataRow({ label, values, propostas, recommendedId, highlightedCells, rowKey, isBold, greenIndices = [] }: DataRowProps) {
  return (
    <tr className="hover:bg-gray-50/50">
      <td className={cn(
        'sticky left-0 z-10 px-3 py-1.5 text-xs border border-gray-200 bg-white w-[220px] min-w-[200px]',
        isBold ? 'font-semibold text-gray-800 bg-[#E8EEF7]' : 'text-gray-600'
      )}>
        {label}
      </td>
      {propostas.map((p, i) => {
        const cellKey = `${rowKey}-${p.id}`;
        const customClass = highlightedCells?.[cellKey];
        const isRec = p.id === recommendedId;
        const isGreen = greenIndices.includes(i);
        return (
          <td
            key={p.id}
            colSpan={2}
            className={cn(
              'px-3 py-1.5 text-xs text-center border border-gray-200 min-w-[150px]',
              isBold ? 'font-semibold' : '',
              isGreen ? 'bg-green-100 text-green-800' :
              customClass ?? (isRec ? 'bg-blue-50' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30')
            )}
          >
            {values[i] ?? '—'}
          </td>
        );
      })}
    </tr>
  );
}

interface TotalRowProps {
  label: string;
  values: string[];
  propostas: BankProposta[];
  recommendedId: string | null;
  greenIndices: number[];
  isPrimary?: boolean;
}

function TotalRow({ label, values, propostas, recommendedId, greenIndices, isPrimary }: TotalRowProps) {
  return (
    <tr>
      <td className={cn(
        'sticky left-0 z-10 px-3 py-2 text-xs font-bold border border-gray-200 w-[220px] min-w-[200px]',
        isPrimary ? 'text-white bg-[#1E3A5F]' : 'text-gray-800 bg-[#E8EEF7]'
      )}>
        {label}
      </td>
      {propostas.map((p, i) => (
        <td
          key={p.id}
          colSpan={2}
          className={cn(
            'px-3 py-2 text-xs font-bold text-center border border-gray-200 min-w-[150px]',
            isPrimary
              ? greenIndices.includes(i) ? 'bg-green-700 text-white' : p.id === recommendedId ? 'bg-[#2D5BA3] text-white' : 'bg-[#1E3A5F] text-white'
              : greenIndices.includes(i) ? 'bg-green-100 text-green-800' : p.id === recommendedId ? 'bg-blue-100' : 'bg-[#E8EEF7]'
          )}
        >
          {values[i]}
        </td>
      ))}
    </tr>
  );
}

function SegurosSubHeaderRow({ propostas }: { propostas: BankProposta[] }) {
  return (
    <tr>
      <td className="sticky left-0 z-10 px-3 py-1 bg-[#E8EEF7] border border-gray-200 w-[220px] min-w-[200px]" />
      {propostas.map((p) => (
        <Fragment key={p.id}>
          <td className="px-2 py-1 text-[10px] font-semibold text-gray-500 text-center border border-gray-200 bg-[#E8EEF7] min-w-[75px]">
            Banco
          </td>
          <td className="px-2 py-1 text-[10px] font-semibold text-gray-500 text-center border border-gray-200 bg-[#E8EEF7] min-w-[75px]">
            Ext.
          </td>
        </Fragment>
      ))}
    </tr>
  );
}

interface SegurosDataRowProps {
  label: string;
  propostas: BankProposta[];
  getBancoVal: (p: BankProposta) => number | null;
  getExtVal: (p: BankProposta) => number | null;
  getIsRecBanco: (p: BankProposta) => boolean;
}

function SegurosDataRow({ label, propostas, getBancoVal, getExtVal, getIsRecBanco }: SegurosDataRowProps) {
  return (
    <tr className="hover:bg-gray-50/50">
      <td className="sticky left-0 z-10 px-3 py-1.5 text-xs text-gray-600 border border-gray-200 bg-white w-[220px] min-w-[200px]">
        {label}
      </td>
      {propostas.map((p) => {
        const bancoVal = getBancoVal(p);
        const extVal = getExtVal(p);
        const isRecBanco = getIsRecBanco(p);
        const bancoExists = (bancoVal ?? 0) > 0;
        const extExists = (extVal ?? 0) > 0;
        return (
          <Fragment key={p.id}>
            <td className={cn(
              'px-2 py-1.5 text-xs text-center border border-gray-200 min-w-[75px]',
              isRecBanco && bancoExists ? 'bg-green-50 text-green-800' : 'bg-white text-gray-600'
            )}>
              <div className="flex items-center justify-center gap-0.5">
                {isRecBanco && bancoExists && <Check className="h-2.5 w-2.5 text-green-600 shrink-0" />}
                {bancoExists ? fmtEur(bancoVal) : '—'}
              </div>
            </td>
            <td className={cn(
              'px-2 py-1.5 text-xs text-center border border-gray-200 min-w-[75px]',
              !isRecBanco && extExists ? 'bg-green-50 text-green-800' : 'bg-white text-gray-600'
            )}>
              <div className="flex items-center justify-center gap-0.5">
                {!isRecBanco && extExists && <Check className="h-2.5 w-2.5 text-green-600 shrink-0" />}
                {extExists ? fmtEur(extVal) : '—'}
              </div>
            </td>
          </Fragment>
        );
      })}
    </tr>
  );
}

function RecomendadaTotalRow({ propostas, recommendedId, hasP2 }: { propostas: BankProposta[]; recommendedId: string | null; hasP2: boolean }) {
  const totals = propostas.map((p) => calcTotalRecomendado(p, hasP2));
  const minTotal = getLowest(totals);
  return (
    <tr>
      <td className="sticky left-0 z-10 px-3 py-2 text-xs font-bold border border-gray-200 w-[220px] min-w-[200px] text-white bg-[#1E3A5F]">
        PRESTAÇÃO TOTAL (recomendada)
      </td>
      {propostas.map((p, i) => {
        const total = totals[i] ?? 0;
        const isGreen = total > 0 && total === minTotal;
        const sublabel = getRecomendadaLabel(p, hasP2);
        return (
          <td
            key={p.id}
            colSpan={2}
            className={cn(
              'px-3 py-2 text-xs font-bold text-center border border-gray-200',
              isGreen ? 'bg-green-700 text-white' : p.id === recommendedId ? 'bg-[#2D5BA3] text-white' : 'bg-[#1E3A5F] text-white'
            )}
          >
            <div>{fmtEur(total)}</div>
            {sublabel && <div className="text-[9px] font-normal opacity-75 mt-0.5">{sublabel}</div>}
          </td>
        );
      })}
    </tr>
  );
}

// ─── New section layout components ───────────────────────────────────────────

interface NewSectionHeaderProps {
  title: string;
  subtitle: string;
  totalDataCols: number;
  bgColor?: string;
  collapsible?: boolean;
  collapsed?: boolean;
  onToggle?: () => void;
}

function NewSectionHeader({ title, subtitle, totalDataCols, bgColor = '#1E3A5F', collapsible, collapsed, onToggle }: NewSectionHeaderProps) {
  return (
    <tr onClick={collapsible ? onToggle : undefined} className={collapsible ? 'cursor-pointer select-none' : ''}>
      <td
        className="sticky left-0 z-10 px-3 py-2.5 text-sm font-semibold text-white border border-gray-200 w-[220px] min-w-[200px]"
        style={{ backgroundColor: bgColor }}
      >
        {title}
      </td>
      <td
        colSpan={totalDataCols}
        className="px-3 py-2.5 border border-gray-200"
        style={{ backgroundColor: bgColor }}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs text-white opacity-60">{subtitle}</span>
          {collapsible && (
            collapsed
              ? <ChevronRight className="h-3.5 w-3.5 text-white opacity-60 shrink-0" />
              : <ChevronDown className="h-3.5 w-3.5 text-white opacity-60 shrink-0" />
          )}
        </div>
      </td>
    </tr>
  );
}

function GapRow({ totalCols }: { totalCols: number }) {
  return (
    <tr aria-hidden="true">
      <td colSpan={totalCols} style={{ height: '12px', background: 'transparent', border: 'none', padding: 0 }} />
    </tr>
  );
}

function SubSectionLabel({ label, totalDataCols }: { label: string; totalDataCols: number }) {
  return (
    <tr>
      <td className="sticky left-0 z-10 pl-8 pr-3 py-1.5 text-xs font-medium text-slate-500 bg-[#f1f5f9] border border-gray-200 w-[220px] min-w-[200px]">
        {label}
      </td>
      <td colSpan={totalDataCols} className="bg-[#f1f5f9] border border-gray-200" />
    </tr>
  );
}

function ReferenceRow({ label, values, propostas, recommendedId }: { label: string; values: string[]; propostas: BankProposta[]; recommendedId: string | null }) {
  return (
    <tr>
      <td className="sticky left-0 z-10 px-3 py-1 text-xs italic text-slate-400 bg-slate-50 border border-gray-200 w-[220px] min-w-[200px]">
        {label}
      </td>
      {propostas.map((p, i) => (
        <td
          key={p.id}
          colSpan={2}
          className={cn(
            'px-3 py-1 text-xs italic text-slate-400 text-center border border-gray-200 min-w-[150px]',
            p.id === recommendedId ? 'bg-blue-50/50' : 'bg-slate-50'
          )}
        >
          {values[i] ?? '—'}
        </td>
      ))}
    </tr>
  );
}

// ─── Client portal summary badges ────────────────────────────────────────────

function SummaryBadges({ propostas, recommendedId, hasP2 }: { propostas: BankProposta[]; recommendedId: string | null; hasP2: boolean }) {
  const rec = propostas.find((p) => p.id === recommendedId);
  if (!rec) return null;

  const totalMensal = calcTotalRecomendado(rec, hasP2);
  const totalUnicos = calcTotalEncargosUnicos(rec);
  const mticVal = (rec.mtic && rec.mtic > 0)
    ? rec.mtic
    : (totalMensal > 0 && (rec.term_months ?? 0) > 0 ? totalMensal * rec.term_months! : 0);

  let validadeLabel: string | null = null;
  if (rec.validade_ate) {
    const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const [yr, mo, dy] = rec.validade_ate.split('-').map(Number);
    validadeLabel = `${dy} ${MONTHS[mo - 1]} ${yr}`;
  }

  const badges = [
    { Icon: CreditCard, label: 'Prestação recomendada', value: totalMensal > 0 ? `${fmtEur(totalMensal)}/mês` : null },
    { Icon: FileText,   label: 'Encargos de entrada',  value: totalUnicos > 0 ? fmtEur(totalUnicos) : null },
    { Icon: BarChart3,  label: 'Custo total estimado', value: mticVal > 0 ? fmtMticVal(mticVal) : null },
    { Icon: Calendar,   label: 'Válida até',            value: validadeLabel },
  ].filter((b): b is { Icon: typeof CreditCard; label: string; value: string } => b.value !== null);

  if (!badges.length) return null;

  return (
    <div className="flex flex-wrap gap-2 mb-3">
      {badges.map(({ Icon, label, value }) => (
        <div key={label} className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-3 py-1.5 text-xs shadow-sm">
          <Icon className="h-3.5 w-3.5 text-blue-500 shrink-0" />
          <span className="text-slate-500">{label}:</span>
          <span className="font-semibold text-slate-800">{value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ComparisonTable({ propostas, recommendedId, hasP2 = false, highlightedCells = {}, mode, clientId }: ComparisonTableProps) {
  const [encargosCollapsed, setEncargosCollapsed] = useState(true);

  if (!propostas.length) return null;

  const totalDataCols = propostas.length * 2;
  const totalCols = 1 + totalDataCols;
  const rowProps = { propostas, recommendedId, highlightedCells };

  // Wraps values with a subtle edit-link icon in broker mode
  const bv = (vals: (string | null | React.ReactNode)[]): (string | null | React.ReactNode)[] => {
    if (mode !== 'broker' || !clientId) return vals;
    return propostas.map((p, i) => withEditLink(vals[i], p.id, clientId));
  };

  // ── Section 1 ───────────────────────────────────────────────────────────
  const loanAmounts = propostas.map((p) => p.loan_amount);
  const minLoan = getLowest(loanAmounts);
  const loanGreenIdx = loanAmounts.map((v, i) => (v !== null && v === minLoan ? i : -1)).filter((i) => i >= 0);

  const allFixa = propostas.every((p) => p.rate_type === 'fixa');
  const hasAnyMistaOrFixa = propostas.some((p) => p.rate_type === 'mista' || p.rate_type === 'fixa');

  // ── Section 2 ───────────────────────────────────────────────────────────
  const prestacaoVals = propostas.map((p) => p.monthly_payment);
  const minPrestacao = getLowest(prestacaoVals);
  const prestacaoGreenIdx = prestacaoVals.map((v, i) => (v !== null && v === minPrestacao ? i : -1)).filter((i) => i >= 0);

  const hasExternalInsurance = propostas.some(
    (p) => (p.vida_p1_externa ?? 0) > 0 || (p.vida_p2_externa ?? 0) > 0 || (p.multiriscos_externa ?? 0) > 0
  );
  const totalBancoVals = propostas.map((p) =>
    (p.monthly_payment ?? 0) + (p.vida_p1_banco ?? 0) + (hasP2 ? (p.vida_p2_banco ?? 0) : 0) + (p.multiriscos_banco ?? 0) + (p.manutencao_conta ?? 0)
  );
  const totalExternoVals = propostas.map((p) =>
    (p.monthly_payment ?? 0) + (p.vida_p1_externa ?? 0) + (hasP2 ? (p.vida_p2_externa ?? 0) : 0) + (p.multiriscos_externa ?? 0) + (p.manutencao_conta ?? 0)
  );

  // ── Section 3 ───────────────────────────────────────────────────────────
  const totalUnicosVals = propostas.map(calcTotalEncargosUnicos);
  const minTotalUnicos = getLowest(totalUnicosVals);

  // ── Section 4 ───────────────────────────────────────────────────────────
  const mticVals = propostas.map((p) => {
    if (p.mtic && p.mtic > 0) return p.mtic;
    const prestacao = calcTotalRecomendado(p, hasP2);
    return prestacao > 0 && (p.term_months ?? 0) > 0 ? prestacao * p.term_months! : 0;
  });
  const allMticFromDb = propostas.every((p) => (p.mtic ?? 0) > 0);
  const minMtic = getLowest(mticVals);

  return (
    <div>
      {mode === 'client' && (
        <SummaryBadges propostas={propostas} recommendedId={recommendedId} hasP2={hasP2} />
      )}

      <div className="relative w-full overflow-x-auto overflow-y-visible rounded-lg border border-gray-200 shadow-sm">
        <table className="text-sm w-full" style={{ borderCollapse: 'separate', borderSpacing: 0, minWidth: `${220 + propostas.length * 150}px` }}>
          <thead>
            <tr>
              <th className="sticky left-0 top-16 z-30 px-3 py-3 text-left text-xs font-medium text-gray-500 bg-gray-50 border border-gray-200 w-[220px] min-w-[200px]">
                &nbsp;
              </th>
              {propostas.map((p) => (
                <th
                  key={p.id}
                  colSpan={2}
                  className={cn(
                    'sticky top-16 z-20 px-3 py-3 text-xs font-bold text-center border border-gray-200 min-w-[150px]',
                    p.id === recommendedId
                      ? 'bg-[#2D5BA3] text-white border-l-2 border-l-blue-400'
                      : 'bg-[#1E3A5F] text-white'
                  )}
                >
                  <div className="flex items-center justify-center gap-1">
                    {p.id === recommendedId && <Star className="h-3 w-3 fill-yellow-300 text-yellow-300" />}
                    {p.bank_name}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>

            {/* ══ SECTION 1 — O Empréstimo ══════════════════════════════════ */}
            <NewSectionHeader
              title="O Empréstimo"
              subtitle="Detalhes do crédito e condições da taxa"
              totalDataCols={totalDataCols}
            />
            <DataRow
              label="Montante"
              values={bv(propostas.map((p) => fmtEur(p.loan_amount)))}
              rowKey="loan_amount"
              greenIndices={loanGreenIdx}
              {...rowProps}
            />
            {propostas.some((p) => p.valor_avaliacao) && (
              <DataRow
                label="Valor de Avaliação"
                values={bv(propostas.map((p) => fmtEur(p.valor_avaliacao)))}
                rowKey="valor_avaliacao"
                {...rowProps}
              />
            )}
            <DataRow
              label="Prazo"
              values={bv(propostas.map((p) => p.term_months ? `${p.term_months} meses` : null))}
              rowKey="term_months"
              {...rowProps}
            />
            <DataRow
              label="Tipo de Taxa"
              values={bv(propostas.map((p) => p.rate_type ? (RATE_TYPE_LABELS[p.rate_type] ?? null) : null))}
              rowKey="rate_type"
              {...rowProps}
            />
            {hasAnyMistaOrFixa && (
              <DataRow
                label="Período Fixo"
                values={bv(propostas.map((p) =>
                  (p.rate_type === 'mista' || p.rate_type === 'fixa') && p.fixed_period_years
                    ? `${p.fixed_period_years} anos`
                    : '—'
                ))}
                rowKey="fixed_period_years"
                {...rowProps}
              />
            )}
            {propostas.some((p) => p.condicoes_pos_fixo) && (
              <DataRow
                label="Após período fixo"
                values={bv(propostas.map((p) => p.condicoes_pos_fixo ?? null))}
                rowKey="condicoes_pos_fixo"
                {...rowProps}
              />
            )}
            {!allFixa && (
              <DataRow
                label="Euribor"
                values={bv(propostas.map((p) => p.euribor_index ? (EURIBOR_LABELS[p.euribor_index] ?? null) : null))}
                rowKey="euribor_index"
                {...rowProps}
              />
            )}
            <DataRow
              label="Spread"
              values={bv(propostas.map((p) => fmtPct(p.spread)))}
              rowKey="spread"
              {...rowProps}
            />
            <DataRow
              label="TAN"
              values={bv(propostas.map((p) => fmtPct(p.tan)))}
              rowKey="tan"
              {...rowProps}
            />
            {propostas.some((p) => p.taeg) && (
              <DataRow
                label="TAEG"
                values={bv(propostas.map((p) => fmtPct(p.taeg)))}
                rowKey="taeg"
                {...rowProps}
              />
            )}
            {propostas.some((p) => p.validade_ate) && (
              <DataRow
                label="Válida até"
                values={propostas.map((p) => {
                  if (!p.validade_ate) return null;
                  const expiry = new Date(p.validade_ate);
                  const now = new Date();
                  const days = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                  const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
                  const [yr, mo, dy] = p.validade_ate.split('-').map(Number);
                  const formatted = `${dy} ${MONTHS[mo - 1]} ${yr}`;
                  if (days < 0) return <span key={p.id} className="text-red-600 font-medium">⚠ Expirada</span>;
                  if (days <= 14) return <span key={p.id} className="text-amber-600 font-medium">⚠ Expira em {days} dias</span>;
                  return <span key={p.id} className="text-slate-600">{formatted}</span>;
                })}
                rowKey="validade_ate"
                {...rowProps}
              />
            )}

            <GapRow totalCols={totalCols} />

            {/* ══ SECTION 2 — O Pagamento Mensal ═══════════════════════════ */}
            <NewSectionHeader
              title="O Pagamento Mensal"
              subtitle="O que sai da sua conta todos os meses"
              totalDataCols={totalDataCols}
            />
            <DataRow
              label="Prestação (capital + juros)"
              values={bv(propostas.map((p) => fmtEur(p.monthly_payment)))}
              rowKey="monthly_payment"
              greenIndices={prestacaoGreenIdx}
              {...rowProps}
            />
            <SubSectionLabel label="Seguros" totalDataCols={totalDataCols} />
            <SegurosSubHeaderRow propostas={propostas} />
            <SegurosDataRow
              label="Seguro Vida — P1"
              propostas={propostas}
              getBancoVal={(p) => p.vida_p1_banco}
              getExtVal={(p) => p.vida_p1_externa}
              getIsRecBanco={(p) => (p.vida_p1_recomendada ?? 'externa') === 'banco'}
            />
            {hasP2 && (
              <SegurosDataRow
                label="Seguro Vida — P2"
                propostas={propostas}
                getBancoVal={(p) => p.vida_p2_banco}
                getExtVal={(p) => p.vida_p2_externa}
                getIsRecBanco={(p) => (p.vida_p2_recomendada ?? 'externa') === 'banco'}
              />
            )}
            <SegurosDataRow
              label="Seguro Multirriscos"
              propostas={propostas}
              getBancoVal={(p) => p.multiriscos_banco}
              getExtVal={(p) => p.multiriscos_externa}
              getIsRecBanco={(p) => (p.multiriscos_recomendada ?? 'banco') === 'banco'}
            />
            <SubSectionLabel label="Encargos mensais da conta" totalDataCols={totalDataCols} />
            <DataRow
              label="Manutenção de conta"
              values={bv(propostas.map((p) => fmtEur(p.manutencao_conta)))}
              rowKey="manutencao_conta"
              {...rowProps}
            />
            {propostas.some((p) => p.outras_comissoes_mensais) && (
              <DataRow
                label="Outras comissões mensais"
                values={bv(propostas.map((p) => fmtEur(p.outras_comissoes_mensais)))}
                rowKey="outras_comissoes_mensais"
                {...rowProps}
              />
            )}
            <RecomendadaTotalRow propostas={propostas} recommendedId={recommendedId} hasP2={hasP2} />
            {hasExternalInsurance && (
              <>
                <ReferenceRow
                  label="Total mensal (seguros banco)"
                  values={totalBancoVals.map((v) => v > 0 ? fmtEur(v) : '—')}
                  propostas={propostas}
                  recommendedId={recommendedId}
                />
                <ReferenceRow
                  label="Total mensal (seguros externos)"
                  values={totalExternoVals.map((v) => v > 0 ? fmtEur(v) : '—')}
                  propostas={propostas}
                  recommendedId={recommendedId}
                />
              </>
            )}

            <GapRow totalCols={totalCols} />

            {/* ══ SECTION 3 — O Custo de Entrada ═══════════════════════════ */}
            <NewSectionHeader
              title="O Custo de Entrada"
              subtitle="Valores a pagar uma única vez no momento da escritura"
              totalDataCols={totalDataCols}
              collapsible
              collapsed={encargosCollapsed}
              onToggle={() => setEncargosCollapsed((v) => !v)}
            />
            {!encargosCollapsed && ONE_TIME_CHARGE_FIELDS.map(({ key, label }) => {
              const vals = propostas.map((p) => p[key] as number | null);
              const min = getLowest(vals);
              const customHighlight: Record<string, string> = {};
              if (min !== null) {
                propostas.forEach((p, i) => {
                  if (vals[i] === min) customHighlight[`${key}-${p.id}`] = 'bg-green-100';
                });
              }
              return (
                <DataRow
                  key={key}
                  label={label}
                  values={bv(vals.map(fmtEur))}
                  rowKey={key}
                  propostas={propostas}
                  recommendedId={recommendedId}
                  highlightedCells={{ ...highlightedCells, ...customHighlight }}
                />
              );
            })}
            <TotalRow
              label="TOTAL ENCARGOS ÚNICOS"
              values={totalUnicosVals.map(fmtEur)}
              greenIndices={totalUnicosVals.map((v, i) => (v === minTotalUnicos && minTotalUnicos !== null ? i : -1)).filter((i) => i >= 0)}
              {...rowProps}
            />

            <GapRow totalCols={totalCols} />

            {/* ══ SECTION 4 — O Custo Total do Crédito ═════════════════════ */}
            <NewSectionHeader
              title="O Custo Total do Crédito"
              subtitle="O montante total estimado a pagar ao longo de todo o prazo"
              totalDataCols={totalDataCols}
              bgColor="#0F2037"
            />
            <tr>
              <td className="sticky left-0 z-10 px-3 py-2 text-sm font-bold text-gray-800 bg-white border border-gray-200 w-[220px] min-w-[200px]">
                <div className="flex items-center gap-1">
                  {allMticFromDb ? 'MTIC' : 'MTIC (estimado)'}
                  <span title="Montante Total Imputado ao Consumidor — valor total estimado a pagar incluindo capital, juros e seguros ao longo de todo o prazo.">
                    <Info className="h-3 w-3 text-blue-400 shrink-0" />
                  </span>
                </div>
              </td>
              {propostas.map((p, i) => {
                const v = mticVals[i] ?? 0;
                const isGreen = v > 0 && v === minMtic;
                return (
                  <td
                    key={p.id}
                    colSpan={2}
                    className={cn(
                      'px-3 py-2 text-sm font-bold text-center border border-gray-200 min-w-[150px]',
                      isGreen ? 'bg-green-100 text-green-800' : p.id === recommendedId ? 'bg-blue-50' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                    )}
                  >
                    {v > 0 ? fmtMticVal(v) : '—'}
                  </td>
                );
              })}
            </tr>
            <ReferenceRow
              label="Calculado com seguros recomendados"
              values={propostas.map((p) => p.term_months ? `prazo: ${p.term_months} meses` : '—')}
              propostas={propostas}
              recommendedId={recommendedId}
            />

            <GapRow totalCols={totalCols} />

            {/* ══ SECTION 5 — Condições do Produto ════════════════════════ */}
            {propostas.some((p) => p.condicoes_spread?.length) && (
              <>
                <NewSectionHeader
                  title="Condições do Produto"
                  subtitle="Requisitos do banco para beneficiar do spread proposto"
                  totalDataCols={totalDataCols}
                />
                <DataRow
                  label="Condições para o spread"
                  values={propostas.map((p) =>
                    p.condicoes_spread?.length
                      ? (
                        <span key={p.id} className="flex flex-wrap gap-0.5 justify-center">
                          {p.condicoes_spread.map((c) => (
                            <span key={c} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px]">{c}</span>
                          ))}
                        </span>
                      )
                      : null
                  )}
                  rowKey="condicoes_spread"
                  {...rowProps}
                />
              </>
            )}

          </tbody>
        </table>
      </div>
    </div>
  );
}
