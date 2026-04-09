'use client';

import { Fragment, useState } from 'react';
import { Star, ChevronDown, ChevronRight, Check } from 'lucide-react';
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
}

function getLowest(vals: (number | null)[]): number | null {
  const nums = vals.filter((v): v is number => v !== null && v > 0);
  if (!nums.length) return null;
  return Math.min(...nums);
}

interface SectionHeaderProps {
  label: string;
  totalDataCols: number;
  collapsible?: boolean;
  collapsed?: boolean;
  onToggle?: () => void;
}

function SectionHeader({ label, totalDataCols, collapsible, collapsed, onToggle }: SectionHeaderProps) {
  return (
    <tr>
      <td
        className={cn(
          'sticky left-0 z-10 px-3 py-1.5 text-xs font-semibold text-[#1E3A5F] bg-[#E8EEF7] border border-gray-200 w-[220px] min-w-[200px]',
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
      <td
        colSpan={totalDataCols}
        className={cn('bg-[#E8EEF7] border border-gray-200', collapsible && 'cursor-pointer select-none')}
        onClick={collapsible ? onToggle : undefined}
      />
    </tr>
  );
}

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

export function ComparisonTable({ propostas, recommendedId, hasP2 = false, highlightedCells = {} }: ComparisonTableProps) {
  const [encargosCollapsed, setEncargosCollapsed] = useState(true);

  if (!propostas.length) return null;

  const totalUnicosVals = propostas.map(calcTotalEncargosUnicos);
  const minTotalUnicos = getLowest(totalUnicosVals);

  const totalDataCols = propostas.length * 2;
  const rowProps = { propostas, recommendedId, highlightedCells };

  return (
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
          {/* ── Loan info ── */}
          <SectionHeader label="Informação do Empréstimo" totalDataCols={totalDataCols} />
          <DataRow label="Montante" values={propostas.map((p) => fmtEur(p.loan_amount))} rowKey="loan_amount" {...rowProps} />
          <DataRow label="Prazo" values={propostas.map((p) => p.term_months ? `${p.term_months} meses` : null)} rowKey="term_months" {...rowProps} />
          <DataRow label="Tipo de taxa" values={propostas.map((p) => p.rate_type ? (RATE_TYPE_LABELS[p.rate_type] ?? null) : null)} rowKey="rate_type" {...rowProps} />
          <DataRow label="Euribor" values={propostas.map((p) => p.euribor_index ? (EURIBOR_LABELS[p.euribor_index] ?? null) : null)} rowKey="euribor_index" {...rowProps} />
          <DataRow label="Spread" values={propostas.map((p) => fmtPct(p.spread))} rowKey="spread" {...rowProps} />
          <DataRow label="TAN" values={propostas.map((p) => fmtPct(p.tan))} rowKey="tan" {...rowProps} />
          <DataRow label="TAEG" values={propostas.map((p) => fmtPct(p.taeg))} rowKey="taeg" {...rowProps} />
          <DataRow label="Prestação base" values={propostas.map((p) => fmtEur(p.monthly_payment))} rowKey="monthly_payment" {...rowProps} />
          <DataRow label="Manutenção de conta" values={propostas.map((p) => fmtEur(p.manutencao_conta))} rowKey="manutencao_conta_info" {...rowProps} />
          {propostas.some((p) => p.outras_comissoes_mensais) && (
            <DataRow label="Outras comissões mensais" values={propostas.map((p) => fmtEur(p.outras_comissoes_mensais))} rowKey="outras_info" {...rowProps} />
          )}
          {propostas.some((p) => p.condicoes_spread?.length) && (
            <DataRow
              label="Condições para o spread"
              values={propostas.map((p) =>
                p.condicoes_spread?.length
                  ? <span key={p.id} className="flex flex-wrap gap-0.5 justify-center">
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
                const expiry = new Date(p.validade_ate);
                const now = new Date();
                const days = Math.ceil((expiry.getTime() - now.getTime()) / (1000*60*60*24));
                const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
                const [yr, mo, dy] = p.validade_ate.split('-').map(Number);
                const formatted = `${dy} ${MONTHS[mo-1]} ${yr}`;
                if (days < 0) return <span key={p.id} className="text-red-600 font-medium">⚠ Expirada</span>;
                if (days <= 14) return <span key={p.id} className="text-amber-600 font-medium">⚠ Expira em {days} dias</span>;
                return <span key={p.id} className="text-slate-600">{formatted}</span>;
              })}
              rowKey="validade_ate"
              {...rowProps}
            />
          )}

          {/* ── Seguros ── */}
          <SectionHeader label="Seguros" totalDataCols={totalDataCols} />
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
          <RecomendadaTotalRow propostas={propostas} recommendedId={recommendedId} hasP2={hasP2} />

          {/* ── One-time charges (collapsible) ── */}
          <SectionHeader
            label={`Encargos Únicos${encargosCollapsed ? ' (clique para expandir)' : ''}`}
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

          {/* ── Encargos Mensais ── */}
          <SectionHeader label="Encargos Mensais" totalDataCols={totalDataCols} />
          <DataRow label="Manutenção de conta" values={propostas.map((p) => fmtEur(p.manutencao_conta))} rowKey="manutencao_conta" {...rowProps} />
          <DataRow label="Faturação" values={propostas.map((p) => p.manutencao_anual ? 'Anual' : 'Mensal')} rowKey="manutencao_anual" {...rowProps} />
          {propostas.some((p) => p.outras_comissoes_mensais) && (
            <DataRow label="Outras comissões mensais" values={propostas.map((p) => fmtEur(p.outras_comissoes_mensais))} rowKey="outras_comissoes_mensais" {...rowProps} />
          )}
        </tbody>
      </table>
    </div>
  );
}
