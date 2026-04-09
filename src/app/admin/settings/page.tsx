import { PLATFORM_DEFAULTS } from '@/lib/settings';
import { Info, Settings } from 'lucide-react';

const SETTING_LABELS: Record<string, string> = {
  portal_enabled: 'Portal do Cliente ativo',
  documents_tab_enabled: 'Tab Documentos visível',
  propostas_tab_enabled: 'Tab Propostas visível',
  charts_enabled: 'Gráficos ativos',
  chart_monthly_bar: 'Gráfico — Prestação Mensal',
  chart_total_cost: 'Gráfico — Custo Total',
  max_clients: 'Máximo de Processos por Escritório',
  max_propostas_per_client: 'Máximo de Propostas por Processo',
  rgpd_text: 'Texto RGPD personalizado',
};

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Settings className="h-6 w-6" />
          Configurações Globais
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Padrões da plataforma. Os escritórios e mediadores podem substituir estes valores.
        </p>
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 flex gap-3">
        <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-semibold mb-1">Cascata de Configurações</p>
          <p>
            <span className="font-medium">Plataforma</span>
            {' → '}
            <span className="font-medium">Escritório</span>
            {' → '}
            <span className="font-medium">Mediador</span>
          </p>
          <p className="mt-1 text-blue-700">
            Cada nível pode substituir o anterior. Os padrões da plataforma aplicam-se a todos os
            escritórios que não tenham configurações próprias.
          </p>
        </div>
      </div>

      <div className="rounded-lg border">
        <div className="px-4 py-3 border-b bg-slate-50">
          <h2 className="font-semibold text-sm">Padrões da Plataforma (só de leitura)</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Para alterar, modifique <code className="font-mono">src/lib/settings.ts</code>.
          </p>
        </div>
        <div className="divide-y">
          {Object.entries(PLATFORM_DEFAULTS).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-slate-600">
                {SETTING_LABELS[key] ?? key}
              </span>
              <span className="text-sm font-medium text-slate-900">
                {value === null
                  ? <span className="text-muted-foreground">—</span>
                  : typeof value === 'boolean'
                  ? (
                    <span className={value ? 'text-green-600' : 'text-slate-400'}>
                      {value ? 'Ativo' : 'Inativo'}
                    </span>
                  )
                  : String(value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
