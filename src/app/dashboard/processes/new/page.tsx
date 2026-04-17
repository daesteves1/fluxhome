'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { ProcessTipo } from '@/types/database';

const TIPOS: { value: ProcessTipo; label: string; desc: string; color: string }[] = [
  { value: 'credito_habitacao', label: 'Crédito Habitação', desc: 'Aquisição de habitação própria', color: 'border-blue-300 bg-blue-50 text-blue-800' },
  { value: 'renegociacao',      label: 'Renegociação',      desc: 'Renegociar crédito existente',   color: 'border-amber-300 bg-amber-50 text-amber-800' },
  { value: 'construcao',        label: 'Construção',         desc: 'Crédito para construção',        color: 'border-teal-300 bg-teal-50 text-teal-800' },
  { value: 'outro',             label: 'Outro',              desc: 'Outro tipo de crédito',          color: 'border-slate-300 bg-slate-50 text-slate-700' },
];

interface ClientResult { id: string; p1_name: string; p1_email: string | null; p2_name: string | null }

export default function NewProcessPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const preselectedClientId = sp.get('client_id');

  const [step, setStep] = useState(preselectedClientId ? 2 : 1);
  const [selectedClient, setSelectedClient] = useState<ClientResult | null>(null);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<ClientResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [tipo, setTipo] = useState<ProcessTipo | null>(null);

  // Financial fields
  const [valorImovel, setValorImovel] = useState('');
  const [montante, setMontante] = useState('');
  const [prazo, setPrazo] = useState('');
  const [finalidade, setFinalidade] = useState('');
  const [localizacao, setLocalizacao] = useState('');
  const [observacoes, setObservacoes] = useState('');

  const [submitting, setSubmitting] = useState(false);

  // Load preselected client
  useEffect(() => {
    if (preselectedClientId) {
      fetch(`/api/clients/${preselectedClientId}`)
        .then((r) => r.json())
        .then((data: unknown) => {
          const d = data as ClientResult;
          if (d?.id) setSelectedClient(d);
        })
        .catch(() => {});
    }
  }, [preselectedClientId]);

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/clients?search=${encodeURIComponent(q)}&limit=8`);
      if (res.ok) setResults(await res.json() as ClientResult[]);
    } finally { setSearching(false); }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => { void doSearch(search); }, 300);
    return () => clearTimeout(t);
  }, [search, doSearch]);

  async function submit() {
    if (!selectedClient || !tipo) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/processes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: selectedClient.id,
          tipo,
          valor_imovel: valorImovel ? Number(valorImovel) : undefined,
          montante_solicitado: montante ? Number(montante) : undefined,
          prazo_meses: prazo ? Number(prazo) : undefined,
          finalidade: finalidade || undefined,
          localizacao_imovel: localizacao || undefined,
          observacoes: observacoes || undefined,
        }),
      });
      if (!res.ok) { const d = await res.json() as { error?: string }; toast.error(d.error ?? 'Erro'); return; }
      const { id } = await res.json() as { id: string };
      toast.success('Processo criado!');
      router.push(`/dashboard/processes/${id}`);
    } finally {
      setSubmitting(false);
    }
  }

  const ltv = montante && valorImovel ? ((Number(montante) / Number(valorImovel)) * 100).toFixed(1) : null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Novo processo</h1>
        <p className="text-sm text-slate-500 mt-0.5">Passo {step} de {preselectedClientId ? 2 : 3}</p>
      </div>

      {/* Step 1 — Select client */}
      {step === 1 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div>
            <h2 className="font-semibold text-slate-900 mb-1">Para qual cliente?</h2>
            <p className="text-sm text-slate-500">Pesquise por nome, email ou NIF</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Pesquisar cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          {searching && <p className="text-sm text-slate-400">A pesquisar...</p>}
          {results.length > 0 && (
            <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 overflow-hidden">
              {results.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { setSelectedClient(c); setResults([]); setSearch(''); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 text-left"
                >
                  <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
                    {c.p1_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900">{c.p1_name}</p>
                    {c.p1_email && <p className="text-xs text-slate-400 truncate">{c.p1_email}</p>}
                  </div>
                </button>
              ))}
            </div>
          )}
          {selectedClient && (
            <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <Check className="h-4 w-4 text-green-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-green-800">{selectedClient.p1_name}</p>
                {selectedClient.p1_email && <p className="text-xs text-green-600">{selectedClient.p1_email}</p>}
              </div>
            </div>
          )}
          <p className="text-sm text-slate-500">
            Cliente não encontrado?{' '}
            <a href="/dashboard/clients/new" className="text-blue-600 hover:underline">Criar novo cliente →</a>
          </p>
          <div className="flex justify-end">
            <Button onClick={() => setStep(2)} disabled={!selectedClient}>Seguinte →</Button>
          </div>
        </div>
      )}

      {/* Step 2 — Tipo */}
      {step === 2 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h2 className="font-semibold text-slate-900">Tipo de processo</h2>
          <div className="grid grid-cols-2 gap-3">
            {TIPOS.map((t) => (
              <button
                key={t.value}
                onClick={() => setTipo(t.value)}
                className={cn(
                  'p-3 rounded-xl border-2 text-left transition-all',
                  tipo === t.value ? t.color + ' border-current' : 'border-slate-200 hover:border-slate-300'
                )}
              >
                <p className="font-semibold text-sm">{t.label}</p>
                <p className={cn('text-xs mt-0.5', tipo === t.value ? 'opacity-70' : 'text-slate-400')}>{t.desc}</p>
              </button>
            ))}
          </div>
          <div className="flex justify-between">
            {!preselectedClientId && <Button variant="outline" onClick={() => setStep(1)}>← Voltar</Button>}
            <Button onClick={() => setStep(3)} disabled={!tipo} className="ml-auto">Seguinte →</Button>
          </div>
        </div>
      )}

      {/* Step 3 — Financial */}
      {step === 3 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h2 className="font-semibold text-slate-900">Dados financeiros</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Valor do imóvel (€)</Label>
              <Input type="number" value={valorImovel} onChange={(e) => setValorImovel(e.target.value)} placeholder="ex: 250000" />
            </div>
            <div className="space-y-1.5">
              <Label>Montante solicitado (€)</Label>
              <Input type="number" value={montante} onChange={(e) => setMontante(e.target.value)} placeholder="ex: 200000" />
            </div>
            <div className="space-y-1.5">
              <Label>Prazo (meses)</Label>
              <Input type="number" value={prazo} onChange={(e) => setPrazo(e.target.value)} placeholder="ex: 360" />
            </div>
            <div className="space-y-1.5">
              <Label>Finalidade</Label>
              <Input value={finalidade} onChange={(e) => setFinalidade(e.target.value)} placeholder="ex: Habitação própria" />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Localização do imóvel</Label>
              <Input value={localizacao} onChange={(e) => setLocalizacao(e.target.value)} placeholder="ex: Lisboa" />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Observações</Label>
              <textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                rows={2}
                placeholder="Notas internas sobre este processo..."
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none"
              />
            </div>
          </div>
          {ltv && (
            <div className="text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
              LTV: <span className="font-semibold">{ltv}%</span>
            </div>
          )}
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(2)}>← Voltar</Button>
            <Button onClick={submit} disabled={submitting}>
              {submitting ? 'A criar...' : 'Criar processo'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
