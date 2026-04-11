'use client';

import { Fragment, useState } from 'react';
import {
  Star, Check, Info, Pencil,
  ChevronDown, ChevronUp,
} from 'lucide-react';
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

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ComparisonTableProps {
  propostas: BankProposta[];
  recommendedId: string | null;
  hasP2?: boolean;
  /** Cells to highlight: kept for API compatibility, currently unused in card layout */
  highlightedCells?: Record<string, string>;
  mode?: 'broker' | 'client';
  /** Required in broker mode for edit links */
  clientId?: string;
}

// ─── Layout constants ─────────────────────────────────────────────────────────

const LABEL_W = 220;
const BANK_W  = 150;
const SUB_W   = 75; // each Banco | Ext. sub-column in the Seguros card = BANK_W / 2

// ─── Misc ─────────────────────────────────────────────────────────────────────

const PT_MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const TOOLTIPS: Record<string, string> = {
  'Montante de Financiamento':             'Valor total do empréstimo solicitado ao banco',
  'Prazo':                                 'Duração total do empréstimo em meses',
  'Tipo de Taxa':                          'Taxa fixa não muda. Taxa variável acompanha a Euribor. Mista começa fixa e depois passa a variável',
  'Período Fixo':                          'Número de anos em que a taxa se mantém fixa',
  'Euribor':                               'Índice de referência usado para calcular a taxa variável',
  'Spread':                                'Margem do banco adicionada à Euribor',
  'TAN':                                   'Taxa Anual Nominal — custo efetivo do empréstimo sem outros encargos',
  'TAEG':                                  'Taxa Anual Efetiva Global — custo total incluindo comissões e seguros',
  'Prestação base':                        'Valor mensal de capital e juros, sem seguros nem comissões',
  'Seguro Vida — P1':                      'Seguro obrigatório que cobre o capital em dívida em caso de morte ou invalidez',
  'Seguro Vida — P2':                      'Seguro obrigatório que cobre o capital em dívida em caso de morte ou invalidez',
  'Seguro Multirriscos':                   'Seguro obrigatório do imóvel contra incêndio e outros riscos',
  'Manutenção de conta':                   'Custo mensal da conta bancária exigida pelo banco',
  'Total Seguros (recomendado)':           'Soma dos seguros selecionados (vida + multirriscos)',
  'Condições para o spread':               'Produtos e serviços que o banco exige para manter o spread proposto',
  'Montante Total Imputado ao Consumidor': 'Valor total a pagar ao longo de todo o prazo, fornecido pelo banco na ficha oficial (FINE)',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getLowest(vals: (number | null)[]): number | null {
  const nums = vals.filter((v): v is number => v !== null && v > 0);
  return nums.length ? Math.min(...nums) : null;
}

function fmtMticVal(v: number): string {
  if (v <= 0) return '—';
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace('.', ',')}M€`;
  if (v >= 1_000) return `${Math.round(v / 1_000)}k€`;
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);
}

// ─── RowLabel with hover tooltip ────────────────────────────────────────────

function RowLabel({ label }: { label: string }) {
  const tip = TOOLTIPS[label];
  return (
    <span className="inline-flex items-center gap-1 group/lbl">
      {label}
      {tip && (
        <span title={tip} className="opacity-0 group-hover/lbl:opacity-100 transition-opacity cursor-help">
          <Info className="h-3 w-3 text-blue-400 shrink-0" />
        </span>
      )}
    </span>
  );
}

// ─── Shared colgroup (keeps all tables in sync) ───────────────────────────────

function TableColgroup({ propostas, hasSeguros = false }: { propostas: BankProposta[]; hasSeguros?: boolean }) {
  return (
    <colgroup>
      <col style={{ width: LABEL_W }} />
      {propostas.map((_, i) =>
        hasSeguros ? (
          <Fragment key={i}>
            <col style={{ width: SUB_W }} />
            <col style={{ width: SUB_W }} />
          </Fragment>
        ) : (
          <col key={i} style={{ width: BANK_W }} />
        )
      )}
    </colgroup>
  );
}

// ─── Sticky bank header ───────────────────────────────────────────────────────

function StickyBankHeader({
  propostas, recommendedId, mode, clientId,
}: {
  propostas: BankProposta[];
  recommendedId: string | null;
  mode?: 'broker' | 'client';
  clientId?: string;
}) {
  const hasValidate = propostas.some((p) => p.validade_ate);

  return (
    <div
      className="sticky top-16 z-30"
      style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px', marginBottom: '24px' }}
    >
      <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>
        <TableColgroup propostas={propostas} />
        <tbody>
          {/* Row 1 — bank names, rate type badge, recommended pill */}
          <tr>
            <td className="px-4 py-3 bg-slate-50 border-r border-slate-200" style={{ width: LABEL_W }} />
            {propostas.map((p) => {
              const isRec = p.id === recommendedId;
              return (
                <td
                  key={p.id}
                  className={cn(
                    'relative px-3 py-3 text-center border-r border-slate-200 group/bankCol',
                    isRec ? 'bg-blue-50' : 'bg-white'
                  )}
                >
                  <div className="flex flex-col items-center gap-1">
                    {isRec && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full font-medium">
                        <Star className="h-2.5 w-2.5 fill-blue-500 text-blue-500" />
                        Recomendado
                      </span>
                    )}
                    <span className={cn('text-sm font-bold', isRec ? 'text-blue-900' : 'text-slate-800')}>
                      {p.bank_name}
                    </span>
                    {p.rate_type && (
                      <span className={cn(
                        'text-[10px] px-2 py-0.5 rounded-full font-medium',
                        p.rate_type === 'variavel' ? 'bg-amber-100 text-amber-700' :
                        p.rate_type === 'fixa'     ? 'bg-blue-100 text-blue-700'   :
                                                     'bg-purple-100 text-purple-700'
                      )}>
                        {RATE_TYPE_LABELS[p.rate_type] ?? p.rate_type}
                      </span>
                    )}
                  </div>
                  {mode === 'broker' && clientId && (
                    <a
                      href={`/dashboard/clients/${clientId}/bank-propostas/${p.id}/edit`}
                      className="absolute top-2 right-2 opacity-0 group-hover/bankCol:opacity-100 transition-opacity"
                      title="Editar proposta"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Pencil className="h-3 w-3 text-slate-400 hover:text-blue-500" />
                    </a>
                  )}
                </td>
              );
            })}
          </tr>

          {/* Row 2 — Válida até */}
          {hasValidate && (
            <tr className="border-t border-slate-100">
              <td className="px-4 py-1.5 text-xs font-medium text-slate-500 bg-slate-50 border-r border-slate-100" style={{ width: LABEL_W }}>
                Válida até
              </td>
              {propostas.map((p) => {
                if (!p.validade_ate) {
                  return <td key={p.id} className="px-3 py-1.5 text-xs text-center text-slate-400 border-r border-slate-100">—</td>;
                }
                const expiry = new Date(p.validade_ate);
                const now = new Date();
                const days = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                const [yr, mo, dy2] = p.validade_ate.split('-').map(Number);
                const fmt = `${dy2} ${PT_MONTHS[mo - 1]} ${yr}`;
                const isExpired = days < 0;
                const isWarn = !isExpired && days <= 14;
                return (
                  <td
                    key={p.id}
                    className={cn(
                      'px-3 py-1.5 text-xs text-center border-r border-slate-100',
                      isExpired ? 'text-red-600 font-medium' : isWarn ? 'text-amber-600 font-medium' : 'text-slate-500'
                    )}
                  >
                    {isExpired ? '⚠ Expirada' : isWarn ? `⚠ ${fmt}` : fmt}
                  </td>
                );
              })}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── Section card wrapper ─────────────────────────────────────────────────────

function SectionCard({
  title, titleSlot, rightSlot, headerColor = '#1E3A5F', children, mode, propostas, hasSeguros = false,
}: {
  title: string;
  titleSlot?: React.ReactNode;
  rightSlot?: React.ReactNode;
  headerColor?: string;
  children: React.ReactNode;
  mode?: 'broker' | 'client';
  propostas: BankProposta[];
  hasSeguros?: boolean;
}) {
  const shadow = mode === 'client' ? '0 2px 8px rgba(0,0,0,0.08)' : '0 1px 3px rgba(0,0,0,0.06)';
  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden" style={{ boxShadow: shadow }}>
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{ backgroundColor: headerColor, borderRadius: '12px 12px 0 0' }}
      >
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-white">
          {title}
          {titleSlot}
        </span>
        {rightSlot}
      </div>
      <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>
        <TableColgroup propostas={propostas} hasSeguros={hasSeguros} />
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

// ─── CardRow — standard single-value-per-bank row ─────────────────────────────

function CardRow({
  label, values, propostas, recommendedId, greenIndices = [], isBold = false, compact = false,
}: {
  label: string;
  values: (string | null | React.ReactNode)[];
  propostas: BankProposta[];
  recommendedId: string | null;
  greenIndices?: number[];
  isBold?: boolean;
  compact?: boolean;
}) {
  const py = compact ? 'py-2' : 'py-2.5';
  return (
    <tr className="hover:bg-slate-50 transition-colors">
      <td
        className={cn(
          'sticky left-0 z-10 px-4 text-sm border-b border-slate-100 bg-white',
          py,
          isBold ? 'font-semibold text-slate-800' : 'font-medium text-slate-700'
        )}
      >
        <RowLabel label={label} />
      </td>
      {propostas.map((p, i) => {
        const isGreen = greenIndices.includes(i);
        const isRec = p.id === recommendedId;
        return (
          <td
            key={p.id}
            className={cn(
              'px-3 text-sm text-center border-b border-l border-slate-100',
              py,
              isBold ? 'font-semibold' : '',
              isGreen ? 'text-green-700' :
              isRec   ? 'bg-blue-50/30 text-slate-800' :
                        'text-slate-800'
            )}
          >
            {values[i] ?? '—'}
          </td>
        );
      })}
    </tr>
  );
}

// ─── SegurosSubHeaderRow (exact current implementation) ──────────────────────

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

// ─── SegurosDataRow (exact current implementation) ────────────────────────────

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

// ─── SegurosWideRow — single value spanning both sub-cols per bank ─────────────

function SegurosWideRow({
  label, values, propostas, recommendedId, greenIndices = [], isBold = false,
}: {
  label: string;
  values: (string | null)[];
  propostas: BankProposta[];
  recommendedId: string | null;
  greenIndices?: number[];
  isBold?: boolean;
}) {
  return (
    <tr className="hover:bg-slate-50 transition-colors">
      <td
        className={cn(
          'sticky left-0 z-10 px-3 py-1.5 text-xs border border-gray-200 w-[220px] min-w-[200px]',
          isBold ? 'font-semibold text-gray-800 bg-[#E8EEF7]' : 'text-gray-600 bg-white'
        )}
      >
        <RowLabel label={label} />
      </td>
      {propostas.map((p, i) => {
        const isGreen = greenIndices.includes(i);
        const isRec = p.id === recommendedId;
        return (
          <td
            key={p.id}
            colSpan={2}
            className={cn(
              'px-3 py-1.5 text-xs text-center border border-gray-200',
              isBold ? 'font-semibold' : '',
              isGreen ? 'bg-green-100 text-green-800' :
              isRec   ? 'bg-blue-50 text-slate-800' :
                        'bg-white text-slate-800'
            )}
          >
            {values[i] ?? '—'}
          </td>
        );
      })}
    </tr>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ComparisonTable({
  propostas, recommendedId, hasP2 = false, mode, clientId,
}: ComparisonTableProps) {
  const [encargosCollapsed, setEncargosCollapsed] = useState(true);

  if (!propostas.length) return null;

  const compact = mode === 'broker';
  const totalWidth = LABEL_W + propostas.length * BANK_W;

  // ── Card 1 ───────────────────────────────────────────────────────────────
  const loanAmounts = propostas.map((p) => p.loan_amount);
  const minLoan = getLowest(loanAmounts);
  const loanGreenIdx = loanAmounts.map((v, i) => v !== null && v === minLoan ? i : -1).filter((i) => i >= 0);

  const monthlyVals = propostas.map((p) => p.monthly_payment);
  const minMonthly = getLowest(monthlyVals);
  const monthlyGreenIdx = monthlyVals.map((v, i) => v !== null && v === minMonthly ? i : -1).filter((i) => i >= 0);

  const allFixa = propostas.every((p) => p.rate_type === 'fixa');
  const hasAnyMistaOrFixa = propostas.some((p) => p.rate_type === 'mista' || p.rate_type === 'fixa');

  // ── Card 2 ───────────────────────────────────────────────────────────────
  const totalSegurosVals = propostas.map((p) => {
    const vida1 = (p.vida_p1_recomendada ?? 'externa') === 'banco' ? (p.vida_p1_banco ?? 0) : (p.vida_p1_externa ?? 0);
    const vida2 = hasP2 ? ((p.vida_p2_recomendada ?? 'externa') === 'banco' ? (p.vida_p2_banco ?? 0) : (p.vida_p2_externa ?? 0)) : 0;
    const multi = (p.multiriscos_recomendada ?? 'banco') === 'banco' ? (p.multiriscos_banco ?? 0) : (p.multiriscos_externa ?? 0);
    return vida1 + vida2 + multi;
  });
  const minTotalSeguros = getLowest(totalSegurosVals);
  const totalSegurosGreenIdx = totalSegurosVals.map((v, i) => v > 0 && v === minTotalSeguros ? i : -1).filter((i) => i >= 0);

  // ── Card 3 ───────────────────────────────────────────────────────────────
  const prestacaoTotalVals = propostas.map((p) => calcTotalRecomendado(p, hasP2) + (p.manutencao_conta ?? 0));
  const minPrestacaoTotal = getLowest(prestacaoTotalVals);
  const prestacaoTotalGreenIdx = prestacaoTotalVals.map((v, i) => v > 0 && v === minPrestacaoTotal ? i : -1).filter((i) => i >= 0);

  // ── Card 4 ───────────────────────────────────────────────────────────────
  const totalUnicosVals = propostas.map(calcTotalEncargosUnicos);
  const minTotalUnicos = getLowest(totalUnicosVals);
  const totalUnicosGreenIdx = totalUnicosVals.map((v, i) => v > 0 && v === minTotalUnicos ? i : -1).filter((i) => i >= 0);

  // ── Card 5 ───────────────────────────────────────────────────────────────
  const mticVals = propostas.map((p) => (p.mtic && p.mtic > 0) ? p.mtic : null);
  const mticNums = mticVals.filter((v): v is number => v !== null);
  const minMtic = mticNums.length ? Math.min(...mticNums) : null;
  const mticGreenIdx = mticVals.map((v, i) => v !== null && v === minMtic ? i : -1).filter((i) => i >= 0);

  const hasCondicoes = propostas.some((p) => p.condicoes_spread?.length);

  const encargosToggle = (
    <button
      onClick={() => setEncargosCollapsed((v) => !v)}
      className="inline-flex items-center gap-1 text-xs text-white/70 hover:text-white transition-colors"
    >
      {encargosCollapsed
        ? <><ChevronDown className="h-3.5 w-3.5" /> Ver detalhe</>
        : <><ChevronUp   className="h-3.5 w-3.5" /> Fechar</>}
    </button>
  );

  return (
    <div>
      {/* Horizontal scroll wrapper; vertical sticky works via page scroll */}
      <div className="relative w-full overflow-x-auto overflow-y-visible">
        <div style={{ minWidth: totalWidth }}>

          {/* ── Sticky bank header ─────────────────────────────────────────── */}
          <StickyBankHeader
            propostas={propostas}
            recommendedId={recommendedId}
            mode={mode}
            clientId={clientId}
          />

          {/* ── Section cards ──────────────────────────────────────────────── */}
          <div className="space-y-4">

            {/* CARD 1 — Detalhes do Financiamento */}
            <SectionCard title="Detalhes do Financiamento" headerColor="#1E40AF" mode={mode} propostas={propostas}>
              <CardRow label="Montante de Financiamento" values={propostas.map((p) => fmtEur(p.loan_amount))} greenIndices={loanGreenIdx} compact={compact} propostas={propostas} recommendedId={recommendedId} />
              <CardRow label="Prazo" values={propostas.map((p) => p.term_months ? `${p.term_months} meses` : null)} compact={compact} propostas={propostas} recommendedId={recommendedId} />
              <CardRow label="Tipo de Taxa" values={propostas.map((p) => p.rate_type ? (RATE_TYPE_LABELS[p.rate_type] ?? null) : null)} compact={compact} propostas={propostas} recommendedId={recommendedId} />
              {hasAnyMistaOrFixa && (
                <CardRow
                  label="Período Fixo"
                  values={propostas.map((p) =>
                    (p.rate_type === 'mista' || p.rate_type === 'fixa') && p.fixed_period_years
                      ? `${p.fixed_period_years} anos` : '—'
                  )}
                  compact={compact} propostas={propostas} recommendedId={recommendedId}
                />
              )}
              {propostas.some((p) => p.condicoes_pos_fixo) && (
                <CardRow label="Após período fixo" values={propostas.map((p) => p.condicoes_pos_fixo ?? null)} compact={compact} propostas={propostas} recommendedId={recommendedId} />
              )}
              {!allFixa && (
                <CardRow label="Euribor" values={propostas.map((p) => p.euribor_index ? (EURIBOR_LABELS[p.euribor_index] ?? null) : null)} compact={compact} propostas={propostas} recommendedId={recommendedId} />
              )}
              <CardRow label="Spread" values={propostas.map((p) => fmtPct(p.spread))} compact={compact} propostas={propostas} recommendedId={recommendedId} />
              <CardRow label="TAN"    values={propostas.map((p) => fmtPct(p.tan))}    compact={compact} propostas={propostas} recommendedId={recommendedId} />
              {propostas.some((p) => p.taeg) && (
                <CardRow label="TAEG" values={propostas.map((p) => fmtPct(p.taeg))} compact={compact} propostas={propostas} recommendedId={recommendedId} />
              )}
              <CardRow label="Prestação base" values={propostas.map((p) => fmtEur(p.monthly_payment))} greenIndices={monthlyGreenIdx} isBold compact={compact} propostas={propostas} recommendedId={recommendedId} />
            </SectionCard>

            {/* CARD 2 — Seguros */}
            <SectionCard title="Seguros" mode={mode} propostas={propostas} hasSeguros>
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
              <SegurosWideRow
                label="Total Seguros (recomendado)"
                values={totalSegurosVals.map((v) => v > 0 ? fmtEur(v) : '—')}
                propostas={propostas}
                recommendedId={recommendedId}
                greenIndices={totalSegurosGreenIdx}
                isBold
              />
            </SectionCard>

            {/* CARD 2b — Encargos Mensais da Conta */}
            <SectionCard title="Encargos Mensais da Conta" mode={mode} propostas={propostas}>
              <CardRow
                label="Manutenção de conta"
                values={propostas.map((p) => fmtEur(p.manutencao_conta))}
                compact={compact}
                propostas={propostas}
                recommendedId={recommendedId}
              />
            </SectionCard>

            {/* CARD 3 — Prestação Total */}
            <SectionCard title="Prestação Total" mode={mode} propostas={propostas}>
              <tr>
                <td
                  className="sticky left-0 z-10 px-4 py-3 text-base font-bold text-white bg-slate-800"
                  style={{ width: LABEL_W, borderTop: '2px solid #e2e8f0' }}
                >
                  PRESTAÇÃO TOTAL
                </td>
                {propostas.map((p, i) => {
                  const val = prestacaoTotalVals[i] ?? 0;
                  const isGreen = prestacaoTotalGreenIdx.includes(i);
                  const isRec = p.id === recommendedId;
                  return (
                    <td
                      key={p.id}
                      className={cn(
                        'px-3 py-3 text-base font-bold text-center',
                        isGreen ? 'bg-green-600 text-white' :
                        isRec   ? 'bg-blue-600 text-white' :
                                  'bg-white text-slate-900'
                      )}
                      style={{ borderTop: '2px solid #e2e8f0', borderLeft: '1px solid #e2e8f0' }}
                    >
                      {val > 0 ? fmtEur(val) : '—'}
                    </td>
                  );
                })}
              </tr>
              <tr>
                <td className="sticky left-0 z-10 px-4 py-2 text-xs text-slate-400 bg-white" style={{ width: LABEL_W }}>
                  Prestação + seguros + conta
                </td>
                {propostas.map((p) => (
                  <td key={p.id} className="px-3 py-2 text-xs text-slate-400 text-center border-l border-slate-100 bg-white">
                    {getRecomendadaLabel(p, hasP2) || '—'}
                  </td>
                ))}
              </tr>
            </SectionCard>

            {/* CARD 4 — Encargos Únicos */}
            <SectionCard title="Encargos Únicos" titleSlot={encargosToggle} mode={mode} propostas={propostas}>
              {!encargosCollapsed && ONE_TIME_CHARGE_FIELDS.map(({ key, label }) => {
                const vals = propostas.map((p) => p[key] as number | null);
                if (!vals.some((v) => v !== null && v > 0)) return null;
                const min = getLowest(vals);
                const greenIdx = vals.map((v, i) => v !== null && v === min && min !== null ? i : -1).filter((i) => i >= 0);
                return (
                  <CardRow
                    key={key}
                    label={label}
                    values={vals.map(fmtEur)}
                    greenIndices={greenIdx}
                    compact={compact}
                    propostas={propostas}
                    recommendedId={recommendedId}
                  />
                );
              })}
              <tr className="hover:bg-slate-50">
                <td
                  className="sticky left-0 z-10 px-4 py-2.5 text-sm font-bold text-slate-800 bg-slate-50 border-t border-slate-200"
                  style={{ width: LABEL_W }}
                >
                  Total Encargos Únicos
                </td>
                {propostas.map((p, i) => {
                  const isGreen = totalUnicosGreenIdx.includes(i);
                  const isRec = p.id === recommendedId;
                  return (
                    <td
                      key={p.id}
                      className={cn(
                        'px-3 py-2.5 text-sm font-bold text-center border-t border-l border-slate-200 bg-slate-50',
                        isGreen ? 'text-green-700' : isRec ? 'bg-blue-50/40 text-slate-800' : 'text-slate-800'
                      )}
                    >
                      {totalUnicosVals[i] > 0 ? fmtEur(totalUnicosVals[i]) : '—'}
                    </td>
                  );
                })}
              </tr>
            </SectionCard>

            {/* CARD 5 — MTIC */}
            <SectionCard title="MTIC" mode={mode} propostas={propostas}>
              <tr className="hover:bg-slate-50">
                <td
                  className="sticky left-0 z-10 px-4 py-3 text-sm font-bold text-slate-800 bg-white border-b border-slate-100"
                  style={{ width: LABEL_W }}
                >
                  <RowLabel label="Montante Total Imputado ao Consumidor" />
                </td>
                {propostas.map((p, i) => {
                  const v = mticVals[i];
                  const isGreen = mticGreenIdx.includes(i);
                  const isRec = p.id === recommendedId;
                  return (
                    <td
                      key={p.id}
                      className={cn(
                        'px-3 py-3 text-sm font-bold text-center border-b border-l border-slate-100',
                        isGreen ? 'text-green-700' :
                        isRec   ? 'bg-blue-50/30 text-slate-800' :
                                  'text-slate-800'
                      )}
                    >
                      {v !== null && v > 0 ? fmtMticVal(v) : '—'}
                    </td>
                  );
                })}
              </tr>
              <tr>
                <td
                  colSpan={1 + propostas.length}
                  className="px-4 py-2 text-xs text-slate-400 text-center bg-slate-50/50"
                >
                  Valor fornecido pelo banco na Ficha de Informação Normalizada Europeia (FINE)
                </td>
              </tr>
            </SectionCard>

            {/* CARD 6 — Condições */}
            {hasCondicoes && (
              <SectionCard title="Condições" mode={mode} propostas={propostas}>
                <tr className="hover:bg-slate-50">
                  <td
                    className="sticky left-0 z-10 px-4 py-3 text-sm font-medium text-slate-700 bg-white border-b border-slate-100"
                    style={{ width: LABEL_W }}
                  >
                    <RowLabel label="Condições para o spread" />
                  </td>
                  {propostas.map((p) => (
                    <td
                      key={p.id}
                      className={cn(
                        'px-3 py-3 text-sm text-center border-b border-l border-slate-100',
                        p.id === recommendedId ? 'bg-blue-50/30' : ''
                      )}
                    >
                      {p.condicoes_spread?.length ? (
                        <div className="flex flex-col gap-1 items-center">
                          {p.condicoes_spread.map((c) => (
                            <span key={c} className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-sm w-full text-left">{c}</span>
                          ))}
                        </div>
                      ) : '—'}
                    </td>
                  ))}
                </tr>
              </SectionCard>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
