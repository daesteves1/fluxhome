import { createServiceClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { LeadCaptureForm } from './lead-capture-form';
import { safeAccentColor, rawAccentColor } from '@/lib/color-utils';
import type { Metadata } from 'next';
import { AlertCircle, Shield, Lock, ClipboardList, Search, CheckCircle2 } from 'lucide-react';

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ utm_source?: string; utm_medium?: string; utm_campaign?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const serviceClient = await createServiceClient();
  const { data } = await serviceClient
    .from('offices')
    .select('name, lead_capture_headline')
    .eq('slug', slug)
    .single();

  if (!data) return { title: 'Simulação de Crédito Habitação' };
  const office = data as { name: string; lead_capture_headline: string | null };
  const headline = office.lead_capture_headline ?? 'Encontre o melhor crédito habitação';
  return {
    title: `${headline} — ${office.name}`,
    description: `${office.name} — Comparamos propostas dos principais bancos sem custos.`,
  };
}

type OfficeRow = {
  id: string;
  name: string;
  lead_capture_enabled: boolean;
  lead_capture_hero_title: string | null;
  lead_capture_hero_subtitle: string | null;
  lead_capture_primary_color: string | null;
  lead_capture_logo_url: string | null;
  bdp_intermediario_number: string | null;
  lead_capture_headline: string | null;
  lead_capture_subheadline: string | null;
  lead_capture_cta_label: string | null;
  lead_capture_show_bank_logos: boolean;
  website_url: string | null;
  office_nif: string | null;
  office_address: string | null;
};

async function fetchOffice(slug: string): Promise<OfficeRow | null> {
  const serviceClient = await createServiceClient();
  try {
    const { data } = await serviceClient
      .from('offices')
      .select(
        'id, name, lead_capture_enabled, lead_capture_hero_title, lead_capture_hero_subtitle, lead_capture_primary_color, lead_capture_logo_url, bdp_intermediario_number, lead_capture_headline, lead_capture_subheadline, lead_capture_cta_label, lead_capture_show_bank_logos, website_url, office_nif, office_address'
      )
      .eq('slug', slug)
      .single();
    return data as OfficeRow | null;
  } catch {
    // Migration 017 columns may not exist yet — fall back to base columns
    try {
      const { data } = await serviceClient
        .from('offices')
        .select('id, name, lead_capture_enabled, lead_capture_hero_title, lead_capture_hero_subtitle, lead_capture_primary_color, lead_capture_logo_url, bdp_intermediario_number')
        .eq('slug', slug)
        .single();
      if (!data) return null;
      const base = data as Omit<OfficeRow, 'lead_capture_headline' | 'lead_capture_subheadline' | 'lead_capture_cta_label' | 'lead_capture_show_bank_logos' | 'website_url' | 'office_nif' | 'office_address'>;
      return {
        ...base,
        lead_capture_headline: null,
        lead_capture_subheadline: null,
        lead_capture_cta_label: null,
        lead_capture_show_bank_logos: true,
        website_url: null,
        office_nif: null,
        office_address: null,
      };
    } catch {
      return null;
    }
  }
}

const HOW_IT_WORKS = [
  {
    Icon: ClipboardList,
    title: 'Preenche o pedido',
    desc: 'Leva cerca de 2 minutos',
  },
  {
    Icon: Search,
    title: 'Analisamos o seu caso',
    desc: 'Comparamos propostas de vários bancos',
  },
  {
    Icon: CheckCircle2,
    title: 'Recebe as melhores propostas',
    desc: 'Sem custos, sem compromisso',
  },
];

export default async function LeadCapturePage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const sp = await searchParams;

  const office = await fetchOffice(slug);

  if (!office) notFound();

  if (!office.lead_capture_enabled) notFound();

  if (!office.bdp_intermediario_number) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-8">
        <div className="text-center max-w-sm">
          <AlertCircle className="h-10 w-10 text-amber-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold">Página em configuração</h1>
          <p className="text-sm text-slate-500 mt-2">
            Esta página ainda não está disponível. O número de intermediário BdP não foi configurado.
          </p>
        </div>
      </div>
    );
  }

  const rawColor = office.lead_capture_primary_color ?? '#0f172a';
  const accent = rawAccentColor(rawColor);
  const safe = safeAccentColor(rawColor);

  const headline = office.lead_capture_headline ?? 'Encontre o melhor crédito habitação';
  const subheadline = office.lead_capture_subheadline ?? 'Comparamos propostas dos principais bancos. Sem custos, sem compromisso.';
  const ctaLabel = office.lead_capture_cta_label ?? 'Pedir análise gratuita';

  const footerParts: string[] = [`Intermediário de Crédito n.º ${office.bdp_intermediario_number}`];
  if (office.office_nif) footerParts.push(`NIF ${office.office_nif}`);
  if (office.office_address) footerParts.push(office.office_address);

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 lg:grid lg:grid-cols-[1fr_480px] lg:gap-20 lg:min-h-screen">

        {/* LEFT COLUMN */}
        <section className="lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto flex flex-col justify-center py-16">

          {/* Mobile compact hero */}
          <div className="lg:hidden py-10">
            {office.lead_capture_logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={office.lead_capture_logo_url}
                alt={office.name}
                className="max-h-8 w-auto object-contain mb-4"
              />
            )}
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">{headline}</h1>
            <p className="text-sm text-neutral-500 mt-2">{subheadline}</p>
            <span className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full bg-neutral-100 text-xs text-neutral-500 font-medium">
              Leva cerca de 2 minutos
            </span>
          </div>

          {/* Desktop full left panel */}
          <div className="hidden lg:flex flex-col gap-10">

            {/* Logo */}
            {office.lead_capture_logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={office.lead_capture_logo_url}
                alt={office.name}
                className="max-h-8 w-auto object-contain"
              />
            )}

            {/* Headline + sub */}
            <div>
              <h1 className="text-4xl font-semibold tracking-tight text-neutral-900">{headline}</h1>
              <p className="text-lg text-neutral-500 mt-3">{subheadline}</p>
            </div>

            {/* How it works */}
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-widest text-neutral-400">Como funciona</p>
              {HOW_IT_WORKS.map(({ Icon, title, desc }, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <div className="h-7 w-7 rounded-full flex items-center justify-center shrink-0 bg-neutral-100 text-neutral-900 text-xs font-bold">
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-800 flex items-center gap-1.5">
                      <Icon className="h-4 w-4 shrink-0 text-neutral-500" />
                      {title}
                    </p>
                    <p className="text-xs text-neutral-400 mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Trust block */}
            <div className="rounded-xl bg-neutral-50 p-5 space-y-2">
              <p className="text-xs text-neutral-500 flex gap-2 items-center">
                <Shield className="h-4 w-4 shrink-0 text-neutral-400" />
                Intermediário de Crédito n.º {office.bdp_intermediario_number} · Banco de Portugal
              </p>
              <p className="text-xs text-neutral-500 flex gap-2 items-center">
                <Lock className="h-4 w-4 shrink-0 text-neutral-400" />
                Dados tratados ao abrigo do RGPD
              </p>
            </div>

          </div>
        </section>

        {/* RIGHT COLUMN: form */}
        <div className="py-10 lg:py-16 flex flex-col justify-center">
          <LeadCaptureForm
            officeId={office.id}
            officeName={office.name}
            turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? null}
            accent={accent}
            safe={safe}
            ctaLabel={ctaLabel}
            websiteUrl={office.website_url}
            utmSource={sp.utm_source ?? null}
            utmMedium={sp.utm_medium ?? null}
            utmCampaign={sp.utm_campaign ?? null}
          />
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t bg-white py-6 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between gap-2 text-xs text-neutral-400">
            <span>{footerParts.join(' · ')}</span>
            <span>Powered by HomeFlux</span>
          </div>
          <div className="flex gap-4 mt-2 text-xs">
            <a href="/privacy" className="hover:text-neutral-600 transition-colors">
              Política de Privacidade
            </a>
            <a href="/terms" className="hover:text-neutral-600 transition-colors">
              Termos e Condições
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
