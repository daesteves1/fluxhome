'use client';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LabelList,
  Cell,
} from 'recharts';
import type { BankProposta } from '@/types/proposta';

interface ChartProps {
  propostas: BankProposta[];
  recommendedId: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Monthly payment given monthly decimal rate, number of periods, principal. */
function pmt(rate: number, nper: number, pv: number): number {
  if (rate <= 0 || nper <= 0 || pv <= 0) return pv / Math.max(1, nper);
  return (rate * pv) / (1 - Math.pow(1 + rate, -nper));
}

function fmtEur(v: number): string {
  return v.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
}

function fmtEurDec(v: number): string {
  return v.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const BANK_COLORS = ['#1E40AF', '#7C3AED', '#0891B2', '#D97706', '#15803D', '#DC2626', '#BE185D', '#64748b'];
function bankColor(idx: number): string {
  return BANK_COLORS[idx % BANK_COLORS.length] ?? '#64748b';
}

// Short display name — trim long legal suffixes for chart axes
function shortName(name: string): string {
  return name.replace(/\s+(S\.A\.|SA|,? S\.A\.)$/i, '').trim();
}

// ─── Chart 1 — Prestação Mensal (Juros + Amortização) ────────────────────────

const AMORT_COLOR = '#3B82F6'; // blue-500
const JUROS_COLOR = '#F59E0B'; // amber-400

interface BarEntry {
  bank: string;
  amortizacao: number;
  juros: number;
  total: number;
  idx: number;
}

function buildBarData(propostas: BankProposta[]): BarEntry[] {
  return propostas
    .map((p, idx) => {
      const monthly = p.monthly_payment;
      const loan = p.loan_amount;
      const tan = p.tan; // percentage, e.g. 4.15 for 4.15%
      if (!monthly || !loan || !tan) return null;

      const jurosMensal = loan * (tan / 100) / 12;
      const amort = Math.max(0, monthly - jurosMensal);
      const juros = Math.max(0, Math.min(jurosMensal, monthly));

      return {
        bank: shortName(p.bank_name),
        amortizacao: Math.round(amort * 100) / 100,
        juros: Math.round(juros * 100) / 100,
        total: Math.round(monthly * 100) / 100,
        idx,
      };
    })
    .filter((x): x is BarEntry => x !== null);
}

function TotalLabel(props: { x?: number; y?: number; width?: number; value?: number }) {
  const { x = 0, y = 0, width = 0, value } = props;
  if (!value) return null;
  return (
    <text
      x={x + width / 2}
      y={y - 6}
      textAnchor="middle"
      fill="#374151"
      fontSize={11}
      fontWeight={600}
    >
      {fmtEur(value)}
    </text>
  );
}

function Chart1Tooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const total = (payload[0]?.value ?? 0) + (payload[1]?.value ?? 0);
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs min-w-[180px]">
      <p className="font-semibold text-gray-800 mb-2">{label}</p>
      {[...payload].reverse().map((entry) => (
        <div key={entry.name} className="flex justify-between gap-4 items-center mb-1">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: entry.color }} />
            {entry.name}
          </span>
          <span className="font-medium">{fmtEurDec(entry.value)}</span>
        </div>
      ))}
      <div className="mt-1.5 pt-1.5 border-t border-gray-100 flex justify-between font-semibold text-gray-700">
        <span>Total</span>
        <span>{fmtEurDec(total)}</span>
      </div>
    </div>
  );
}

function PrestacaoMensalChart({ propostas }: ChartProps) {
  const data = buildBarData(propostas);
  if (!data.length) return null;

  const hasMista = propostas.some((p) => p.rate_type === 'mista');
  const fixedYears = hasMista
    ? (propostas.find((p) => p.rate_type === 'mista')?.fixed_period_years ?? null)
    : null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <p className="text-sm font-bold text-gray-800">Prestação Mensal Estimada</p>
      <p className="text-xs text-gray-500 mt-0.5 mb-5">Distribuição entre juros e amortização de capital</p>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} barCategoryGap="35%" margin={{ top: 24, right: 8, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="bank"
            tick={{ fontSize: 11, fill: '#6B7280' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#9CA3AF' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `${Math.round(v)}€`}
            width={52}
          />
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <Tooltip content={(props: any) => <Chart1Tooltip {...props} />} cursor={{ fill: '#F9FAFB' }} />
          <Bar dataKey="amortizacao" name="Amortização" stackId="a" fill={AMORT_COLOR} radius={[0, 0, 3, 3]}>
            {data.map((entry) => (
              <Cell key={entry.bank} fill={AMORT_COLOR} fillOpacity={0.75 + entry.idx * 0} />
            ))}
          </Bar>
          <Bar dataKey="juros" name="Juros" stackId="a" fill={JUROS_COLOR} radius={[3, 3, 0, 0]}>
            {data.map((entry) => (
              <Cell key={entry.bank} fill={JUROS_COLOR} />
            ))}
            <LabelList
              dataKey="total"
              position="top"
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              content={(props: any) => <TotalLabel {...props} />}
            />
          </Bar>
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
            formatter={(value: string) => value === 'amortizacao' ? 'Amortização de Capital' : 'Juros'}
          />
        </BarChart>
      </ResponsiveContainer>

      {hasMista && fixedYears && (
        <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mt-3">
          Valores calculados para o período fixo inicial de {fixedYears} {fixedYears === 1 ? 'ano' : 'anos'}.
        </p>
      )}
    </div>
  );
}

// ─── Chart 2 — Sensibilidade à Euribor ───────────────────────────────────────

interface EuriborScenario {
  label: string;
  delta: number; // pp relative to euribor_atual
  rowClass: string;
  isCurrent: boolean;
}

function buildSensibilidadeTable(propostas: BankProposta[]) {
  // Find the reference Euribor from the first variavel/mista proposta
  const refProposta = propostas.find((p) => p.rate_type === 'variavel' || p.rate_type === 'mista');
  const refTan = refProposta?.tan ?? 0;        // percentage e.g. 4.15
  const refSpread = refProposta?.spread ?? 0;  // percentage e.g. 0.70
  const euriborAtual = refTan - refSpread;     // e.g. 3.45

  const scenarios: EuriborScenario[] = [
    { label: 'Euribor −1%', delta: -1, rowClass: 'bg-green-50', isCurrent: false },
    { label: `Euribor atual (${euriborAtual.toFixed(2)}%)`, delta: 0, rowClass: 'bg-white', isCurrent: true },
    { label: 'Euribor +1%', delta: 1, rowClass: 'bg-amber-50', isCurrent: false },
    { label: 'Euribor +2%', delta: 2, rowClass: 'bg-red-50', isCurrent: false },
  ];

  const rows = scenarios.map(({ label, delta, rowClass, isCurrent }) => {
    const cells = propostas.map((p) => {
      if (!p.loan_amount || !p.term_months) return null;

      if (p.rate_type === 'fixa') {
        return { value: p.monthly_payment ?? null, isFixed: true };
      }

      const spread = p.spread ?? 0;
      const tan = p.tan ?? 0;
      const euribor = tan - spread; // current euribor for this proposta
      const scenarioEuribor = Math.max(0, euribor + delta);
      const scenarioRate = (scenarioEuribor + spread) / 100 / 12;
      const payment = pmt(scenarioRate, p.term_months, p.loan_amount);
      return { value: Math.round(payment * 100) / 100, isFixed: false };
    });

    return { label, rowClass, isCurrent, cells };
  });

  return { rows, propostas };
}

function EuriborSensibilidadeTable({ propostas }: ChartProps) {
  const hasVariable = propostas.some((p) => p.rate_type === 'variavel' || p.rate_type === 'mista');
  if (!hasVariable) return null;

  const { rows } = buildSensibilidadeTable(propostas);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <p className="text-sm font-bold text-gray-800">Impacto de Variações da Euribor</p>
      <p className="text-xs text-gray-500 mt-0.5 mb-5">Como a sua prestação mensal muda consoante a evolução da Euribor</p>

      <div className="overflow-x-auto rounded-lg border border-gray-100">
        <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3 min-w-[160px]">Cenário</th>
              {propostas.map((p, i) => (
                <th key={p.id} className="text-center text-xs font-semibold text-gray-700 px-3 py-3 min-w-[110px]">
                  <span style={{ color: bankColor(i) }}>{shortName(p.bank_name)}</span>
                  {p.rate_type === 'fixa' && (
                    <span className="ml-1.5 inline-block text-[10px] bg-slate-100 text-slate-500 rounded px-1.5 py-0.5 font-normal">Taxa fixa</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ label, rowClass, isCurrent, cells }) => (
              <tr key={label} className={`${rowClass} border-b border-gray-50 last:border-0`}>
                <td className={`px-4 py-3 text-xs ${isCurrent ? 'font-semibold text-gray-800' : 'text-gray-600'}`}>
                  {label}
                </td>
                {cells.map((cell, ci) => (
                  <td key={ci} className={`px-3 py-3 text-center text-xs ${isCurrent ? 'font-semibold text-gray-800' : 'text-gray-700'}`}>
                    {cell?.value != null ? (
                      <span>
                        {fmtEurDec(cell.value)}
                        <span className="text-gray-400">/mês</span>
                      </span>
                    ) : '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-gray-400 mt-3">Valores estimados, sem seguros.</p>
    </div>
  );
}

// ─── Combined export ───────────────────────────────────────────────────────────

export function PropostasCharts({ propostas, recommendedId }: ChartProps) {
  if (!propostas.length) return null;
  return (
    <div className="space-y-4">
      <PrestacaoMensalChart propostas={propostas} recommendedId={recommendedId} />
      <EuriborSensibilidadeTable propostas={propostas} recommendedId={recommendedId} />
    </div>
  );
}

// Named sub-exports kept for any direct usages elsewhere
export { PrestacaoMensalChart as MonthlyTotalBarChart };
export { EuriborSensibilidadeTable as EuriborSensitivityChart };
