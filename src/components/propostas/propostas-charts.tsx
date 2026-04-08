'use client';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line,
  CartesianGrid,
  Cell,
  LabelList,
  ReferenceArea,
  ReferenceLine,
} from 'recharts';
import type { TooltipContentProps } from 'recharts';
import type { BankProposta } from '@/types/proposta';
import { calcPrestacaoTotalBanco, calcPrestacaoTotalExterno, fmtEur } from '@/types/proposta';

interface ChartProps {
  propostas: BankProposta[];
  recommendedId: string | null;
}

// Bank color by name
const BANK_COLOR_MAP: Record<string, string> = {
  'CGD': '#1E40AF', 'Caixa Geral de Depósitos': '#1E40AF',
  'BPI': '#7C3AED',
  'Santander': '#DC2626',
  'Novo Banco': '#15803D',
  'Banco CTT': '#0891B2',
  'ActivoBank': '#D97706',
  'Millennium BCP': '#BE185D',
};
const FALLBACK_COLORS = ['#1E40AF', '#7C3AED', '#0891B2', '#D97706', '#15803D', '#DC2626', '#BE185D', '#64748b'];

function getBankColor(bankName: string, idx: number, isRec: boolean): string {
  if (isRec) return '#1E40AF';
  return BANK_COLOR_MAP[bankName] ?? FALLBACK_COLORS[idx % FALLBACK_COLORS.length] ?? '#64748b';
}

function fmtAbbrev(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M€`;
  if (v >= 1000) return `${Math.round(v / 1000)}k€`;
  return `${Math.round(v)}€`;
}

function pmt(principal: number, tanDecimal: number, months: number): number {
  const r = tanDecimal / 12;
  if (r <= 0 || months <= 0) return principal > 0 ? principal / Math.max(1, months) : 0;
  return (principal * r) / (1 - Math.pow(1 + r, -months));
}

// ─── Chart 1: Prestação Mensal Comparativa ────────────────────────────────────

function Chart1Tooltip(props: TooltipContentProps<number, string>) {
  const { active, payload, label } = props;
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as Record<string, number | string | boolean> | undefined;
  if (!d) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs min-w-[180px]">
      <p className="font-bold text-gray-800 mb-2">{label}</p>
      {payload.map((entry) => (
        <p key={String(entry.name)} className="flex justify-between gap-4" style={{ color: entry.color as string | undefined }}>
          <span>{entry.name}:</span>
          <span className="font-semibold">{fmtEur(entry.value as number)}</span>
        </p>
      ))}
      {typeof d._prestacao === 'number' && d._prestacao > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-100 space-y-0.5">
          {d._prestacao > 0 && <p className="flex justify-between text-gray-500"><span>Prestação base:</span><span>{fmtEur(d._prestacao as number)}</span></p>}
          {(d._vida_banco as number) > 0 && <p className="flex justify-between text-gray-500"><span>Seg. vida:</span><span>{fmtEur(d._vida_banco as number)}</span></p>}
          {(d._multiriscos_banco as number) > 0 && <p className="flex justify-between text-gray-500"><span>Multirriscos:</span><span>{fmtEur(d._multiriscos_banco as number)}</span></p>}
          {(d._manutencao as number) > 0 && <p className="flex justify-between text-gray-500"><span>Manutenção:</span><span>{fmtEur(d._manutencao as number)}</span></p>}
        </div>
      )}
    </div>
  );
}

export function MonthlyTotalBarChart({ propostas, recommendedId }: ChartProps) {
  const hasExternal = propostas.some((p) => (p.vida_externa ?? 0) > 0 || (p.multiriscos_externa ?? 0) > 0);

  const data = propostas.map((p, i) => {
    const banco = calcPrestacaoTotalBanco(p);
    const ext = calcPrestacaoTotalExterno(p);
    return {
      name: p.bank_name,
      'Com seguros banco': banco > 0 ? Math.round(banco * 100) / 100 : 0,
      'Com seguros externos': (hasExternal && ext > 0) ? Math.round(ext * 100) / 100 : undefined,
      _prestacao: p.monthly_payment ?? 0,
      _vida_banco: p.vida_banco ?? 0,
      _multiriscos_banco: p.multiriscos_banco ?? 0,
      _manutencao: (p.manutencao_conta ?? 0) + (p.outras_comissoes_mensais ?? 0),
      isRec: p.id === recommendedId,
      color: getBankColor(p.bank_name, i, p.id === recommendedId),
    };
  });

  const allVals = data.flatMap((d) => [d['Com seguros banco'], d['Com seguros externos']]).filter((v): v is number => typeof v === 'number' && v > 0);
  const yMin = allVals.length ? Math.floor(Math.min(...allVals) * 0.8) : 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <p className="text-sm font-bold text-gray-800">Prestação Mensal Total</p>
      <p className="text-xs text-gray-500 mt-0.5 mb-4">Valor mensal estimado a pagar incluindo seguros</p>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={data} barCategoryGap="30%" syncId={undefined}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
          <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={fmtAbbrev} domain={[yMin, 'auto']} />
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <Tooltip content={(p: any) => <Chart1Tooltip {...p} />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="Com seguros banco" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
            <LabelList dataKey="Com seguros banco" position="top" formatter={(v: unknown) => typeof v === 'number' ? `${Math.round(v)}€` : ''} style={{ fontSize: 10, fill: '#374151', fontWeight: 600 }} />
          </Bar>
          {hasExternal && (
            <Bar dataKey="Com seguros externos" radius={[4, 4, 0, 0]}>
              {data.map((_, i) => <Cell key={i} fill="#94a3b8" />)}
              <LabelList dataKey="Com seguros externos" position="top" formatter={(v: unknown) => typeof v === 'number' && v > 0 ? `${Math.round(v)}€` : ''} style={{ fontSize: 10, fill: '#64748b', fontWeight: 500 }} />
            </Bar>
          )}
        </BarChart>
      </ResponsiveContainer>
      <p className="text-[10px] text-gray-400 mt-1">* O eixo vertical não começa em zero para ampliar as diferenças</p>
    </div>
  );
}

// ─── Chart 2: Custo Total Estimado ────────────────────────────────────────────

export function TotalCostBarChart({ propostas, recommendedId }: ChartProps) {
  const withValues = propostas.map((p, i) => {
    const monthly = calcPrestacaoTotalBanco(p);
    const total = (p.term_months ?? 0) > 0 ? monthly * p.term_months! : 0;
    return { proposta: p, total, idx: i };
  }).filter((d) => d.total > 0);

  if (!withValues.length) return null;

  const minTotal = Math.min(...withValues.map((d) => d.total));
  const maxTotal = Math.max(...withValues.map((d) => d.total));

  const data = withValues.map(({ proposta, total, idx }) => {
    const isRec = proposta.id === recommendedId;
    let color = '#64748b';
    if (isRec) color = '#1E40AF';
    else if (total === minTotal) color = '#15803D';
    else if (total === maxTotal) color = '#DC2626';
    const years = proposta.term_months ? Math.round(proposta.term_months / 12) : '?';
    return {
      name: proposta.bank_name,
      total: Math.round(total),
      color,
      years,
      _monthly: Math.round(calcPrestacaoTotalBanco(proposta)),
      _idx: idx,
    };
  });

  const maxVal = Math.max(...data.map((d) => d.total));

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <p className="text-sm font-bold text-gray-800">Custo Total Estimado do Crédito</p>
      <p className="text-xs text-gray-500 mt-0.5 mb-4">Montante total a pagar ao longo de todo o prazo</p>
      <ResponsiveContainer width="100%" height={Math.max(180, data.length * 48 + 40)}>
        <BarChart data={data} layout="vertical" barCategoryGap="30%" syncId={undefined} margin={{ right: 70 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={fmtAbbrev} domain={[0, maxVal * 1.05]} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} width={100} />
          <Tooltip
            formatter={(v: unknown, _name: unknown, props: { payload?: { years: string | number; _monthly: number } }) => [
              fmtEur(typeof v === 'number' ? v : 0),
              `Ao longo de ${props.payload?.years ?? '?'} anos (${fmtEur(props.payload?._monthly ?? 0)}/mês)`
            ]}
          />
          <Bar dataKey="total" radius={[0, 4, 4, 0]}>
            {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
            <LabelList dataKey="total" position="right" formatter={(v: unknown) => typeof v === 'number' ? fmtAbbrev(v) : ''} style={{ fontSize: 11, fill: '#374151', fontWeight: 600 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="text-[10px] text-gray-400 mt-1">Valor indicativo. Inclui capital, juros e seguros ao longo de todo o prazo.</p>
    </div>
  );
}

// ─── Chart 3: Evolução do Capital em Dívida ───────────────────────────────────

export function CapitalEvolutionChart({ propostas, recommendedId }: ChartProps) {
  const valid = propostas.filter((p) => p.loan_amount && p.term_months && p.tan);
  if (!valid.length) return null;

  // Amortization — sample every 6 months
  const datasets = valid.map((p, i) => {
    const principal = p.loan_amount!;
    const months = p.term_months!;
    const tan = p.tan!; // stored as decimal e.g. 0.0415
    const r = tan / 12;
    const payment = pmt(principal, tan, months);
    const points: { year: number; [key: string]: number }[] = [];
    let balance = principal;
    points.push({ year: 0, [p.bank_name]: Math.round(principal) });
    for (let m = 1; m <= months; m++) {
      const interest = balance * r;
      balance = Math.max(0, balance - (payment - interest));
      if (m % 6 === 0 || m === months) {
        points.push({ year: parseFloat((m / 12).toFixed(1)), [p.bank_name]: Math.round(balance) });
      }
    }
    return { proposta: p, color: getBankColor(p.bank_name, i, p.id === recommendedId), points };
  });

  const allYears = Array.from(new Set(datasets.flatMap((d) => d.points.map((pt) => pt.year)))).sort((a, b) => a - b);
  const mergedData = allYears.map((year) => {
    const entry: Record<string, number> = { year };
    datasets.forEach((d) => {
      const pt = d.points.find((p) => p.year === year);
      if (pt) entry[d.proposta.bank_name] = pt[d.proposta.bank_name] as number;
    });
    return entry;
  });

  const refPropostaAmount = valid.find((p) => p.id === recommendedId)?.loan_amount ?? valid[0]?.loan_amount ?? 0;
  const halfCapital = Math.round(refPropostaAmount / 2);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <p className="text-sm font-bold text-gray-800">Capital em Dívida ao Longo do Tempo</p>
      <p className="text-xs text-gray-500 mt-0.5 mb-4">Quanto ainda deve ao banco em cada momento do prazo</p>
      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={mergedData} syncId={undefined}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v: number) => `Ano ${v}`} interval={4} />
          <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={fmtAbbrev} />
          <Tooltip formatter={(v) => fmtEur(v as number)} labelFormatter={(l) => `Ano ${l}`} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {halfCapital > 0 && (
            <ReferenceLine
              y={halfCapital}
              stroke="#94a3b8"
              strokeDasharray="4 3"
              label={{ value: 'Metade do capital em dívida', position: 'insideLeft', fontSize: 10, fill: '#94a3b8', offset: 6 }}
            />
          )}
          {datasets.map((d) => (
            <Line
              key={d.proposta.id}
              type="monotone"
              dataKey={d.proposta.bank_name}
              stroke={d.color}
              strokeWidth={d.proposta.id === recommendedId ? 3 : 1.5}
              dot={false}
              activeDot={{ r: 5, fill: d.color }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Chart 4: Impacto Euribor ─────────────────────────────────────────────────

const EURIBOR_SCENARIOS = [
  { label: '-2%', delta: -0.02 },
  { label: '-1%', delta: -0.01 },
  { label: 'Atual', delta: 0 },
  { label: '+1%', delta: 0.01 },
  { label: '+2%', delta: 0.02 },
  { label: '+3%', delta: 0.03 },
];

export function EuriborSensitivityChart({ propostas, recommendedId }: ChartProps) {
  const eligible = propostas.filter((p) => p.loan_amount && p.term_months && p.tan);
  const hasVariable = eligible.some((p) => p.rate_type === 'variavel' || p.rate_type === 'mista');
  if (!hasVariable) return null;

  const data = EURIBOR_SCENARIOS.map(({ label, delta }) => {
    const entry: Record<string, number | string> = { scenario: label };
    eligible.forEach((p) => {
      let payment: number;
      if (p.rate_type === 'fixa') {
        payment = p.monthly_payment ?? pmt(p.loan_amount!, p.tan ?? 0, p.term_months!);
      } else {
        const scenarioTan = Math.max(0.001, (p.tan ?? 0) + delta);
        payment = pmt(p.loan_amount!, scenarioTan, p.term_months!);
      }
      entry[p.bank_name] = Math.round(payment);
    });
    return entry;
  });

  const allPmts = data.flatMap((d) => eligible.map((p) => d[p.bank_name] as number)).filter((v) => v > 0);
  const yMin = allPmts.length ? Math.floor(Math.min(...allPmts) - 50) : 0;
  const yMax = allPmts.length ? Math.ceil(Math.max(...allPmts) + 50) : undefined;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <p className="text-sm font-bold text-gray-800">Impacto de Variações da Euribor na Prestação</p>
      <p className="text-xs text-gray-500 mt-0.5 mb-4">Como a prestação base muda consoante a evolução da Euribor (sem seguros)</p>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data} syncId={undefined}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="scenario" tick={{ fontSize: 11, fill: '#64748b' }} />
          <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={fmtAbbrev} domain={[yMin, yMax ?? 'auto']} />
          <Tooltip formatter={(v) => fmtEur(v as number)} labelFormatter={(l) => `Cenário Euribor: ${l}`} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <ReferenceArea x1="-1%" x2="+1%" fill="#FEF3C7" fillOpacity={0.5} label={{ value: 'Zona mais provável', position: 'insideTop', fontSize: 10, fill: '#92400e' }} />
          {eligible.map((p, i) => (
            <Line
              key={p.id}
              type="monotone"
              dataKey={p.bank_name}
              stroke={getBankColor(p.bank_name, i, p.id === recommendedId)}
              strokeWidth={p.id === recommendedId ? 2.5 : 1.5}
              strokeDasharray={p.rate_type === 'fixa' ? '5 5' : undefined}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      <p className="text-[10px] text-gray-400 mt-1">Euribor de referência usada: valor atual do indexante registado em cada proposta.</p>
    </div>
  );
}

// ─── Combined export ───────────────────────────────────────────────────────────

export function PropostasCharts({ propostas, recommendedId }: ChartProps) {
  if (!propostas.length) return null;
  return (
    <div className="space-y-4">
      <MonthlyTotalBarChart propostas={propostas} recommendedId={recommendedId} />
      <TotalCostBarChart propostas={propostas} recommendedId={recommendedId} />
      <CapitalEvolutionChart propostas={propostas} recommendedId={recommendedId} />
      <EuriborSensitivityChart propostas={propostas} recommendedId={recommendedId} />
    </div>
  );
}
