'use client';

import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
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

interface ComparisonTableProps {
  propostas: BankProposta[];
  recommendedId: string | null;
  /** Cells to highlight: key = `${rowKey}-${propostaId}`, value = CSS color class */
  highlightedCells?: Record<string, string>;
}

function getLowest(vals: (number | null)[]): number | null {
  const nums = vals.filter((v): v is number => v !== null && v > 0);
  if (!nums.length) return null;
  return Math.min(...nums);
}

interface SectionHeaderProps {
  label: string;
  colCount: number;
}

function SectionHeader({ label, colCount }: SectionHeaderProps) {
  return (
    <tr>
      <td
        colSpan={colCount + 1}
        className="px-3 py-1.5 text-xs font-semibold text-[#1E3A5F] bg-[#E8EEF7] border border-gray-200"
      >
        {label}
      </td>
    </tr>
  );
}

interface DataRowProps {
  label: string;
  values: (string | null)[];
  propostas: BankProposta[];
  recommendedId: string | null;
  highlightedCells?: Record<string, string>;
  rowKey: string;
  isBold?: boolean;
}

function DataRow({ label, values, propostas, recommendedId, highlightedCells, rowKey, isBold }: DataRowProps) {
  return (
    <tr className="hover:bg-gray-50/50">
      <td className={cn(
        'sticky left-0 z-10 px-3 py-1.5 text-xs border border-gray-200 bg-white min-w-[200px] max-w-[240px]',
        isBold ? 'font-semibold text-gray-800 bg-[#E8EEF7]' : 'text-gray-600'
      )}>
        {label}
      </td>
      {propostas.map((p, i) => {
        const cellKey = `${rowKey}-${p.id}`;
        const customClass = highlightedCells?.[cellKey];
        const isRec = p.id === recommendedId;
        return (
          <td
            key={p.id}
            className={cn(
              'px-3 py-1.5 text-xs text-center border border-gray-200 min-w-[120px]',
              isBold ? 'font-semibold' : '',
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
}

function TotalRow({ label, values, propostas, recommendedId, greenIndices }: TotalRowProps) {
  return (
    <tr>
      <td className="sticky left-0 z-10 px-3 py-2 text-xs font-bold text-gray-800 bg-[#E8EEF7] border border-gray-200 min-w-[200px]">
        {label}
      </td>
      {propostas.map((p, i) => (
        <td
          key={p.id}
          className={cn(
            'px-3 py-2 text-xs font-bold text-center border border-gray-200 min-w-[120px]',
            greenIndices.includes(i) ? 'bg-green-100 text-green-800' : p.id === recommendedId ? 'bg-blue-100' : 'bg-[#E8EEF7]'
          )}
        >
          {values[i]}
        </td>
      ))}
    </tr>
  );
}

export function ComparisonTable({ propostas, recommendedId, highlightedCells = {} }: ComparisonTableProps) {
  if (!propostas.length) return null;

  const subBancoVals = propostas.map(calcSubtotalBanco);
  const subExtVals = propostas.map(calcSubtotalExterno);
  const totalUnicosVals = propostas.map(calcTotalEncargosUnicos);

  const minSubBanco = getLowest(subBancoVals);
  const minSubExt = getLowest(subExtVals);
  const minTotalUnicos = getLowest(totalUnicosVals);

  const rowProps = { propostas, recommendedId, highlightedCells };

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
      <table className="border-collapse text-sm w-full">
        <thead>
          <tr>
            <th className="sticky left-0 z-20 px-3 py-3 text-left text-xs font-medium text-gray-500 bg-gray-50 border border-gray-200 min-w-[200px]">
              &nbsp;
            </th>
            {propostas.map((p) => (
              <th
                key={p.id}
                className={cn(
                  'px-3 py-3 text-xs font-bold text-center border border-gray-200 min-w-[120px]',
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
          {/* ── Loan info ── */}
          <SectionHeader label="Informação do Empréstimo" colCount={propostas.length} />
          <DataRow label="Montante" values={propostas.map((p) => fmtEur(p.loan_amount))} rowKey="loan_amount" {...rowProps} />
          <DataRow label="Prazo" values={propostas.map((p) => p.term_months ? `${p.term_months} meses` : null)} rowKey="term_months" {...rowProps} />
          <DataRow label="Tipo de taxa" values={propostas.map((p) => p.rate_type ? (RATE_TYPE_LABELS[p.rate_type] ?? null) : null)} rowKey="rate_type" {...rowProps} />
          <DataRow label="Euribor" values={propostas.map((p) => p.euribor_index ? (EURIBOR_LABELS[p.euribor_index] ?? null) : null)} rowKey="euribor_index" {...rowProps} />
          <DataRow label="Spread" values={propostas.map((p) => fmtPct(p.spread))} rowKey="spread" {...rowProps} />
          <DataRow label="TAN" values={propostas.map((p) => fmtPct(p.tan))} rowKey="tan" {...rowProps} />
          <DataRow label="TAEG" values={propostas.map((p) => fmtPct(p.taeg))} rowKey="taeg" {...rowProps} />

          {/* ── Monthly banco ── */}
          <SectionHeader label="Prestação Mensal — Seguro Banco" colCount={propostas.length} />
          <DataRow label="Prestação" values={propostas.map((p) => fmtEur(p.monthly_payment))} rowKey="monthly_payment_banco" {...rowProps} />
          <DataRow label="Seguro de vida (banco)" values={propostas.map((p) => fmtEur(p.vida_banco))} rowKey="vida_banco" {...rowProps} />
          <DataRow label="Multirriscos (banco)" values={propostas.map((p) => fmtEur(p.multiriscos_banco))} rowKey="multiriscos_banco" {...rowProps} />
          <TotalRow
            label="Total mensal (banco)"
            values={subBancoVals.map(fmtEur)}
            greenIndices={subBancoVals.map((v, i) => (v === minSubBanco && minSubBanco !== null ? i : -1)).filter((i) => i >= 0)}
            {...rowProps}
          />

          {/* ── Monthly externa ── */}
          <SectionHeader label="Prestação Mensal — Seguro Externo" colCount={propostas.length} />
          <DataRow label="Prestação" values={propostas.map((p) => fmtEur(p.monthly_payment))} rowKey="monthly_payment_ext" {...rowProps} />
          <DataRow label="Seguro de vida (externo)" values={propostas.map((p) => fmtEur(p.vida_externa))} rowKey="vida_externa" {...rowProps} />
          <DataRow label="Multirriscos (externo)" values={propostas.map((p) => fmtEur(p.multiriscos_externa))} rowKey="multiriscos_externa" {...rowProps} />
          <TotalRow
            label="Total mensal (externo)"
            values={subExtVals.map(fmtEur)}
            greenIndices={subExtVals.map((v, i) => (v === minSubExt && minSubExt !== null ? i : -1)).filter((i) => i >= 0)}
            {...rowProps}
          />

          {/* ── One-time charges ── */}
          <SectionHeader label="Encargos Únicos" colCount={propostas.length} />
          {ONE_TIME_CHARGE_FIELDS.map(({ key, label }) => {
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
                values={vals.map(fmtEur)}
                rowKey={key}
                propostas={propostas}
                recommendedId={recommendedId}
                highlightedCells={{ ...highlightedCells, ...customHighlight }}
              />
            );
          })}
          <TotalRow
            label="Total encargos únicos"
            values={totalUnicosVals.map(fmtEur)}
            greenIndices={totalUnicosVals.map((v, i) => (v === minTotalUnicos && minTotalUnicos !== null ? i : -1)).filter((i) => i >= 0)}
            {...rowProps}
          />

          {/* ── Monthly fee ── */}
          <SectionHeader label="Encargos Mensais" colCount={propostas.length} />
          <DataRow label="Manutenção de conta" values={propostas.map((p) => fmtEur(p.manutencao_conta))} rowKey="manutencao_conta" {...rowProps} />
          <DataRow label="Faturação" values={propostas.map((p) => p.manutencao_anual ? 'Anual' : 'Mensal')} rowKey="manutencao_anual" {...rowProps} />
        </tbody>
      </table>
    </div>
  );
}
