'use client';

import { useState, useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import {
  Home, Menu, X, Check, ArrowRight, Lock, PenLine, ClipboardList,
  Building2, Bell, MessageSquare, AlertCircle,
  FileText, Bot, Sparkles,
} from 'lucide-react';

// ─── CSS ─────────────────────────────────────────────────────────────────────

const STYLES = `
  html { scroll-behavior: smooth; }

  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50%       { transform: translateY(-10px); }
  }
  .animate-float { animation: float 4s ease-in-out infinite; }

  @keyframes heroIn {
    from { opacity: 0; transform: translateY(22px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .hero-in {
    animation: heroIn 0.75s cubic-bezier(0.16, 1, 0.3, 1) both;
    opacity: 0;
  }
  .delay-1 { animation-delay: 0.08s; }
  .delay-2 { animation-delay: 0.18s; }
  .delay-3 { animation-delay: 0.30s; }
  .delay-4 { animation-delay: 0.44s; }
  .delay-5 { animation-delay: 0.58s; }

  .animate-on-scroll {
    opacity: 0;
    transform: translateY(28px);
    transition: opacity 0.7s cubic-bezier(0.16,1,0.3,1),
                transform 0.7s cubic-bezier(0.16,1,0.3,1);
  }
  .animate-on-scroll.visible {
    opacity: 1;
    transform: translateY(0);
  }

  .pricing-card {
    transition: transform 0.25s ease, box-shadow 0.25s ease;
  }
  .pricing-card:hover {
    transform: translateY(-6px);
    box-shadow: 0 24px 48px rgba(0,0,0,0.14);
  }

  .soon-grid {
    background-image:
      linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px);
    background-size: 40px 40px;
  }
`;

// ─── SHARED ───────────────────────────────────────────────────────────────────

function Logo({ white = false, large = false }: { white?: boolean; large?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className={`${large ? 'w-10 h-10' : 'w-8 h-8'} bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0`}>
        <Home className={`${large ? 'h-5 w-5' : 'h-4 w-4'} text-white`} strokeWidth={2.5} />
      </div>
      <span className={`font-extrabold ${large ? 'text-2xl' : 'text-lg'} tracking-tight ${white ? 'text-white' : 'text-slate-900'}`}>
        HomeFlux
      </span>
    </div>
  );
}

function Badge({ children, inverted = false }: { children: ReactNode; inverted?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-widest uppercase ${
      inverted
        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
        : 'bg-blue-50 text-blue-700 border border-blue-100'
    }`}>
      {children}
    </span>
  );
}

function Feature({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
        <Check className="h-3 w-3 text-green-600" strokeWidth={3} />
      </span>
      <span className="text-slate-600 text-sm leading-relaxed">{children}</span>
    </li>
  );
}

// ─── NAVBAR ───────────────────────────────────────────────────────────────────

function Navbar({ onContact }: { onContact: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const linkCls = `text-sm font-medium transition-colors ${
    scrolled ? 'text-slate-600 hover:text-slate-900' : 'text-white/75 hover:text-white'
  }`;

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? 'bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-sm' : ''
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        <Logo white={!scrolled} />

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8">
          <a href="#funcionalidades" className={linkCls}>Funcionalidades</a>
          <a href="#precos" className={linkCls}>Preços</a>
          <button onClick={onContact} className={linkCls}>Contacto</button>
        </div>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-2">
          <Link href="/login" className={`text-sm font-medium px-4 py-2 rounded-lg transition-colors ${
            scrolled ? 'text-slate-700 hover:bg-slate-100' : 'text-white/85 hover:bg-white/10'
          }`}>
            Entrar
          </Link>
          <Link href="/login" className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors shadow-sm">
            Começar grátis
          </Link>
        </div>

        {/* Hamburger */}
        <button
          className={`md:hidden p-2 rounded-lg ${scrolled ? 'text-slate-700' : 'text-white'}`}
          onClick={() => setOpen(!open)}
          aria-label="Menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-white border-t border-slate-100 py-3 px-4 space-y-1">
          <a href="#funcionalidades" onClick={() => setOpen(false)} className="block py-2.5 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg">Funcionalidades</a>
          <a href="#precos" onClick={() => setOpen(false)} className="block py-2.5 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg">Preços</a>
          <button onClick={() => { setOpen(false); onContact(); }} className="block w-full text-left py-2.5 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg">Contacto</button>
          <div className="pt-2 flex flex-col gap-2">
            <Link href="/login" className="text-center py-2.5 text-sm font-medium text-slate-700 border border-slate-200 rounded-xl">Entrar</Link>
            <Link href="/login" className="text-center py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl">Começar grátis</Link>
          </div>
        </div>
      )}
    </nav>
  );
}

// ─── HERO BROWSER MOCKUP ──────────────────────────────────────────────────────

function BrowserMockup() {
  const kpis = [
    { label: 'Processos Ativos', value: '12', color: '#2563EB' },
    { label: 'Docs por Rever',   value: '3',  color: '#D97706' },
    { label: 'Propostas',        value: '8',  color: '#7C3AED' },
    { label: 'Fechados',         value: '2',  color: '#059669' },
  ];
  const clients = [
    { name: 'Maria Santos', step: 'Documentação',    pct: 62, col: '#D97706' },
    { name: 'Pedro Alves',  step: 'Proposta Enviada', pct: 87, col: '#7C3AED' },
    { name: 'Ana Costa',    step: 'Em Aprovação',    pct: 94, col: '#059669' },
  ];

  return (
    <div className="animate-float rounded-2xl overflow-hidden shadow-2xl shadow-blue-950/60 border border-white/10" style={{ width: 720 }}>
      {/* Chrome bar */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#1E293B]">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400/80" />
          <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
          <div className="w-3 h-3 rounded-full bg-green-400/80" />
        </div>
        <div className="flex-1 bg-[#0F172A]/70 rounded-md px-3 py-1 text-center text-xs text-slate-400 select-none">
          app.homeflux.pt/dashboard
        </div>
      </div>

      {/* App */}
      <div className="flex" style={{ height: 380 }}>
        {/* Sidebar */}
        <div className="flex flex-col flex-shrink-0" style={{ width: 186, background: '#1E3A5F' }}>
          <div className="flex items-center gap-2 p-4 border-b border-white/10">
            <div className="w-6 h-6 bg-blue-500 rounded-md flex items-center justify-center">
              <Home className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-white text-sm font-bold">HomeFlux</span>
          </div>
          <nav className="p-3 space-y-0.5 flex-1">
            {[
              { label: 'Dashboard', active: true },
              { label: 'Clientes', active: false },
              { label: 'Mediadores', active: false },
            ].map(({ label, active }) => (
              <div key={label} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium cursor-default ${
                active ? 'bg-white/15 text-white' : 'text-blue-200/80'
              }`}>
                <div className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-blue-300' : 'bg-white/20'}`} />
                {label}
              </div>
            ))}
          </nav>
          <div className="p-3 border-t border-white/10">
            <div className="flex items-center gap-2 px-3 py-2">
              <div className="w-7 h-7 rounded-full bg-blue-400 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">J</div>
              <div>
                <div className="text-white text-xs font-semibold leading-none">João Silva</div>
                <div className="text-blue-300 text-[10px] mt-0.5">Mediador</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main */}
        <div className="flex-1 bg-[#F8FAFC] overflow-hidden p-5">
          <div className="mb-4">
            <div className="text-slate-900 text-base font-bold">Boa tarde, João.</div>
            <div className="text-slate-400 text-xs mt-0.5">Terça-feira, 14 Jan 2025</div>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-4 gap-2.5 mb-4">
            {kpis.map(({ label, value, color }) => (
              <div key={label} className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm">
                <div className="text-xl font-extrabold" style={{ color }}>{value}</div>
                <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">{label}</div>
              </div>
            ))}
          </div>

          {/* Client list */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex items-center gap-4 px-4 py-2.5 border-b border-slate-100">
              {['Todos', 'Documentação', 'Proposta', 'Aprovado'].map((t, i) => (
                <span key={t} className={`text-[10px] font-semibold pb-0.5 ${
                  i === 0 ? 'text-blue-600 border-b-2 border-blue-600 pb-1' : 'text-slate-400'
                }`}>{t}</span>
              ))}
            </div>
            <div className="divide-y divide-slate-50">
              {clients.map(({ name, step, pct, col }) => (
                <div key={name} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 flex-shrink-0">
                    {name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-slate-800 truncate">{name}</div>
                    <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full" style={{ background: col + '22', color: col }}>
                      {step}
                    </span>
                  </div>
                  <div className="flex-shrink-0 w-20">
                    <div className="flex justify-between mb-1">
                      <span className="text-[9px] text-slate-400">Docs</span>
                      <span className="text-[9px] font-semibold text-slate-600">{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: col }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── HERO ─────────────────────────────────────────────────────────────────────

function HeroSection({ onContact }: { onContact: () => void }) {
  return (
    <section className="relative flex flex-col items-center justify-start pt-28 pb-20 px-4 overflow-hidden min-h-screen" style={{ background: '#0F172A' }}>
      {/* Glow */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 80% 40% at 50% -10%, rgba(59,130,246,0.18), transparent)'
      }} />

      <div className="relative z-10 text-center w-full max-w-4xl mx-auto">
        <div className="hero-in delay-1 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-600/15 border border-blue-500/30 text-blue-300 text-sm font-medium mb-8">
          🇵🇹 Feito para mediadores de crédito portugueses
        </div>

        <h1 className="hero-in delay-2 text-4xl sm:text-5xl lg:text-[3.6rem] font-extrabold text-white leading-[1.1] tracking-tight mb-6">
          A plataforma que os seus clientes{' '}
          <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg,#93C5FD,#3B82F6)' }}>
            vão adorar.
          </span>
          <br className="hidden sm:block" />
          {' '}E que vai simplificar o seu trabalho.
        </h1>

        <p className="hero-in delay-3 text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed mb-10">
          Recolha documentos, compare propostas bancárias e apresente um mapa comparativo profissional — tudo numa plataforma moderna e segura.
        </p>

        <div className="hero-in delay-4 flex flex-col sm:flex-row items-center justify-center gap-3 mb-4">
          <Link href="/login" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-4 rounded-xl text-base transition-all shadow-lg shadow-blue-600/30 hover:scale-[1.02]">
            Começar gratuitamente
            <ArrowRight className="h-4 w-4" />
          </Link>
          <button onClick={onContact} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-white/20 hover:border-white/40 text-white font-semibold px-8 py-4 rounded-xl text-base transition-all hover:bg-white/5">
            Ver demonstração
          </button>
        </div>

        <p className="hero-in delay-4 text-slate-500 text-sm mb-16">
          Sem cartão de crédito. Cancelamento a qualquer momento.
        </p>

        {/* Browser mockup */}
        <div className="hero-in delay-5 w-full flex justify-center overflow-x-auto pb-2">
          <div style={{ minWidth: 360 }}>
            <BrowserMockup />
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── SOCIAL PROOF ─────────────────────────────────────────────────────────────

function SocialProofBar() {
  const brands = ['Habitat Crédito', 'LisboaCredit', 'NorthCredit', 'PortoMediação', 'SunCredit', 'AtlanticoCredit'];
  return (
    <section className="py-12 border-y border-slate-200 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-center text-slate-400 text-sm font-medium mb-8 tracking-wide">
          Usado por mediadores de crédito em todo o país
        </p>
        <div className="flex flex-wrap items-center justify-center gap-8 lg:gap-14">
          {brands.map((b) => (
            <span key={b} className="text-slate-300 text-xs font-bold tracking-[0.15em] uppercase select-none">
              {b}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── PHONE MOCKUP ─────────────────────────────────────────────────────────────

function PhoneMockup() {
  return (
    <div className="flex justify-center">
      <div className="relative rounded-[2.5rem] border-[7px] border-slate-800 overflow-hidden shadow-2xl bg-white" style={{ width: 272 }}>
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-5 bg-slate-800 rounded-b-2xl z-10" />

        <div style={{ paddingTop: 24 }}>
          {/* Office header */}
          <div className="flex items-center gap-2 px-3 py-2.5" style={{ background: '#1E3A5F' }}>
            <div className="w-6 h-6 bg-blue-500 rounded-lg flex items-center justify-center">
              <Home className="h-3 w-3 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-white text-xs font-semibold">Monsanto Brokers</span>
          </div>

          <div className="px-4 py-4 bg-white">
            <h3 className="text-slate-900 text-sm font-bold mb-0.5">Olá, João Martins 👋</h3>
            <p className="text-slate-400 text-xs mb-4">Complete os seus documentos</p>

            <div className="bg-blue-50 rounded-xl p-3 mb-4">
              <div className="flex justify-between mb-1.5">
                <span className="text-blue-800 text-xs font-semibold">5 de 8 documentos</span>
                <span className="text-blue-600 text-xs font-bold">62%</span>
              </div>
              <div className="h-2 bg-blue-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: '62%' }} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-100 rounded-xl">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-green-100 rounded-lg flex items-center justify-center">
                    <FileText className="h-3.5 w-3.5 text-green-600" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-800">BI / Cartão de Cidadão</div>
                    <div className="text-[10px] text-slate-400">1 ficheiro</div>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-green-100 text-green-700 rounded-full">✓ Aprovado</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-100 rounded-xl">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center">
                    <FileText className="h-3.5 w-3.5 text-amber-600" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-800">Declaração de IRS</div>
                    <div className="text-[10px] text-slate-400">1 ficheiro</div>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">Em análise</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center">
                    <FileText className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-800">Extratos Bancários</div>
                    <div className="text-[10px] text-slate-400">Aguarda envio</div>
                  </div>
                </div>
                <button className="text-[10px] font-bold px-2.5 py-1 bg-blue-600 text-white rounded-lg">Carregar</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── FEATURE: DOCUMENTS ───────────────────────────────────────────────────────

function DocumentsFeature() {
  return (
    <section id="funcionalidades" className="py-24 px-4 bg-white">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
        <div className="animate-on-scroll">
          <Badge>Recolha de Documentos</Badge>
          <h2 className="mt-5 text-3xl lg:text-4xl font-extrabold text-slate-900 leading-[1.15] tracking-tight">
            O seu cliente carrega os documentos. Você aprova.
          </h2>
          <p className="mt-4 text-slate-500 text-lg leading-relaxed">
            Envie um link único ao cliente. Ele carrega os documentos necessários diretamente no portal — sem login, sem confusão. Você recebe, analisa e aprova com um clique.
          </p>
          <ul className="mt-8 space-y-3.5">
            <Feature>Portal do cliente sem login necessário</Feature>
            <Feature>Lista de documentos pré-configurada por tipo de processo</Feature>
            <Feature>Aprovação e rejeição com motivo detalhado</Feature>
            <Feature>Download de todos os documentos em ZIP</Feature>
            <Feature>Assinatura digital do consentimento RGPD</Feature>
            <Feature>Notificações automáticas ao cliente</Feature>
          </ul>
        </div>
        <div className="animate-on-scroll" style={{ transitionDelay: '120ms' }}>
          <PhoneMockup />
        </div>
      </div>
    </section>
  );
}

// ─── COMPARISON MOCKUP ────────────────────────────────────────────────────────

function ComparisonMockup() {
  const banks = [
    { name: 'CGD',       rec: false },
    { name: 'BPI',       rec: false },
    { name: 'Novo Banco', rec: true  },
  ];

  function Row({ label, vals, best }: { label: string; vals: string[]; best?: number }) {
    return (
      <div className="flex border-b border-slate-100 last:border-0">
        <div className="flex-shrink-0 w-32 px-3 py-2.5 text-[11px] font-medium text-slate-500 bg-slate-50/80 border-r border-slate-100">
          {label}
        </div>
        {vals.map((v, i) => (
          <div key={i} className={`flex-1 px-3 py-2.5 text-[11px] font-semibold text-center border-r border-slate-100 last:border-0 ${
            best === i ? 'text-green-700 bg-green-50' : 'text-slate-700'
          }`}>
            {v}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden" style={{ maxWidth: 520 }}>
      {/* Bank header */}
      <div className="flex">
        <div className="flex-shrink-0 w-32 bg-slate-50" />
        {banks.map((b) => (
          <div key={b.name} className={`flex-1 py-3 text-center border-l border-slate-200 ${b.rec ? 'bg-blue-600' : 'bg-[#1E3A5F]'}`}>
            {b.rec && <div className="text-[10px] text-blue-200 font-semibold mb-0.5">⭐ Recomendado</div>}
            <div className="text-white text-sm font-bold">{b.name}</div>
          </div>
        ))}
      </div>

      {/* Empréstimo */}
      <div className="border-l-4 border-blue-600">
        <div className="px-3 py-2 bg-[#1E3A5F]">
          <span className="text-white text-xs font-semibold">Informação do Empréstimo</span>
        </div>
        <Row label="Montante" vals={['250.000 €', '250.000 €', '250.000 €']} />
        <Row label="TAN" vals={['3,4%', '3,2%', '2,9%']} best={2} />
        <Row label="Spread" vals={['1,2%', '1,0%', '0,7%']} best={2} />
        <Row label="Prazo" vals={['30 anos', '30 anos', '30 anos']} />
      </div>

      {/* Seguros */}
      <div className="border-l-4 border-violet-500 mt-0.5">
        <div className="px-3 py-2 bg-[#1E3A5F]">
          <span className="text-white text-xs font-semibold">Seguros</span>
        </div>
        <Row label="Vida" vals={['45 €', '38 €', '32 €']} best={2} />
        <Row label="Multirriscos" vals={['18 €', '15 €', '12 €']} best={2} />
      </div>

      {/* Prestação Total */}
      <div className="border-l-4 border-slate-600 mt-0.5">
        <div className="px-3 py-2 bg-slate-800">
          <span className="text-white text-xs font-semibold">Prestação Total</span>
        </div>
        <div className="flex">
          <div className="flex-shrink-0 w-32 px-3 py-3 text-[11px] font-medium text-slate-400 bg-slate-800 border-r border-slate-700">Prestação</div>
          {[
            { v: '1.234 €', rec: false },
            { v: '1.189 €', rec: false },
            { v: '1.098 €', rec: true  },
          ].map(({ v, rec }, i) => (
            <div key={i} className={`flex-1 px-3 py-3 text-sm font-bold text-center border-r border-slate-700 last:border-0 ${
              rec ? 'bg-green-600 text-white' : 'bg-slate-800 text-white'
            }`}>
              {v}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── FEATURE: PROPOSTAS ───────────────────────────────────────────────────────

function PropostasFeature() {
  return (
    <section className="py-24 px-4 bg-slate-50">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
        <div className="animate-on-scroll order-2 lg:order-1 flex justify-start">
          <ComparisonMockup />
        </div>
        <div className="animate-on-scroll order-1 lg:order-2" style={{ transitionDelay: '120ms' }}>
          <Badge>Mapa Comparativo</Badge>
          <h2 className="mt-5 text-3xl lg:text-4xl font-extrabold text-slate-900 leading-[1.15] tracking-tight">
            Compare bancos como um profissional. Apresente como uma consultora.
          </h2>
          <p className="mt-4 text-slate-500 text-lg leading-relaxed">
            Adicione as propostas de cada banco, configure os seguros e gere um mapa comparativo visual e profissional para partilhar com o seu cliente.
          </p>
          <ul className="mt-8 space-y-3.5">
            <Feature>Comparação lado a lado de até 6 bancos</Feature>
            <Feature>Seguros do banco vs seguros externos</Feature>
            <Feature>Prestação total recomendada automática</Feature>
            <Feature>MTIC e encargos únicos detalhados</Feature>
            <Feature>Gráficos de análise interativos</Feature>
            <Feature>Export para Excel e PDF com marca do escritório</Feature>
            <Feature>Portal do cliente com análise visual</Feature>
          </ul>
        </div>
      </div>
    </section>
  );
}

// ─── FEATURE: PIPELINE ────────────────────────────────────────────────────────

function PipelineFeature() {
  const cards = [
    {
      emoji: '🗂️',
      title: 'Vista Kanban',
      desc: 'Visualize todos os processos por etapa. Arraste para avançar.',
    },
    {
      emoji: '📊',
      title: 'Dashboard com KPIs',
      desc: 'Processos ativos, documentos por rever e alertas de atenção num relance.',
    },
    {
      emoji: '🔔',
      title: 'Alertas inteligentes',
      desc: 'Saiba quando um cliente não enviou documentos há vários dias.',
    },
  ];

  return (
    <section className="py-24 px-4 bg-white">
      <div className="max-w-7xl mx-auto text-center">
        <div className="animate-on-scroll">
          <Badge>Gestão de Processos</Badge>
          <h2 className="mt-5 text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
            Toda a sua pipeline num relance.
          </h2>
          <p className="mt-4 text-slate-500 text-lg max-w-2xl mx-auto leading-relaxed">
            Vista de kanban ou lista. Avance processos por drag-and-drop. Nunca perca um cliente à espera.
          </p>
        </div>
        <div className="mt-16 grid md:grid-cols-3 gap-6">
          {cards.map(({ emoji, title, desc }, i) => (
            <div
              key={title}
              className="animate-on-scroll text-left p-8 bg-slate-50 rounded-2xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/40 transition-all"
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <div className="text-3xl mb-5">{emoji}</div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── FEATURE: SECURITY ────────────────────────────────────────────────────────

function SecurityFeature() {
  const cards = [
    {
      icon: Lock,
      title: 'Dados na Europa',
      desc: 'Infraestrutura certificada com dados armazenados na União Europeia.',
    },
    {
      icon: PenLine,
      title: 'Assinatura Digital',
      desc: 'Consentimento RGPD com assinatura digital e registo de IP e data.',
    },
    {
      icon: ClipboardList,
      title: 'Audit Trail',
      desc: 'Registo de todas as ações para total transparência e compliance.',
    },
  ];

  return (
    <section className="py-24 px-4" style={{ background: '#0F172A' }}>
      <div className="max-w-7xl mx-auto text-center">
        <div className="animate-on-scroll">
          <Badge inverted>Segurança &amp; RGPD</Badge>
          <h2 className="mt-5 text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
            Compliance sem esforço.
          </h2>
          <p className="mt-4 text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed">
            A plataforma gere o consentimento RGPD, assinaturas digitais e audit trail por si. Os seus clientes estão protegidos. Você está protegido.
          </p>
        </div>
        <div className="mt-16 grid md:grid-cols-3 gap-6">
          {cards.map(({ icon: Icon, title, desc }, i) => (
            <div
              key={title}
              className="animate-on-scroll text-left p-8 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/[0.08] transition-all"
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center mb-5">
                <Icon className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── PRICING ─────────────────────────────────────────────────────────────────

interface PlanProps {
  name: string;
  price: string;
  period?: string;
  desc: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
  badge?: string;
  onCta: () => void;
}

function PricingCard({ name, price, period, desc, features, cta, highlighted, badge, onCta }: PlanProps) {
  return (
    <div className={`pricing-card relative flex flex-col p-8 rounded-2xl border ${
      highlighted ? 'border-blue-500 bg-white shadow-xl shadow-blue-500/10 ring-1 ring-blue-500/20' : 'border-slate-200 bg-white'
    }`}>
      {badge && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <span className="px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-full shadow">{badge}</span>
        </div>
      )}
      <div>
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{name}</div>
        <div className="mt-3 flex items-end gap-1">
          <span className="text-4xl font-extrabold text-slate-900 tracking-tight">{price}</span>
          {period && <span className="text-slate-400 text-sm mb-1.5">{period}</span>}
        </div>
        <p className="text-slate-500 text-sm mt-1.5">{desc}</p>
      </div>
      <ul className="mt-8 space-y-3 flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2.5">
            <Check className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" strokeWidth={2.5} />
            <span className="text-slate-600 text-sm leading-snug">{f}</span>
          </li>
        ))}
      </ul>
      <button
        onClick={onCta}
        className={`mt-8 w-full py-3 rounded-xl text-sm font-semibold transition-colors ${
          highlighted ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md' : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
        }`}
      >
        {cta}
      </button>
    </div>
  );
}

function PricingSection({ onContact }: { onContact: () => void }) {
  function goLogin() { window.location.href = '/login'; }

  return (
    <section id="precos" className="py-24 px-4 bg-slate-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center animate-on-scroll mb-16">
          <Badge>Preços</Badge>
          <h2 className="mt-5 text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
            Simples. Transparente. Sem surpresas.
          </h2>
          <p className="mt-4 text-slate-500 text-lg">Comece gratuitamente. Escale quando precisar.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 items-start">
          <div className="animate-on-scroll md:order-1 order-2" style={{ transitionDelay: '0ms' }}>
            <PricingCard
              name="Starter"
              price="Grátis"
              desc="Para começar sem risco."
              features={['5 processos ativos','1 mediador','Portal do cliente','Recolha de documentos','Assinatura RGPD digital','Suporte por email']}
              cta="Começar grátis"
              onCta={goLogin}
            />
          </div>
          <div className="animate-on-scroll md:order-2 order-1" style={{ transitionDelay: '80ms' }}>
            <PricingCard
              name="Pro"
              price="49€"
              period="/mês"
              desc="Para mediadores ativos."
              features={['Processos ilimitados','Até 3 mediadores','Tudo do Starter +','Propostas e Mapa Comparativo','Análise visual com gráficos','Export Excel e PDF','Notificações automáticas','Suporte prioritário']}
              cta="Começar grátis — 14 dias de trial"
              highlighted
              badge="Mais popular"
              onCta={goLogin}
            />
          </div>
          <div className="animate-on-scroll md:order-3 order-3" style={{ transitionDelay: '160ms' }}>
            <PricingCard
              name="Business"
              price="149€"
              period="/mês"
              desc="Para escritórios e equipas."
              features={['Processos ilimitados','Mediadores ilimitados','Tudo do Pro +','White-label (logo e cores)','Multi-escritório','Análise IA (em breve) 🔜','Gestor de conta dedicado','SLA garantido']}
              cta="Falar com a equipa"
              onCta={onContact}
            />
          </div>
        </div>

        <p className="text-center text-slate-400 text-sm mt-10 animate-on-scroll">
          Todos os planos incluem SSL, backups automáticos e atualizações gratuitas.
        </p>
      </div>
    </section>
  );
}

// ─── COMING SOON ──────────────────────────────────────────────────────────────

function ComingSoonSection() {
  const items = [
    { icon: Bot,         title: 'Análise IA de Documentos', desc: 'Validação automática de documentos com inteligência artificial.' },
    { icon: Sparkles,    title: 'Análise IA de Propostas',  desc: 'Compare propostas automaticamente e receba recomendações baseadas no perfil do cliente.' },
    { icon: MessageSquare, title: 'CRM Integrado',          desc: 'Gestão completa do relacionamento com clientes e pipeline comercial.' },
    { icon: Building2,   title: 'Gestão de Bancos',         desc: 'Pedidos de propostas e gestão do relacionamento com instituições bancárias diretamente na plataforma.' },
  ];

  return (
    <section className="soon-grid py-24 px-4" style={{ background: '#0F172A' }}>
      <div className="max-w-7xl mx-auto text-center">
        <div className="animate-on-scroll">
          <Badge inverted>Em breve</Badge>
          <h2 className="mt-5 text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
            Ainda há mais a caminho.
          </h2>
        </div>

        <div className="mt-16 grid sm:grid-cols-2 gap-6 text-left">
          {items.map(({ icon: Icon, title, desc }, i) => (
            <div
              key={title}
              className="animate-on-scroll p-8 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/[0.08] transition-all relative"
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <div className="absolute top-5 right-5 text-[10px] font-semibold px-2.5 py-1 rounded-full bg-blue-600/20 text-blue-300 border border-blue-500/30">
                🔜 Em breve
              </div>
              <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center mb-5">
                <Icon className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── CTA ──────────────────────────────────────────────────────────────────────

function CTASection({ onContact }: { onContact: () => void }) {
  return (
    <section className="py-24 px-4" style={{ background: 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)' }}>
      <div className="max-w-3xl mx-auto text-center animate-on-scroll">
        <h2 className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight mb-4">
          Pronto para transformar o seu escritório?
        </h2>
        <p className="text-blue-100 text-lg mb-10 leading-relaxed">
          Junte-se aos mediadores que já trabalham de forma mais inteligente.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 bg-white hover:bg-blue-50 text-blue-700 font-semibold px-8 py-4 rounded-xl text-base transition-all shadow-lg"
          >
            Começar gratuitamente
            <ArrowRight className="h-4 w-4" />
          </Link>
          <button
            onClick={onContact}
            className="inline-flex items-center justify-center border-2 border-white/40 hover:border-white/80 text-white font-semibold px-8 py-4 rounded-xl text-base transition-all"
          >
            Falar connosco
          </button>
        </div>
      </div>
    </section>
  );
}

// ─── FOOTER ───────────────────────────────────────────────────────────────────

function Footer({ onContact }: { onContact: () => void }) {
  type FooterLink = { label: string; href?: string; action?: () => void };

  const produto: FooterLink[] = [
    { label: 'Funcionalidades', href: '#funcionalidades' },
    { label: 'Preços',          href: '#precos' },
    { label: 'Segurança',       href: '#funcionalidades' },
    { label: 'Documentação',    href: '#' },
  ];
  const empresa: FooterLink[] = [
    { label: 'Sobre',       href: '#' },
    { label: 'Contacto',    action: onContact },
    { label: 'Privacidade', href: '/privacy' },
    { label: 'Termos',      href: '#' },
  ];

  function LinkOrBtn({ item }: { item: FooterLink }) {
    if (item.action) {
      return (
        <button onClick={item.action} className="text-slate-400 hover:text-white text-sm transition-colors text-left">
          {item.label}
        </button>
      );
    }
    return (
      <a href={item.href} className="text-slate-400 hover:text-white text-sm transition-colors">
        {item.label}
      </a>
    );
  }

  return (
    <footer className="py-16 px-4" style={{ background: '#0F172A' }}>
      <div className="max-w-7xl mx-auto">
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-10 mb-14">
          <div>
            <Logo white />
            <p className="mt-4 text-slate-400 text-sm leading-relaxed max-w-xs">
              A plataforma para mediadores de crédito modernos.
            </p>
            <div className="mt-6">
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-9 h-9 bg-white/10 hover:bg-white/20 rounded-lg items-center justify-center transition-colors"
                aria-label="LinkedIn"
              >
                <svg className="h-4 w-4 text-slate-400 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-white text-sm font-semibold mb-5">Produto</h4>
            <ul className="space-y-3">
              {produto.map((item) => <li key={item.label}><LinkOrBtn item={item} /></li>)}
            </ul>
          </div>

          <div>
            <h4 className="text-white text-sm font-semibold mb-5">Empresa</h4>
            <ul className="space-y-3">
              {empresa.map((item) => <li key={item.label}><LinkOrBtn item={item} /></li>)}
            </ul>
          </div>

          <div>
            <h4 className="text-white text-sm font-semibold mb-5">Sobre</h4>
            <p className="text-slate-400 text-sm leading-relaxed">
              HomeFlux é uma plataforma SaaS criada para mediadores de crédito habitação em Portugal.
            </p>
          </div>
        </div>

        <div className="border-t border-white/10 pt-8 text-center">
          <p className="text-slate-500 text-sm">
            © 2026 HomeFlux. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}

// ─── CONTACT MODAL ────────────────────────────────────────────────────────────

interface FormState { name: string; email: string; office: string; message: string; }

function ContactModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form, setForm] = useState<FormState>({ name: '', email: '', office: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(field: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          onClose();
          setForm({ name: '', email: '', office: '', message: '' });
        }, 2800);
      } else {
        setError('Ocorreu um erro. Por favor tente novamente.');
      }
    } catch {
      setError('Ocorreu um erro. Por favor tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  const inputCls = 'w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-400 transition-all';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
          <X className="h-4 w-4" />
        </button>

        {success ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-green-600" strokeWidth={2.5} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Mensagem enviada!</h3>
            <p className="text-slate-500 text-sm">Entraremos em contacto brevemente.</p>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-slate-900 mb-1">Fale connosco</h2>
            <p className="text-slate-500 text-sm mb-6">Responderemos em menos de 24 horas.</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nome *</label>
                  <input required value={form.name} onChange={update('name')} className={inputCls} placeholder="O seu nome" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email *</label>
                  <input required type="email" value={form.email} onChange={update('email')} className={inputCls} placeholder="email@escritorio.pt" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Escritório</label>
                <input value={form.office} onChange={update('office')} className={inputCls} placeholder="Nome do escritório" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Mensagem *</label>
                <textarea required rows={4} value={form.message} onChange={update('message')} className={`${inputCls} resize-none`} placeholder="Como podemos ajudar?" />
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl">
                  <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl text-sm transition-colors">
                {loading ? 'A enviar...' : 'Enviar mensagem'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default function MarketingPage() {
  const [contactOpen, setContactOpen] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('visible');
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );
    document.querySelectorAll('.animate-on-scroll').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const openContact = () => setContactOpen(true);

  return (
    <>
      <style>{STYLES}</style>
      <div className="min-h-screen overflow-x-hidden font-sans">
        <Navbar onContact={openContact} />
        <main>
          <HeroSection    onContact={openContact} />
          <SocialProofBar />
          <DocumentsFeature />
          <PropostasFeature />
          <PipelineFeature />
          <SecurityFeature />
          <PricingSection onContact={openContact} />
          <ComingSoonSection />
          <CTASection     onContact={openContact} />
        </main>
        <Footer onContact={openContact} />
        <ContactModal open={contactOpen} onClose={() => setContactOpen(false)} />
      </div>
    </>
  );
}
