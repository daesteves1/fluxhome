'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Check, X, Copy, Mail, MessageCircle, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn, formatCurrency } from '@/lib/utils';
import { calcLTV, calcMensalidade } from '@/lib/credit';
import { toast } from 'sonner';
import type { ProcessTipo } from '@/types/database';

// ─── Constants ─────────────────────────────────────────────────────────────────

const TIPOS: { value: ProcessTipo; label: string; desc: string }[] = [
  { value: 'credito_habitacao', label: 'Crédito Habitação', desc: 'Aquisição de habitação própria' },
  { value: 'renegociacao',      label: 'Renegociação',      desc: 'Renegociar crédito existente' },
  { value: 'construcao',        label: 'Construção',        desc: 'Crédito para construção' },
  { value: 'outro',             label: 'Outro',             desc: 'Outro tipo de crédito' },
];

const MOBILE_SECTIONS = [
  { label: 'Cliente',            subtitle: 'Selecione o cliente' },
  { label: 'Tipo de processo',   subtitle: 'Tipo de crédito' },
  { label: 'Dados financeiros',  subtitle: 'Valores e prazo' },
];

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ClientResult {
  id: string;
  p1_name: string;
  p1_email: string | null;
  p2_name: string | null;
}

interface Props {
  preselectedClientId?: string | null;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function NewProcessForm({ preselectedClientId }: Props) {
  const router = useRouter();

  // Client picker state
  const [selectedClient, setSelectedClient] = useState<ClientResult | null>(null);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<ClientResult[]>([]);
  const [searching, setSearching] = useState(false);

  // Success state
  const [success, setSuccess] = useState<{
    processId: string;
    portalToken: string | null;
    clientName: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Process fields
  const [tipo, setTipo] = useState<ProcessTipo | null>(null);
  const [valorImovel, setValorImovel] = useState('');
  const [montante, setMontante] = useState('');
  const [prazo, setPrazo] = useState('');
  const [finalidade, setFinalidade] = useState('');
  const [localizacao, setLocalizacao] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [mobileStep, setMobileStep] = useState(0);

  // Load preselected client
  useEffect(() => {
    if (!preselectedClientId) return;
    fetch(`/api/clients/${preselectedClientId}`)
      .then((r) => r.json())
      .then((data: unknown) => {
        const d = data as ClientResult;
        if (d?.id) setSelectedClient(d);
      })
      .catch(() => {});
  }, [preselectedClientId]);

  // Client search
  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/clients?search=${encodeURIComponent(q)}&limit=8`);
      if (res.ok) setResults(await res.json() as ClientResult[]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => { void doSearch(search); }, 300);
    return () => clearTimeout(t);
  }, [search, doSearch]);

  // Portal URL (used in success screen)
  const portalUrl = success?.portalToken
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/portal/${success.portalToken}`
    : null;

  async function copyPortalUrl() {
    if (!portalUrl) return;
    await navigator.clipboard.writeText(portalUrl);
    setCopied(true);
    toast.success('Link copiado!');
    setTimeout(() => setCopied(false), 2000);
  }

  // Live LTV + mensalidade
  const ltvVal = valorImovel && montante ? calcLTV(Number(montante), Number(valorImovel)) : null;
  const mensalidadeVal = montante && prazo ? calcMensalidade(Number(montante), Number(prazo)) : null;

  async function submit() {
    if (!selectedClient || !tipo) {
      toast.error('Selecione um cliente e o tipo de processo');
      return;
    }
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
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        toast.error(d.error ?? 'Erro ao criar processo');
        return;
      }
      const result = await res.json() as { id: string; portal_token: string | null; client_name: string };
      toast.success('Processo criado!');
      setSuccess({
        processId: result.id,
        portalToken: result.portal_token,
        clientName: result.client_name ?? selectedClient?.p1_name ?? '',
      });
    } finally {
      setSubmitting(false);
    }
  }

  // ── Success screen ──────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="max-w-lg mx-auto space-y-4">
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <FolderOpen className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <p className="font-semibold text-slate-900 text-lg">{success.clientName}</p>
            <p className="text-sm text-slate-500 mt-1">Processo criado com sucesso.</p>
          </div>
          <Button className="w-full" onClick={() => router.push(`/dashboard/processes/${success.processId}`)}>
            Ver processo
          </Button>
        </div>

        {portalUrl && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
            <p className="text-sm font-semibold text-slate-700">Partilhar portal com o cliente</p>
            <div className="flex gap-2">
              <input
                readOnly
                value={portalUrl}
                className="flex-1 min-w-0 px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-600 font-mono truncate focus:outline-none"
              />
              <button
                onClick={copyPortalUrl}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors shrink-0',
                  copied
                    ? 'bg-green-50 border-green-200 text-green-700'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50',
                )}
              >
                <Copy className="h-3.5 w-3.5" />
                {copied ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
            <div className="flex gap-2">
              <a
                href={`mailto:?subject=Portal%20de%20documentos&body=${encodeURIComponent(`Aceda ao seu portal de documentos: ${portalUrl}`)}`}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <Mail className="h-3.5 w-3.5" />
                Email
              </a>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Aceda ao seu portal de documentos: ${portalUrl}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                WhatsApp
              </a>
            </div>
          </div>
        )}
      </div>
    );
  }

  const mobileSection = MOBILE_SECTIONS[mobileStep]!;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Novo processo</h1>
        {/* Mobile progress */}
        <div className="sm:hidden mt-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-slate-700">{mobileSection.label}</span>
            <span className="text-slate-400 text-xs">{mobileStep + 1} / {MOBILE_SECTIONS.length}</span>
          </div>
          <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${((mobileStep + 1) / MOBILE_SECTIONS.length) * 100}%` }}
            />
          </div>
        </div>
        <p className="hidden sm:block text-sm text-slate-500 mt-0.5">
          Preencha os dados do processo de crédito
        </p>
      </div>

      {/* Card 1 — Client */}
      <div className={cn(
        'bg-white rounded-xl border border-slate-200 p-5 space-y-3',
        mobileStep === 0 ? 'block' : 'hidden',
        'sm:block',
      )}>
        <p className="text-sm font-semibold text-slate-700">Cliente</p>

        {selectedClient ? (
          <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
              {selectedClient.p1_name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900">{selectedClient.p1_name}</p>
              {selectedClient.p1_email && (
                <p className="text-xs text-slate-500 truncate">{selectedClient.p1_email}</p>
              )}
            </div>
            {!preselectedClientId && (
              <button
                type="button"
                onClick={() => { setSelectedClient(null); setSearch(''); }}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Pesquisar por nome, email ou NIF..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            {searching && <p className="text-xs text-slate-400 px-1">A pesquisar...</p>}
            {results.length > 0 && (
              <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 overflow-hidden">
                {results.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => { setSelectedClient(c); setResults([]); setSearch(''); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 text-left transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
                      {c.p1_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900">{c.p1_name}</p>
                      {c.p1_email && <p className="text-xs text-slate-400 truncate">{c.p1_email}</p>}
                    </div>
                    <Check className="h-4 w-4 text-slate-300 shrink-0" />
                  </button>
                ))}
              </div>
            )}
            <p className="text-xs text-slate-400">
              Cliente não existe?{' '}
              <a href="/dashboard/clients/new" className="text-blue-600 hover:underline">
                Criar novo cliente →
              </a>
            </p>
          </div>
        )}
      </div>

      {/* Card 2 — Tipo */}
      <div className={cn(
        'bg-white rounded-xl border border-slate-200 p-5 space-y-3',
        mobileStep === 1 ? 'block' : 'hidden',
        'sm:block',
      )}>
        <p className="text-sm font-semibold text-slate-700">Tipo de processo</p>
        <div className="grid grid-cols-2 gap-2">
          {TIPOS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTipo(t.value)}
              className={cn(
                'p-3 rounded-xl border-2 text-left transition-all',
                tipo === t.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50',
              )}
            >
              <p className={cn('font-semibold text-sm', tipo === t.value ? 'text-blue-800' : 'text-slate-900')}>
                {t.label}
              </p>
              <p className={cn('text-xs mt-0.5', tipo === t.value ? 'text-blue-600' : 'text-slate-400')}>
                {t.desc}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Card 3 — Dados financeiros */}
      <div className={cn(
        'bg-white rounded-xl border border-slate-200 p-5 space-y-4',
        mobileStep === 2 ? 'block' : 'hidden',
        'sm:block',
      )}>
        <p className="text-sm font-semibold text-slate-700">Dados financeiros</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Valor do imóvel (€)</Label>
            <Input
              type="number"
              value={valorImovel}
              onChange={(e) => setValorImovel(e.target.value)}
              placeholder="ex: 250 000"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Montante solicitado (€)</Label>
            <Input
              type="number"
              value={montante}
              onChange={(e) => setMontante(e.target.value)}
              placeholder="ex: 200 000"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Prazo (meses)</Label>
            <Input
              type="number"
              value={prazo}
              onChange={(e) => setPrazo(e.target.value)}
              placeholder="ex: 360"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Finalidade</Label>
            <Input
              value={finalidade}
              onChange={(e) => setFinalidade(e.target.value)}
              placeholder="ex: Habitação própria"
            />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label>Localização do imóvel</Label>
            <Input
              value={localizacao}
              onChange={(e) => setLocalizacao(e.target.value)}
              placeholder="ex: Lisboa"
            />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label>Observações</Label>
            <Textarea
              rows={2}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Notas internas sobre este processo..."
            />
          </div>
        </div>

        {/* Live indicators */}
        {(ltvVal !== null || mensalidadeVal !== null) && (
          <div className="flex gap-4 pt-1">
            {ltvVal !== null && (
              <div className="flex items-center gap-1.5 text-sm">
                <span className="text-slate-500">LTV:</span>
                <span className={cn(
                  'font-semibold',
                  ltvVal > 90 ? 'text-red-600' : ltvVal > 80 ? 'text-amber-600' : 'text-green-600',
                )}>
                  {ltvVal.toFixed(1)}%
                </span>
              </div>
            )}
            {mensalidadeVal !== null && mensalidadeVal > 0 && (
              <div className="flex items-center gap-1.5 text-sm">
                <span className="text-slate-500">Prestação indicativa:</span>
                <span className="font-semibold text-slate-800">{formatCurrency(mensalidadeVal)}/mês</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile footer — stepped nav */}
      <div className="sm:hidden flex items-center justify-between pb-2">
        {mobileStep > 0 ? (
          <button
            type="button"
            onClick={() => setMobileStep((s) => s - 1)}
            className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            ← Anterior
          </button>
        ) : (
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            ← Voltar
          </button>
        )}
        {mobileStep < MOBILE_SECTIONS.length - 1 ? (
          <Button
            type="button"
            onClick={() => setMobileStep((s) => s + 1)}
            disabled={
              (mobileStep === 0 && !selectedClient) ||
              (mobileStep === 1 && !tipo)
            }
          >
            Seguinte →
          </Button>
        ) : (
          <Button onClick={submit} disabled={submitting || !selectedClient || !tipo}>
            {submitting ? 'A criar...' : 'Criar processo'}
          </Button>
        )}
      </div>

      {/* Desktop footer */}
      <div className="hidden sm:flex items-center justify-between pb-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          ← Voltar
        </button>
        <Button onClick={submit} disabled={submitting || !selectedClient || !tipo}>
          {submitting ? 'A criar...' : 'Criar processo'}
        </Button>
      </div>
    </div>
  );
}
