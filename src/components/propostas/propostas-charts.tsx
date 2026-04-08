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
  AreaChart,
  Area,
  CartesianGrid,
  Cell,
} from 'recharts';
import type { BankProposta } from '@/types/proposta';
import { calcPrestacaoTotalBanco, calcPrestacaoTotalExterno, fmtEur } from '@/types/proposta';

interface ChartProps {
  propostas: BankProposta[];
  recommendedId: string | null;
}

const COLORS = ['#1E3A5F', '#2D5BA3', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'];
const REC_COLOR = '#2D5BA3';
const DEFAULT_COLOR = '#64748b';

function getColor(p: BankProposta, recommendedId: string | null, idx: number) {
  if (p.id === recommendedId) return REC_COLOR;
  return COLORS[idx % COLORS.length] ?? DEFAULT_COLOR;
}

// ─── 1. Monthly Total Bar Chart ────────────────────────────────────────────────

export function MonthlyTotalBarChart({ propostas, recommendedId }: ChartProps) {
  const data = propostas.map((p, i) => ({
    name: p.bank_name,
    'Com seguros banco': calcPrestacaoTotalBanco(p),
    'Com seguros externos': calcPrestacaoTotalExterno(p),
    color: getColor(p, recommendedId, i),
    isRec: p.id === recommendedId,
  }));

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Prestação Total Mensal</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} barCategoryGap="30%">
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
          <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v: number) => `${v}€`} />
          <Tooltip formatter={(v) => fmtEur(v as number | null)} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="Com seguros banco" fill="#1E3A5F" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.isRec ? '#2D5BA3' : '#1E3A5F'} />
            ))}
          </Bar>
          <Bar dataKey="Com seguros externos" fill="#94a3b8" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.isRec ? '#60a5fa' : '#94a3b8'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── 2. MTIC Comparison Bar Chart ─────────────────────────────────────────────

export function MticBarChart({ propostas, recommendedId }: ChartProps) {
  const data = propostas.map((p, i) => {
    const monthlyBanco = calcPrestacaoTotalBanco(p);
    const months = p.term_months ?? 0;
    const mtic = months > 0 ? monthlyBanco * months : null;
    return {
      name: p.bank_name,
      MTIC: mtic,
      color: getColor(p, recommendedId, i),
      isRec: p.id === recommendedId,
    };
  }).filter((d) => d.MTIC !== null);

  if (!data.length) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">MTIC Estimado (prestação banco × prazo)</p>
      <p className="text-[11px] text-gray-400 mb-4">Montante Total Imputado ao Consumidor aproximado</p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} barCategoryGap="40%">
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
          <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v: number) => `${Math.round(v / 1000)}k€`} />
          <Tooltip formatter={(v) => fmtEur(v as number | null)} />
          <Bar dataKey="MTIC" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.isRec ? '#2D5BA3' : '#1E3A5F'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── 3. Monthly Decomposition Stacked Bar ─────────────────────────────────────

export function DecompositionStackedBar({ propostas, recommendedId }: ChartProps) {
  const data = propostas.map((p, i) => ({
    name: p.bank_name,
    'Prestação base': p.monthly_payment ?? 0,
    'Seg. vida': (p.vida_banco ?? 0),
    'Multirriscos': (p.multiriscos_banco ?? 0),
    'Manutenção': (p.manutencao_conta ?? 0),
    'Outras': (p.outras_comissoes_mensais ?? 0),
    isRec: p.id === recommendedId,
    color: getColor(p, recommendedId, i),
  }));

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Decomposição da Prestação Mensal (c/ seguros banco)</p>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} barCategoryGap="30%">
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
          <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v: number) => `${v}€`} />
          <Tooltip formatter={(v) => fmtEur(v as number | null)} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="Prestação base" stackId="a" fill="#1E3A5F" />
          <Bar dataKey="Seg. vida" stackId="a" fill="#2D5BA3" />
          <Bar dataKey="Multirriscos" stackId="a" fill="#3b82f6" />
          <Bar dataKey="Manutenção" stackId="a" fill="#60a5fa" radius={[4, 4, 0, 0]} />
          {data.some((d) => d['Outras'] > 0) && (
            <Bar dataKey="Outras" stackId="a" fill="#93c5fd" radius={[4, 4, 0, 0]} />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── 4. Capital Evolution Line ────────────────────────────────────────────────

export function CapitalEvolutionChart({ propostas, recommendedId }: ChartProps) {
  const validPropostas = propostas.filter((p) => p.loan_amount && p.term_months && p.tan);
  if (!validPropostas.length) return null;

  // Approximate capital amortization using reducing balance
  const POINTS = 13; // years 0..term/12 in ~annual steps
  const datasets = validPropostas.map((p, i) => {
    const principal = p.loan_amount!;
    const months = p.term_months!;
    const monthlyRate = (p.tan! / 100) / 12;
    const payment = monthlyRate > 0
      ? (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months))
      : principal / months;
    const step = Math.floor(months / (POINTS - 1));
    const points: { year: number; [key: string]: number }[] = [];
    let balance = principal;
    for (let m = 0; m <= months; m++) {
      if (m % step === 0 || m === months) {
        points.push({ year: Math.round(m / 12), [p.bank_name]: Math.max(0, balance) });
      }
      const interest = balance * monthlyRate;
      balance = balance - (payment - interest);
    }
    return { proposta: p, color: getColor(p, recommendedId, i), points };
  });

  // Merge by year
  const allYears = Array.from(new Set(datasets.flatMap((d) => d.points.map((pt) => pt.year)))).sort((a, b) => a - b);
  const mergedData = allYears.map((year) => {
    const entry: Record<string, number> = { year };
    datasets.forEach((d) => {
      const pt = d.points.find((p) => p.year === year);
      if (pt) entry[d.proposta.bank_name] = pt[d.proposta.bank_name] as number;
    });
    return entry;
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Evolução do Capital em Dívida</p>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={mergedData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#64748b' }} label={{ value: 'Anos', position: 'insideBottomRight', offset: -4, fontSize: 11, fill: '#94a3b8' }} />
          <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v: number) => `${Math.round(v / 1000)}k€`} />
          <Tooltip formatter={(v) => fmtEur(v as number | null)} labelFormatter={(l) => `Ano ${l}`} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {datasets.map((d) => (
            <Line
              key={d.proposta.id}
              type="monotone"
              dataKey={d.proposta.bank_name}
              stroke={d.color}
              strokeWidth={d.proposta.id === recommendedId ? 2.5 : 1.5}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── 5. Capital vs Juros Area Chart ───────────────────────────────────────────

export function CapitalVsJurosChart({ propostas, recommendedId }: ChartProps) {
  // Show for first / recommended proposta
  const target = propostas.find((p) => p.id === recommendedId) ?? propostas[0];
  if (!target || !target.loan_amount || !target.term_months || !target.tan) return null;

  const principal = target.loan_amount;
  const months = target.term_months;
  const monthlyRate = (target.tan / 100) / 12;
  const payment = monthlyRate > 0
    ? (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months))
    : principal / months;

  const STEP = Math.max(1, Math.floor(months / 24));
  const data: { month: number; Capital: number; Juros: number }[] = [];
  let balance = principal;
  for (let m = 1; m <= months; m++) {
    const interest = balance * monthlyRate;
    const capitalPortion = payment - interest;
    balance = Math.max(0, balance - capitalPortion);
    if (m % STEP === 0 || m === months) {
      data.push({ month: m, Capital: Math.round(capitalPortion), Juros: Math.round(interest) });
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Capital vs. Juros por Prestação — {target.bank_name}</p>
      <p className="text-[11px] text-gray-400 mb-4">Evolução da componente capital e juros ao longo do prazo</p>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} label={{ value: 'Mês', position: 'insideBottomRight', offset: -4, fontSize: 11, fill: '#94a3b8' }} />
          <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(v: number) => `${v}€`} />
          <Tooltip formatter={(v) => fmtEur(v as number | null)} labelFormatter={(l) => `Mês ${l}`} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Area type="monotone" dataKey="Capital" stackId="1" stroke="#1E3A5F" fill="#dbeafe" strokeWidth={1.5} />
          <Area type="monotone" dataKey="Juros" stackId="1" stroke="#ef4444" fill="#fee2e2" strokeWidth={1.5} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── 6. Euribor Sensitivity Line ──────────────────────────────────────────────

export function EuriborSensitivityChart({ propostas, recommendedId }: ChartProps) {
  const validPropostas = propostas.filter((p) => p.spread && p.loan_amount && p.term_months);
  if (!validPropostas.length) return null;

  const euriborScenarios = [-1, -0.5, 0, 0.5, 1, 1.5, 2, 2.5, 3]; // delta from current

  const currentEuribor = 3.5; // approximate current Euribor 6m

  const data = euriborScenarios.map((delta) => {
    const euribor = Math.max(0, currentEuribor + delta);
    const entry: Record<string, number | string> = { euribor: `${euribor.toFixed(1)}%` };
    validPropostas.forEach((p) => {
      const tan = (p.spread! + euribor) / 100;
      const monthlyRate = tan / 12;
      const n = p.term_months!;
      const pv = p.loan_amount!;
      const payment = monthlyRate > 0
        ? (pv * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -n))
        : pv / n;
      entry[p.bank_name] = Math.round(payment);
    });
    return entry;
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Sensibilidade à Euribor</p>
      <p className="text-[11px] text-gray-400 mb-4">Prestação base estimada para diferentes cenários de Euribor</p>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="euribor" tick={{ fontSize: 10, fill: '#94a3b8' }} />
          <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(v: number) => `${v}€`} />
          <Tooltip formatter={(v) => fmtEur(v as number | null)} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {validPropostas.map((p, i) => (
            <Line
              key={p.id}
              type="monotone"
              dataKey={p.bank_name}
              stroke={getColor(p, recommendedId, i)}
              strokeWidth={p.id === recommendedId ? 2.5 : 1.5}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── All charts combined ───────────────────────────────────────────────────────

export function PropostasCharts({ propostas, recommendedId }: ChartProps) {
  if (!propostas.length) return null;

  return (
    <div className="space-y-4">
      <MonthlyTotalBarChart propostas={propostas} recommendedId={recommendedId} />
      <MticBarChart propostas={propostas} recommendedId={recommendedId} />
      <DecompositionStackedBar propostas={propostas} recommendedId={recommendedId} />
      <CapitalEvolutionChart propostas={propostas} recommendedId={recommendedId} />
      <CapitalVsJurosChart propostas={propostas} recommendedId={recommendedId} />
      <EuriborSensitivityChart propostas={propostas} recommendedId={recommendedId} />
    </div>
  );
}
