'use client';

import { useState } from 'react';
import { Star, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BankProposta } from '@/types/proposta';
import {
  ONE_TIME_CHARGE_FIELDS,
  calcPrestacaoTotalBanco,
  calcPrestacaoTotalExterno,
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
  collapsible?: boolean;
  collapsed?: boolean;
  onToggle?: () => void;
}

function SectionHeader({ label, colCount, collapsible, collapsed, onToggle }: SectionHeaderProps) {
  return (
    <tr>
      <td
        colSpan={colCount + 1}
        className={cn(
          'px-3 py-1.5 text-xs font-semibold text-[#1E3A5F] bg-[#E8EEF7] border border-gray-200',
          collapsible && 'cursor-pointer select-none hover:bg-[#dce5f2]'
        )}
        onClick={collapsible ? onToggle : undefined}
      >
        <div className="flex items-center gap-1.5">
          {collapsible && (
            collapsed
              ? <ChevronRight className="h-3.5 w-3.5 shrink-0" />
              : <ChevronDown className="h-3.5 w-3.5 shrink-0" />
          )}
          {label}
        </div>
      </td>
    </tr>
  );
}

interface DataRowProps {
  rowNum?: number;
  label: string;
  values: (string | null | React.ReactNode)[];
  propostas: BankProposta[];
  recommendedId: string | null;
  highlightedCells?: Record<string, string>;
  rowKey: string;
  isBold?: boolean;
  greenIndices?: number[];
}

function DataRow({ rowNum, label, values, propostas, recommendedId, highlightedCells, rowKey, isBold, greenIndices = [] }: DataRowProps) {
  return (
    <tr className="hover:bg-gray-50/50">
      <td className={cn(
        'sticky left-0 z-10 px-3 py-1.5 text-xs border border-gray-200 bg-white w-[220px] min-w-[200px]',
        isBold ? 'font-semibold text-gray-800 bg-[#E8EEF7]' : 'text-gray-600'
      )}>
        <span className="flex items-center gap-2">
          {rowNum != null && (
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 text-gray-500 text-[10px] font-bold shrink-0">
              {rowNum}
            </span>
          )}
          {label}
        </span>
      </td>
      {propostas.map((p, i) => {
        const cellKey = `${rowKey}-${p.id}`;
        const customClass = highlightedCells?.[cellKey];
        const isRec = p.id === recommendedId;
        const isGreen = greenIndices.includes(i);
        return (
          <td
            key={p.id}
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

export function ComparisonTable({ propostas, recommendedId, highlightedCells = {} }: ComparisonTableProps) {
  const [encargosCollapsed, setEncargosCollapsed] = useState(true);

  if (!propostas.length) return null;

  const totalBancoVals = propostas.map(calcPrestacaoTotalBanco);
  const totalExtVals = propostas.map(calcPrestacaoTotalExterno);
  const totalUnicosVals = propostas.map(calcTotalEncargosUnicos);

  const minTotalBanco = getLowest(totalBancoVals);
  const minTotalExt = getLowest(totalExtVals);
  const minTotalUnicos = getLowest(totalUnicosVals);

  const rowProps = { propostas, recommendedId, highlightedCells };

  return (
    <div className="w-full overflow-x-auto rounded-lg border border-gray-200 shadow-sm -webkit-overflow-scrolling-touch">
      <table className="border-collapse text-sm w-full" style={{ minWidth: `${220 + propostas.length * 150}px` }}>
        <thead>
          <tr>
            <th className="sticky left-0 z-20 px-3 py-3 text-left text-xs font-medium text-gray-500 bg-gray-50 border border-gray-200 w-[220px] min-w-[200px]">
              &nbsp;
            </th>
            {propostas.map((p) => (
              <th
                key={p.id}
                className={cn(
                  'px-3 py-3 text-xs font-bold text-center border border-gray-200 min-w-[150px]',
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
          <DataRow rowNum={1} label="Montante" values={propostas.map((p) => fmtEur(p.loan_amount))} rowKey="loan_amount" {...rowProps} />
          <DataRow rowNum={2} label="Prazo" values={propostas.map((p) => p.term_months ? `${p.term_months} meses` : null)} rowKey="term_months" {...rowProps} />
          <DataRow rowNum={3} label="Tipo de taxa" values={propostas.map((p) => p.rate_type ? (RATE_TYPE_LABELS[p.rate_type] ?? null) : null)} rowKey="rate_type" {...rowProps} />
          <DataRow rowNum={4} label="Euribor" values={propostas.map((p) => p.euribor_index ? (EURIBOR_LABELS[p.euribor_index] ?? null) : null)} rowKey="euribor_index" {...rowProps} />
          <DataRow rowNum={5} label="Spread" values={propostas.map((p) => fmtPct(p.spread))} rowKey="spread" {...rowProps} />
          <DataRow rowNum={6} label="TAN" values={propostas.map((p) => fmtPct(p.tan))} rowKey="tan" {...rowProps} />
          <DataRow rowNum={7} label="TAEG" values={propostas.map((p) => fmtPct(p.taeg))} rowKey="taeg" {...rowProps} />
          {propostas.some((p) => p.condicoes_spread?.length) && (
            <DataRow
              label="Condições para o spread"
              values={propostas.map((p) =>
                p.condicoes_spread?.length
                  ? <span className="flex flex-wrap gap-0.5 justify-center">
                      {p.condicoes_spread.map((c) => (
                        <span key={c} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px]">{c}</span>
                      ))}
                    </span>
                  : null
              )}
              rowKey="condicoes_spread"
              {...rowProps}
            />
          )}
          {propostas.some((p) => p.validade_ate) && (
            <DataRow
              label="Válida até"
              values={propostas.map((p) => {
                if (!p.validade_ate) return null;
                const expired = new Date(p.validade_ate) < new Date();
                return <span className={expired ? 'text-red-600 font-medium' : undefined}>{p.validade_ate}</span>;
              })}
              rowKey="validade_ate"
              {...rowProps}
            />
          )}

          {/* ── Monthly banco ── */}
          <SectionHeader label="Prestação Mensal — Seguro Banco" colCount={propostas.length} />
          <DataRow rowNum={8} label="Prestação base" values={propostas.map((p) => fmtEur(p.monthly_payment))} rowKey="monthly_payment_banco" {...rowProps} />
          <DataRow label="Seguro de vida (banco)" values={propostas.map((p) => fmtEur(p.vida_banco))} rowKey="vida_banco" {...rowProps} />
          <DataRow label="Multirriscos (banco)" values={propostas.map((p) => fmtEur(p.multiriscos_banco))} rowKey="multiriscos_banco" {...rowProps} />
          <DataRow label="Manutenção de conta" values={propostas.map((p) => fmtEur(p.manutencao_conta))} rowKey="manutencao_conta_banco" {...rowProps} />
          {propostas.some((p) => p.outras_comissoes_mensais) && (
            <DataRow label="Outras comissões mensais" values={propostas.map((p) => fmtEur(p.outras_comissoes_mensais))} rowKey="outras_comissoes_banco" {...rowProps} />
          )}
          <TotalRow
            label="PRESTAÇÃO TOTAL (banco)"
            isPrimary
            values={totalBancoVals.map(fmtEur)}
            greenIndices={totalBancoVals.map((v, i) => (v === minTotalBanco && minTotalBanco !== null ? i : -1)).filter((i) => i >= 0)}
            {...rowProps}
          />

          {/* ── Monthly externa ── */}
          <SectionHeader label="Prestação Mensal — Seguro Externo" colCount={propostas.length} />
          <DataRow rowNum={9} label="Prestação base" values={propostas.map((p) => fmtEur(p.monthly_payment))} rowKey="monthly_payment_ext" {...rowProps} />
          <DataRow label="Seguro de vida (externo)" values={propostas.map((p) => fmtEur(p.vida_externa))} rowKey="vida_externa" {...rowProps} />
          <DataRow label="Multirriscos (externo)" values={propostas.map((p) => fmtEur(p.multiriscos_externa))} rowKey="multiriscos_externa" {...rowProps} />
          <DataRow label="Manutenção de conta" values={propostas.map((p) => fmtEur(p.manutencao_conta))} rowKey="manutencao_conta_ext" {...rowProps} />
          {propostas.some((p) => p.outras_comissoes_mensais) && (
            <DataRow label="Outras comissões mensais" values={propostas.map((p) => fmtEur(p.outras_comissoes_mensais))} rowKey="outras_comissoes_ext" {...rowProps} />
          )}
          <TotalRow
            label="PRESTAÇÃO TOTAL (externo)"
            isPrimary
            values={totalExtVals.map(fmtEur)}
            greenIndices={totalExtVals.map((v, i) => (v === minTotalExt && minTotalExt !== null ? i : -1)).filter((i) => i >= 0)}
            {...rowProps}
          />

          {/* ── One-time charges (collapsible) ── */}
          <SectionHeader
            label={`Encargos Únicos${encargosCollapsed ? ' (clique para expandir)' : ''}`}
            colCount={propostas.length}
            collapsible
            collapsed={encargosCollapsed}
            onToggle={() => setEncargosCollapsed((v) => !v)}
          />
          {!encargosCollapsed && ONE_TIME_CHARGE_FIELDS.map(({ key, label }, idx) => {
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
                rowNum={10 + Math.floor(idx / ONE_TIME_CHARGE_FIELDS.length)}
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

          {/* ── Monthly fee row (just manutenção — already shown above) ── */}
          <SectionHeader label="Encargos Mensais" colCount={propostas.length} />
          <DataRow rowNum={11} label="Manutenção de conta" values={propostas.map((p) => fmtEur(p.manutencao_conta))} rowKey="manutencao_conta" {...rowProps} />
          <DataRow label="Faturação" values={propostas.map((p) => p.manutencao_anual ? 'Anual' : 'Mensal')} rowKey="manutencao_anual" {...rowProps} />
          {propostas.some((p) => p.outras_comissoes_mensais) && (
            <DataRow rowNum={12} label="Outras comissões mensais" values={propostas.map((p) => fmtEur(p.outras_comissoes_mensais))} rowKey="outras_comissoes_mensais" {...rowProps} />
          )}
        </tbody>
      </table>
    </div>
  );
}
