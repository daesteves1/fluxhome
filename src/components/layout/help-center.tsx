'use client';

import { useState, useEffect, type FormEvent } from 'react';
import {
  X, Search, ChevronDown, ArrowRight,
  AlertCircle, CheckCircle2, HelpCircle,
} from 'lucide-react';

// ─── TYPES ────────────────────────────────────────────────────────────────────

type TabId = 'inicio' | 'docs' | 'faq' | 'novidades' | 'contacto';

interface DocSubsection {
  id: string;
  title: string;
  intro?: string;
  steps: string[];
  numbered?: boolean;
}
interface DocSection {
  id: string;
  emoji: string;
  title: string;
  subsections: DocSubsection[];
}
interface FaqItem { id: string; q: string; a: string; }
interface ChangelogEntry { date: string; version: string; items: string[]; }
interface SearchResult {
  id: string; badge: string; title: string;
  snippet: string; tab: 'faq' | 'docs'; highlight: string;
}
interface NavigateAction { tab: TabId; highlight?: string; }

// ─── DOCS CONTENT ─────────────────────────────────────────────────────────────

const DOCS: DocSection[] = [
  {
    id: 'primeiros-passos', emoji: '📋', title: 'Primeiros Passos',
    subsections: [
      {
        id: 'configurar-escritorio', title: 'Configurar o seu escritório',
        steps: [
          'Aceda a "Escritório" no menu lateral',
          'Adicione o logótipo e cor do escritório (white-label)',
          'Configure o texto RGPD personalizado',
          'Defina os documentos padrão solicitados aos clientes',
        ],
      },
      {
        id: 'convidar-mediadores', title: 'Convidar mediadores',
        steps: [
          'Aceda a "Mediadores" no menu lateral',
          'Clique em "Convidar mediador"',
          'Introduza o email e função (Mediador ou Admin de Escritório)',
          'O convite é enviado por email com link de ativação válido por 72 horas',
        ],
      },
    ],
  },
  {
    id: 'clientes', emoji: '👥', title: 'Clientes e Processos',
    subsections: [
      {
        id: 'criar-cliente', title: 'Criar um novo cliente',
        steps: [
          'Aceda a "Clientes" e clique em "+ Novo Cliente"',
          'Preencha os dados do proponente (e do 2.º proponente, se aplicável)',
          'Defina o tipo de processo: Aquisição, Renegociação ou Transferência',
          'O cliente é criado com os documentos padrão do escritório automaticamente',
        ],
      },
      {
        id: 'gerir-etapas', title: 'Gerir etapas do processo',
        intro: 'Etapas: Lead → Docs. Pendentes → Docs. Completos → Propostas Enviadas → Aprovado → Fechado',
        steps: [
          'Na vista de lista: use o seletor de etapa no cabeçalho do cliente',
          'Na vista kanban: arraste o cartão para a coluna pretendida',
          'A etapa avança automaticamente para "Docs. Completos" quando todos os documentos obrigatórios são aprovados',
        ],
        numbered: false,
      },
      {
        id: 'kanban', title: 'Vista Kanban',
        steps: [
          'Aceda a "Clientes" e clique no ícone de kanban (canto superior direito)',
          'Arraste os cartões entre colunas para avançar etapas',
          'Use o botão "Colunas" para mostrar/ocultar etapas (Lead e Fechado estão ocultas por defeito)',
          'A ordenação é guardada automaticamente',
        ],
      },
    ],
  },
  {
    id: 'documentos', emoji: '📄', title: 'Recolha de Documentos',
    subsections: [
      {
        id: 'enviar-link', title: 'Enviar o link ao cliente',
        steps: [
          'Abra o detalhe do cliente',
          'Clique em "Copiar link do portal" ou "Enviar link do portal" (por email)',
          'O cliente acede ao portal sem necessidade de criar conta',
          'Na primeira visita, o cliente assina o consentimento RGPD digitalmente',
        ],
      },
      {
        id: 'aprovar-rejeitar', title: 'Aprovar e rejeitar documentos',
        steps: [
          'Na tab "Documentos" do cliente, cada documento tem botões Aprovar e Rejeitar',
          'Ao rejeitar, introduza o motivo — o cliente verá a razão e poderá reenviar',
          'Quando todos os documentos obrigatórios estão aprovados, o processo avança automaticamente',
        ],
        numbered: false,
      },
      {
        id: 'gerir-docs', title: 'Gerir documentos solicitados',
        steps: [
          'Clique em "Gerir documentos" para ativar/desativar documentos opcionais',
          'Clique em "+ Adicionar documento" para pedir um documento personalizado',
          'Documentos com ficheiros carregados não podem ser removidos',
        ],
        numbered: false,
      },
      {
        id: 'download', title: 'Download de documentos',
        steps: [
          'Download individual: clique no ícone de download junto ao ficheiro',
          'Download de todos: clique em "Descarregar todos" e selecione os documentos pretendidos',
          'Os ficheiros são comprimidos em formato ZIP',
        ],
        numbered: false,
      },
    ],
  },
  {
    id: 'propostas', emoji: '📊', title: 'Propostas e Mapa Comparativo',
    subsections: [
      {
        id: 'criar-proposta', title: 'Criar uma proposta bancária',
        steps: [
          'Abra o detalhe do cliente → tab "Propostas"',
          'Clique em "+ Nova Proposta"',
          'Selecione o banco (ou "Outro" para banco não listado)',
          'Preencha: montante, prazo, tipo de taxa, spread, TAN, TAEG e prestação base',
          'Configure os seguros (banco e externos) por proponente',
          'Adicione os encargos únicos e condições do spread',
          'Guarde a proposta',
        ],
      },
      {
        id: 'criar-mapa', title: 'Criar o Mapa Comparativo',
        steps: [
          'Após criar as propostas, clique em "Editar mapa"',
          'Selecione quais propostas incluir no mapa',
          'Marque a proposta recomendada com a estrela (⭐)',
          'Adicione notas para o cliente',
          'Ative "Visível ao cliente" quando estiver pronto para partilhar',
          'O cliente verá o mapa comparativo no portal com análise visual',
        ],
      },
      {
        id: 'exportar-mapa', title: 'Exportar o mapa',
        steps: [
          'Excel: formato profissional com cores e sub-colunas de seguros',
          'PDF: documento em paisagem pronto para enviar ao cliente',
          'Clique em "Excel" ou "PDF" no topo do mapa comparativo',
        ],
        numbered: false,
      },
    ],
  },
  {
    id: 'definicoes', emoji: '⚙️', title: 'Definições',
    subsections: [
      {
        id: 'white-label', title: 'White-label do escritório',
        steps: [
          'Aceda a "Escritório" → tab "Configurações"',
          'Carregue o logótipo (PNG ou SVG recomendado)',
          'Escolha a cor principal do escritório',
          'O portal do cliente passará a mostrar a marca do escritório',
        ],
      },
      {
        id: 'template-documentos', title: 'Template de documentos',
        steps: [
          'Aceda a "Escritório" → separador "Documentos"',
          'Ative ou desative documentos do template padrão',
          'Defina se cada documento é obrigatório ou opcional',
          'Adicione documentos personalizados ao template',
          'Estas definições aplicam-se a todos os novos clientes criados neste escritório',
        ],
      },
    ],
  },
];

// ─── FAQ CONTENT ──────────────────────────────────────────────────────────────

const FAQ_ITEMS: FaqItem[] = [
  { id: 'faq-0', q: 'O meu cliente não consegue aceder ao portal. O que fazer?', a: 'Verifique se o link copiado está correto. O link do portal é único por cliente e não expira. Se necessário, copie o link novamente no cabeçalho do cliente e reenvie-o. O cliente não precisa de criar conta — acede diretamente pelo link.' },
  { id: 'faq-1', q: 'Posso ter mais do que um mediador no mesmo escritório?', a: 'Sim. No plano Pro pode ter até 3 mediadores e no plano Business o número é ilimitado. Convide mediadores em "Mediadores" → "Convidar mediador".' },
  { id: 'faq-2', q: 'O que acontece quando rejeito um documento?', a: 'O cliente recebe a notificação no portal com o motivo da rejeição e pode carregar um novo ficheiro. O documento volta ao estado "Em análise" após o reenvio.' },
  { id: 'faq-3', q: 'Posso personalizar os documentos solicitados a cada cliente?', a: 'Sim. Em cada cliente, clique em "Gerir documentos" para ativar/desativar documentos opcionais e adicionar documentos personalizados para esse processo específico.' },
  { id: 'faq-4', q: 'O mapa comparativo é enviado automaticamente ao cliente?', a: 'Não. O mapa só fica visível no portal do cliente quando ativar o toggle "Visível ao cliente" no mapa comparativo. Isto dá-lhe controlo total sobre quando o cliente pode ver as propostas.' },
  { id: 'faq-5', q: 'Como funciona o RGPD na plataforma?', a: 'Na primeira visita ao portal, o cliente assina digitalmente o consentimento RGPD com registo de data, hora e IP. O documento de consentimento pode ser descarregado no detalhe do cliente. O texto RGPD pode ser personalizado em "Escritório" → "Configurações".' },
  { id: 'faq-6', q: 'Posso usar o meu logótipo e cores no portal do cliente?', a: 'Sim, no plano Business. Configure em "Escritório" → "Configurações" → secção "White-label".' },
  { id: 'faq-7', q: 'Como exporto o mapa comparativo?', a: 'No mapa comparativo do cliente, clique em "Excel" ou "PDF" para descarregar. O ficheiro Excel inclui todas as secções com formatação profissional. O PDF está em formato paisagem pronto para enviar.' },
  { id: 'faq-8', q: 'O que é o MTIC?', a: 'O Montante Total Imputado ao Consumidor (MTIC) é o valor total que o cliente pagará ao longo de todo o prazo, incluindo capital, juros e seguros. É fornecido pelo banco na FINE e deve ser introduzido manualmente no campo MTIC de cada proposta.' },
  { id: 'faq-9', q: 'Posso ter dois proponentes num processo?', a: 'Sim. Ao criar um cliente, ative a opção de 2.º proponente. Os documentos por proponente (BI, recibos, IRS, etc.) serão criados automaticamente para ambos. No portal, o cliente verá os documentos separados por proponente em tabs.' },
];

// ─── CHANGELOG ────────────────────────────────────────────────────────────────

const CHANGELOG: ChangelogEntry[] = [
  {
    date: 'Abril 2026', version: 'v1.2',
    items: [
      '🆕 Mapa Comparativo redesenhado com secções independentes',
      '🆕 Vista Kanban para gestão de processos',
      '🆕 Seguros com opção banco vs externos por proponente',
      '🐛 Correção: sincronização de estado no kanban ao navegar',
      '🐛 Correção: percentagens de TAN e TAEG agora apresentadas corretamente',
    ],
  },
  {
    date: 'Março 2026', version: 'v1.1',
    items: [
      '🆕 Template de documentos configurável por escritório',
      '🆕 Gráficos de análise no mapa comparativo (MTIC, evolução do capital, Euribor)',
      '🆕 Export do mapa para Excel e PDF',
      '🆕 Super admin com configurações por escritório',
      '🐛 Correção: documentos aprovados movem para o fim da lista no portal',
    ],
  },
  {
    date: 'Fevereiro 2026', version: 'v1.0',
    items: [
      '🎉 Lançamento da plataforma HomeFlux',
      '🆕 Portal do cliente sem login',
      '🆕 Recolha e aprovação de documentos',
      '🆕 Assinatura digital do consentimento RGPD',
      '🆕 Propostas bancárias com comparação de seguros',
      '🆕 Dashboard com pipeline e KPIs',
    ],
  },
];

// ─── SEARCH INDEX ─────────────────────────────────────────────────────────────

const SEARCH_INDEX: SearchResult[] = [
  ...FAQ_ITEMS.map((item) => ({
    id: item.id,
    badge: 'FAQ',
    title: item.q,
    snippet: item.a.slice(0, 120) + (item.a.length > 120 ? '…' : ''),
    tab: 'faq' as const,
    highlight: item.id,
  })),
  ...DOCS.flatMap((section) =>
    section.subsections.map((sub) => ({
      id: `doc-${section.id}-${sub.id}`,
      badge: 'Documentação',
      title: sub.title,
      snippet: (sub.intro ?? sub.steps[0] ?? '').slice(0, 120),
      tab: 'docs' as const,
      highlight: sub.id,
    }))
  ),
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function Hl({ text, q }: { text: string; q: string }) {
  if (!q.trim()) return <>{text}</>;
  const lower = text.toLowerCase();
  const qLower = q.trim().toLowerCase();
  const idx = lower.indexOf(qLower);
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-100 text-yellow-900 rounded-[2px] px-0.5 not-italic">
        {text.slice(idx, idx + qLower.length)}
      </mark>
      {text.slice(idx + qLower.length)}
    </>
  );
}

// ─── TOPIC CARDS ──────────────────────────────────────────────────────────────

const TOPICS = [
  { emoji: '📋', title: 'Primeiros Passos',     desc: 'Configurar escritório e convidar mediadores',        tab: 'docs' as TabId, ref: 'configurar-escritorio' },
  { emoji: '👥', title: 'Clientes e Processos', desc: 'Criar clientes, etapas e pipeline',                  tab: 'docs' as TabId, ref: 'criar-cliente' },
  { emoji: '📄', title: 'Recolha de Documentos', desc: 'Portal do cliente, aprovação e download',           tab: 'docs' as TabId, ref: 'enviar-link' },
  { emoji: '📊', title: 'Propostas e Mapa',      desc: 'Criar propostas e gerar o mapa comparativo',        tab: 'docs' as TabId, ref: 'criar-proposta' },
  { emoji: '⚙️', title: 'Definições',            desc: 'White-label, documentos padrão, configurações',    tab: 'docs' as TabId, ref: 'white-label' },
  { emoji: '❓', title: 'FAQ',                    desc: 'Respostas às perguntas mais frequentes',            tab: 'faq' as TabId,  ref: undefined },
];

// ─── INÍCIO TAB ───────────────────────────────────────────────────────────────

function InicioTab({ onNavigate }: { onNavigate: (a: NavigateAction) => void }) {
  const [query, setQuery] = useState('');

  const results = query.trim().length >= 2
    ? SEARCH_INDEX.filter(
        (r) =>
          r.title.toLowerCase().includes(query.toLowerCase()) ||
          r.snippet.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8)
    : [];

  return (
    <div className="p-5">
      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Pesquisar na ajuda..."
          className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-all"
        />
      </div>

      {query.trim().length >= 2 ? (
        results.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-400 text-sm">Nenhum resultado para &ldquo;{query}&rdquo;</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-slate-400 mb-3">{results.length} resultado{results.length !== 1 ? 's' : ''}</p>
            {results.map((r) => (
              <button
                key={r.id}
                onClick={() => { setQuery(''); onNavigate({ tab: r.tab, highlight: r.highlight }); }}
                className="w-full text-left p-3.5 bg-white border border-slate-200 rounded-xl hover:border-blue-300 hover:bg-blue-50/40 transition-all group"
              >
                <div className="flex items-start gap-3">
                  <span className={`mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${
                    r.badge === 'FAQ' ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {r.badge}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 leading-snug"><Hl text={r.title} q={query} /></p>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2"><Hl text={r.snippet} q={query} /></p>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-blue-500 flex-shrink-0 mt-1 transition-colors" />
                </div>
              </button>
            ))}
          </div>
        )
      ) : (
        <>
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-4">Tópicos</p>
          <div className="grid grid-cols-2 gap-3">
            {TOPICS.map((card) => (
              <button
                key={card.title}
                onClick={() => onNavigate({ tab: card.tab, highlight: card.ref })}
                className="text-left p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-sm transition-all group"
              >
                <div className="text-2xl mb-2.5">{card.emoji}</div>
                <p className="text-sm font-semibold text-slate-800 leading-tight group-hover:text-blue-700 transition-colors">{card.title}</p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{card.desc}</p>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── DOCS TAB ─────────────────────────────────────────────────────────────────

function DocsTab({ highlight, onClear }: { highlight: string | null; onClear: () => void }) {
  useEffect(() => {
    if (!highlight) return;
    const timer = setTimeout(() => {
      document.getElementById(`doc-${highlight}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      onClear();
    }, 80);
    return () => clearTimeout(timer);
  }, [highlight, onClear]);

  return (
    <div className="divide-y divide-slate-100">
      {DOCS.map((section) => (
        <div key={section.id} className="p-5">
          <div className="flex items-center gap-2.5 mb-5">
            <span className="text-xl">{section.emoji}</span>
            <h2 className="text-base font-bold text-slate-900">{section.title}</h2>
          </div>
          <div className="space-y-6">
            {section.subsections.map((sub) => (
              <div key={sub.id} id={`doc-${sub.id}`} className="scroll-mt-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                  {sub.title}
                </h3>
                {sub.intro && (
                  <p className="text-xs text-slate-600 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5 mb-3 leading-relaxed">
                    {sub.intro}
                  </p>
                )}
                <ol className="space-y-2.5">
                  {sub.steps.map((step, i) => (
                    <li key={i} className="flex items-start gap-3">
                      {sub.numbered !== false ? (
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center mt-0.5">
                          {i + 1}
                        </span>
                      ) : (
                        <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-slate-300 mt-2" />
                      )}
                      <span className="text-sm text-slate-600 leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── FAQ TAB ──────────────────────────────────────────────────────────────────

function FAQItem({ item, open, onToggle }: { item: FaqItem; open: boolean; onToggle: () => void }) {
  return (
    <div id={`faq-${item.id}`} className="border-b border-slate-100 last:border-0 scroll-mt-2">
      <button
        onClick={onToggle}
        className="w-full flex items-start justify-between gap-3 px-5 py-4 text-left hover:bg-slate-50/80 transition-colors"
      >
        <span className="text-sm font-semibold text-slate-800 leading-snug">{item.q}</span>
        <ChevronDown className={`h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-5 pb-4">
          <p className="text-sm text-slate-600 leading-relaxed">{item.a}</p>
        </div>
      )}
    </div>
  );
}

function FAQTab({ highlight, onClear }: { highlight: string | null; onClear: () => void }) {
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (!highlight) return;
    setOpenId(highlight);
    const timer = setTimeout(() => {
      document.getElementById(`faq-${highlight}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      onClear();
    }, 80);
    return () => clearTimeout(timer);
  }, [highlight, onClear]);

  return (
    <div>
      {FAQ_ITEMS.map((item) => (
        <FAQItem
          key={item.id}
          item={item}
          open={openId === item.id}
          onToggle={() => setOpenId(openId === item.id ? null : item.id)}
        />
      ))}
    </div>
  );
}

// ─── NOVIDADES TAB ────────────────────────────────────────────────────────────

function NovicadesTab() {
  return (
    <div className="p-5">
      <div className="relative">
        <div className="absolute left-[17px] top-3 bottom-3 w-0.5 bg-slate-200" />
        <div className="space-y-8">
          {CHANGELOG.map((entry) => (
            <div key={entry.version} className="flex gap-4">
              <div className="flex-shrink-0 w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-[11px] font-bold z-10 shadow-sm">
                {entry.version.replace('v', '')}
              </div>
              <div className="flex-1 min-w-0 pb-1">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-bold text-slate-900">{entry.version}</span>
                  <span className="text-xs text-slate-400">{entry.date}</span>
                </div>
                <ul className="space-y-2">
                  {entry.items.map((item, i) => (
                    <li key={i} className="text-sm text-slate-600 leading-relaxed">{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── CONTACTO TAB ─────────────────────────────────────────────────────────────

function ContactoTab() {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (message.trim().length < 20) { setError('A mensagem deve ter pelo menos 20 caracteres.'); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/support/ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, message }),
      });
      if (res.ok) {
        setSuccess(true);
        setSubject('');
        setMessage('');
      } else {
        const data = await res.json() as { error?: string };
        setError(data.error ?? 'Erro ao enviar. Tente novamente.');
      }
    } catch {
      setError('Erro ao enviar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  const inputCls = 'w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-all';

  return (
    <div className="p-5">
      <p className="text-sm text-slate-500 mb-6 leading-relaxed">
        Tem alguma questão ou problema? Envie-nos uma mensagem e responderemos o mais brevemente possível.
      </p>
      {success ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
          </div>
          <p className="text-sm font-semibold text-slate-800 mb-1">Mensagem enviada!</p>
          <p className="text-xs text-slate-500">Responderemos em breve.</p>
          <button onClick={() => setSuccess(false)} className="mt-4 text-xs text-blue-600 hover:underline">
            Enviar outra mensagem
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Assunto *</label>
            <input
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Resumo da sua questão"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Mensagem * <span className="text-slate-400 font-normal">(mín. 20 caracteres)</span>
            </label>
            <textarea
              required
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Descreva a sua questão com o máximo de detalhe possível..."
              className={`${inputCls} resize-none`}
            />
            <p className="text-right text-[10px] text-slate-400 mt-1">{message.length} / 20 mín.</p>
          </div>
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl">
              <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
          >
            {loading ? 'A enviar...' : 'Enviar mensagem'}
          </button>
        </form>
      )}
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

const TABS: { id: TabId; label: string }[] = [
  { id: 'inicio',    label: 'Início' },
  { id: 'docs',      label: 'Documentação' },
  { id: 'faq',       label: 'FAQ' },
  { id: 'novidades', label: 'Novidades' },
  { id: 'contacto',  label: 'Contacto' },
];

export function HelpCenter({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<TabId>('inicio');
  const [highlight, setHighlight] = useState<string | null>(null);

  function navigate({ tab, highlight: h }: NavigateAction) {
    setActiveTab(tab);
    setHighlight(h ?? null);
  }

  return (
    <div
      className={`fixed top-0 right-0 bottom-0 z-40 w-full sm:w-[480px] bg-white border-l border-slate-200 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
        open ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 h-14 border-b border-slate-200 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center">
            <HelpCircle className="h-4 w-4 text-blue-600" />
          </div>
          <span className="font-semibold text-slate-900 text-sm">Centro de Ajuda</span>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          aria-label="Fechar ajuda"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 px-4 py-2.5 border-b border-slate-100 flex-shrink-0 overflow-x-auto scrollbar-none">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setHighlight(null); }}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'inicio'    && <InicioTab onNavigate={navigate} />}
        {activeTab === 'docs'      && <DocsTab    highlight={highlight} onClear={() => setHighlight(null)} />}
        {activeTab === 'faq'       && <FAQTab      highlight={highlight} onClear={() => setHighlight(null)} />}
        {activeTab === 'novidades' && <NovicadesTab />}
        {activeTab === 'contacto'  && <ContactoTab />}
      </div>
    </div>
  );
}
