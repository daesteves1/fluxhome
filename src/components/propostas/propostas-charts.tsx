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

// Colors per bank position — distinct enough to tell apart
const BANK_COLORS = ['#1E3A5F', '#0891B2', '#7C3AED', '#D97706', '#059669', '#DC2626'];
const REC_COLOR = '#2563EB';

function getColor(p: BankProposta, recommendedId: string | null, idx: number) {
  if (p.id === recommendedId) return REC_COLOR;
  return BANK_COLORS[idx % BANK_COLORS.length] ?? '#64748b';
}

// tan is stored as decimal, e.g. 0.0415 = 4.15%
// monthly_rate = tan / 12
function pmt(principal: number, tanDecimal: number, months: number): number {
  const r = tanDecimal / 12;
  if (r <= 0) return principal / months;
  return (principal * r) / (1 - Math.pow(1 + r, -months));
}

// ─── 1. Monthly Total Bar Chart ────────────────────────────────────────────────

export function MonthlyTotalBarChart({ propostas, recommendedId }: ChartProps) {
  const data = propostas.map((p, i) => ({
    name: p.bank_name,
    'Com seguros banco': Math.round(calcPrestacaoTotalBanco(p) * 100) / 100,
    'Com seguros externos': Math.round(calcPrestacaoTotalExterno(p) * 100) / 100,
    isRec: p.id === recommendedId,
    color: getColor(p, recommendedId, i),
  }));

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Prestação Total Mensal</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} barCategoryGap="30%" syncId={undefined}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
          <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v: number) => `${v}€`} />
          <Tooltip formatter={(v) => fmtEur(v as number | null)} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="Com seguros banco" fill="#1E3A5F" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.isRec ? REC_COLOR : '#1E3A5F'} />
            ))}
          </Bar>
          <Bar dataKey="Com seguros externos" fill="#94a3b8" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.isRec ? '#93c5fd' : '#94a3b8'} />
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
    const monthly = calcPrestacaoTotalBanco(p);
    const months = p.term_months ?? 0;
    const mtic = months > 0 ? Math.round(monthly * months) : null;
    return {
      name: p.bank_name,
      MTIC: mtic,
      isRec: p.id === recommendedId,
      color: getColor(p, recommendedId, i),
    };
  }).filter((d) => d.MTIC !== null);

  if (!data.length) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">MTIC Estimado</p>
      <p className="text-[11px] text-gray-400 mb-4">Montante Total Imputado ao Consumidor (prestação total banco × prazo)</p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} barCategoryGap="40%" syncId={undefined}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
          <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v: number) => `${Math.round(v / 1000)}k€`} />
          <Tooltip formatter={(v) => fmtEur(v as number | null)} />
          <Bar dataKey="MTIC" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── 3. Monthly Decomposition Stacked Bar ─────────────────────────────────────

export function DecompositionStackedBar({ propostas, recommendedId }: ChartProps) {
  const data = propostas.map((p) => ({
    name: p.bank_name,
    'Prestação base': p.monthly_payment ?? 0,
    'Seg. vida': p.vida_banco ?? 0,
    'Multirriscos': p.multiriscos_banco ?? 0,
    'Manutenção': (p.manutencao_conta ?? 0) + (p.outras_comissoes_mensais ?? 0),
  }));

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Decomposição da Prestação (c/ seguros banco)</p>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} barCategoryGap="30%" syncId={undefined}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
          <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v: number) => `${v}€`} />
          <Tooltip formatter={(v) => fmtEur(v as number | null)} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {/* Distinct colors per segment */}
          <Bar dataKey="Prestação base" stackId="a" fill="#1E3A5F" />
          <Bar dataKey="Seg. vida" stackId="a" fill="#7C3AED" />
          <Bar dataKey="Multirriscos" stackId="a" fill="#0891B2" />
          <Bar dataKey="Manutenção" stackId="a" fill="#D97706" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── 4. Capital Evolution Line ────────────────────────────────────────────────

export function CapitalEvolutionChart({ propostas, recommendedId }: ChartProps) {
  const validPropostas = propostas.filter((p) => p.loan_amount && p.term_months && p.tan);
  if (!validPropostas.length) return null;

  // Sample every 6 months
  const datasets = validPropostas.map((p, i) => {
    const principal = p.loan_amount!;
    const months = p.term_months!;
    const tan = p.tan!; // already decimal, e.g. 0.0415
    const payment = pmt(principal, tan, months);
    const monthlyRate = tan / 12;

    const points: { year: number; [key: string]: number }[] = [];
    let balance = principal;

    for (let m = 0; m <= months; m++) {
      if (m % 6 === 0 || m === months) {
        points.push({ year: parseFloat((m / 12).toFixed(1)), [p.bank_name]: Math.max(0, Math.round(balance)) });
      }
      if (m < months) {
        const interest = balance * monthlyRate;
        balance = balance - (payment - interest);
      }
    }
    return { proposta: p, color: getColor(p, recommendedId, i), points };
  });

  // Merge by year label
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
        <LineChart data={mergedData} syncId={undefined}>
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
  const target = propostas.find((p) => p.id === recommendedId) ?? propostas[0];
  if (!target || !target.loan_amount || !target.term_months || !target.tan) return null;

  const principal = target.loan_amount;
  const months = target.term_months;
  const tan = target.tan; // decimal, e.g. 0.0415
  const monthlyRate = tan / 12;
  const payment = pmt(principal, tan, months);

  // Sample every 6 months
  const data: { year: number; Capital: number; Juros: number }[] = [];
  let balance = principal;

  for (let m = 1; m <= months; m++) {
    const interest = Math.round(balance * monthlyRate);
    const capitalPortion = Math.round(payment - balance * monthlyRate);
    balance = Math.max(0, balance - capitalPortion);
    if (m % 6 === 0 || m === months) {
      data.push({
        year: parseFloat((m / 12).toFixed(1)),
        Capital: Math.max(0, capitalPortion),
        Juros: Math.max(0, interest),
      });
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Capital vs. Juros — {target.bank_name}</p>
      <p className="text-[11px] text-gray-400 mb-4">Componente capital (↑ ao longo do tempo) e juros (↓ ao longo do tempo) por prestação</p>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} syncId={undefined}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#94a3b8' }} label={{ value: 'Anos', position: 'insideBottomRight', offset: -4, fontSize: 11, fill: '#94a3b8' }} />
          <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(v: number) => `${v}€`} />
          <Tooltip formatter={(v) => fmtEur(v as number | null)} labelFormatter={(l) => `Ano ${l}`} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {/* No stackId — show both series independently */}
          <Area type="monotone" dataKey="Capital" stroke="#1E3A5F" fill="#dbeafe" strokeWidth={2} fillOpacity={0.5} />
          <Area type="monotone" dataKey="Juros" stroke="#ef4444" fill="#fee2e2" strokeWidth={2} fillOpacity={0.5} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── 6. Euribor Sensitivity Line ──────────────────────────────────────────────

// Scenarios: adjust spread + euribor delta to get scenario TAN
// spread is decimal (e.g. 0.007 = 0.7%)
// euribor base ≈ 0.031 (3.1%, approx 6m Euribor)
// scenario_tan = spread + (euribor_base + delta)
// Fixed rate banks show a flat horizontal line

const EURIBOR_BASE = 0.031; // ~3.1% current Euribor 6m
const SCENARIOS: { label: string; delta: number }[] = [
  { label: '-2%', delta: -0.02 },
  { label: '-1%', delta: -0.01 },
  { label: 'Atual', delta: 0 },
  { label: '+1%', delta: 0.01 },
  { label: '+2%', delta: 0.02 },
  { label: '+3%', delta: 0.03 },
];

export function EuriborSensitivityChart({ propostas, recommendedId }: ChartProps) {
  const eligible = propostas.filter((p) => p.spread && p.loan_amount && p.term_months);
  if (!eligible.length) return null;

  const data = SCENARIOS.map(({ label, delta }) => {
    const entry: Record<string, number | string> = { scenario: label };
    eligible.forEach((p) => {
      const isFixed = p.rate_type === 'fixa';
      let payment: number;
      if (isFixed) {
        // Fixed rate: use actual TAN, doesn't change
        payment = p.monthly_payment ?? pmt(p.loan_amount!, p.tan ?? 0, p.term_months!);
      } else {
        // Variable/mixed: scenario TAN = spread + (euribor_base + delta)
        const scenarioTan = p.spread! + Math.max(0, EURIBOR_BASE + delta);
        payment = pmt(p.loan_amount!, scenarioTan, p.term_months!);
      }
      entry[p.bank_name] = Math.round(payment);
    });
    return entry;
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Sensibilidade à Euribor</p>
      <p className="text-[11px] text-gray-400 mb-4">Prestação base estimada para diferentes cenários de Euribor (base ≈ {(EURIBOR_BASE * 100).toFixed(1)}%)</p>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} syncId={undefined}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="scenario" tick={{ fontSize: 11, fill: '#64748b' }} />
          <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(v: number) => `${v}€`} />
          <Tooltip formatter={(v) => fmtEur(v as number | null)} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {eligible.map((p, i) => (
            <Line
              key={p.id}
              type="monotone"
              dataKey={p.bank_name}
              stroke={getColor(p, recommendedId, i)}
              strokeWidth={p.id === recommendedId ? 2.5 : 1.5}
              strokeDasharray={p.rate_type === 'fixa' ? '5 3' : undefined}
              dot={{ r: 3 }}
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
