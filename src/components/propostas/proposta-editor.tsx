'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Star, Save, FileDown, Eye, EyeOff, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export type BankData = {
  name: string;
  highlight?: boolean;
  montante?: string;
  prazo?: string;
  tipo_taxa?: string;
  euribor?: string;
  spread?: string;
  tan?: string;
  prestacao?: string;
};

export type InsuranceData = {
  [bankName: string]: {
    vida: string;
    multirriscos: string;
    vida_ext: string;
    multirriscos_ext: string;
  };
};

export type ChargeRow = {
  label: string;
  [bankName: string]: string | boolean | undefined;
};

interface PropostaEditorProps {
  clientId: string;
  clientName: string;
  brokerId: string;
  propostaId?: string;
  defaultLoanAmount?: number | null;
  defaultTermMonths?: number | null;
  initialData?: {
    title: string;
    comparison_data: BankData[];
    insurance_data: InsuranceData;
    one_time_charges: ChargeRow[];
    monthly_charges: ChargeRow[];
    notes: string;
    is_visible_to_client: boolean;
  };
}

const DEFAULT_ONE_TIME_CHARGES = [
  'Comissão de avaliação',
  'Comissão de estudo',
  'Abertura do processo',
  'Comissão de formalização',
  'Comissão de solicitadoria',
  'Documento particular autenticado',
  'Imposto de selo sobre o mútuo',
  'Imposto de selo sobre aquisição',
  'IMT',
  'Registo',
  'Escritura',
  'Cheque bancário',
];

export function PropostaEditor({
  clientId,
  clientName,
  brokerId,
  propostaId,
  defaultLoanAmount,
  defaultTermMonths,
  initialData,
}: PropostaEditorProps) {
  const t = useTranslations('propostas');
  const router = useRouter();

  const [title, setTitle] = useState(initialData?.title ?? '');
  const [notes, setNotes] = useState(initialData?.notes ?? '');
  const [isVisible, setIsVisible] = useState(initialData?.is_visible_to_client ?? false);
  const [saving, setSaving] = useState(false);

  // Banks
  const [banks, setBanks] = useState<BankData[]>(
    initialData?.comparison_data ?? []
  );

  // Insurance
  const [insurance, setInsurance] = useState<InsuranceData>(
    initialData?.insurance_data ?? {}
  );

  // One-time charges
  const [oneTimeCharges, setOneTimeCharges] = useState<ChargeRow[]>(
    initialData?.one_time_charges ??
      DEFAULT_ONE_TIME_CHARGES.map((label) => ({ label }))
  );

  // Monthly charges
  const [monthlyCharges, setMonthlyCharges] = useState<ChargeRow[]>(
    initialData?.monthly_charges ?? [{ label: 'Manutenção de Conta' }]
  );

  function addBank() {
    const newBank: BankData = {
      name: `Banco ${banks.length + 1}`,
      montante: defaultLoanAmount?.toString() ?? '',
      prazo: defaultTermMonths?.toString() ?? '',
    };
    setBanks([...banks, newBank]);
  }

  function removeBank(idx: number) {
    const removed = banks[idx];
    setBanks(banks.filter((_, i) => i !== idx));
    // Remove from insurance
    const newIns = { ...insurance };
    delete newIns[removed.name];
    setInsurance(newIns);
  }

  function updateBank(idx: number, field: keyof BankData, value: string | boolean) {
    const updated = [...banks];
    const oldName = updated[idx].name;
    updated[idx] = { ...updated[idx], [field]: value };

    // If name changed, update insurance key
    if (field === 'name' && typeof value === 'string') {
      const newIns = { ...insurance };
      if (newIns[oldName]) {
        newIns[value] = newIns[oldName];
        delete newIns[oldName];
      }
      // Also update charge rows
      const updateCharges = (rows: ChargeRow[]) =>
        rows.map((r) => {
          const newRow = { ...r };
          if (oldName in newRow) {
            newRow[value] = newRow[oldName];
            delete newRow[oldName];
          }
          return newRow;
        });
      setOneTimeCharges(updateCharges(oneTimeCharges));
      setMonthlyCharges(updateCharges(monthlyCharges));
      setInsurance(newIns);
    }

    setBanks(updated);
  }

  function updateInsurance(
    bankName: string,
    field: 'vida' | 'multirriscos' | 'vida_ext' | 'multirriscos_ext',
    value: string
  ) {
    setInsurance((prev) => {
      const existing = prev[bankName] ?? { vida: '', multirriscos: '', vida_ext: '', multirriscos_ext: '' };
      return {
        ...prev,
        [bankName]: { ...existing, [field]: value },
      };
    });
  }

  function updateCharge(
    charges: ChargeRow[],
    setCharges: (r: ChargeRow[]) => void,
    rowIdx: number,
    bankName: string,
    value: string
  ) {
    const updated = [...charges];
    updated[rowIdx] = { ...updated[rowIdx], [bankName]: value };
    setCharges(updated);
  }

  function getInsVal(bankName: string, field: keyof InsuranceData[string]): string {
    return insurance[bankName]?.[field] ?? '';
  }

  function calcSubtotalBank(bankName: string): string {
    const ins = insurance[bankName];
    if (!ins) return '';
    const bank = banks.find((b) => b.name === bankName);
    const prestacao = parseFloat(bank?.prestacao ?? '0') || 0;
    const vida = parseFloat(ins.vida) || 0;
    const multi = parseFloat(ins.multirriscos) || 0;
    return (prestacao + vida + multi).toFixed(2);
  }

  function calcSubtotalExt(bankName: string): string {
    const ins = insurance[bankName];
    if (!ins) return '';
    const bank = banks.find((b) => b.name === bankName);
    const prestacao = parseFloat(bank?.prestacao ?? '0') || 0;
    const vida = parseFloat(ins.vida_ext) || 0;
    const multi = parseFloat(ins.multirriscos_ext) || 0;
    return (prestacao + vida + multi).toFixed(2);
  }

  function calcTotalOneTime(bankName: string): string {
    const total = oneTimeCharges.reduce((sum, row) => {
      return sum + (parseFloat(row[bankName] as string) || 0);
    }, 0);
    return total > 0 ? total.toFixed(2) : '';
  }

  async function save(andRedirect = false) {
    setSaving(true);
    try {
      const payload = {
        title,
        broker_id: brokerId,
        comparison_data: banks,
        insurance_data: insurance,
        one_time_charges: oneTimeCharges,
        monthly_charges: monthlyCharges,
        notes,
        is_visible_to_client: isVisible,
      };

      let res: Response;
      if (propostaId) {
        res = await fetch(`/api/clients/${clientId}/propostas/${propostaId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`/api/clients/${clientId}/propostas`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        toast.success('Proposta guardada');
        if (andRedirect) {
          router.push(`/dashboard/clients/${clientId}`);
        } else if (!propostaId) {
          const { id } = await res.json();
          router.replace(`/dashboard/clients/${clientId}/propostas/${id}`);
        }
      } else {
        toast.error('Erro ao guardar proposta');
      }
    } finally {
      setSaving(false);
    }
  }

  const inputClass = 'h-8 text-sm px-2 border border-input rounded-md w-full';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/dashboard/clients/${clientId}`}>
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h2 className="text-xl font-semibold">
              {propostaId ? t('editProposta') : t('addProposta')}
            </h2>
            <p className="text-sm text-muted-foreground">{clientName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            {isVisible ? <Eye className="h-4 w-4 text-muted-foreground" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
            <Switch checked={isVisible} onCheckedChange={setIsVisible} />
            <span className="text-sm text-muted-foreground">
              {isVisible ? t('visibleToClient') : t('hiddenFromClient')}
            </span>
          </div>
          <Button onClick={() => save(true)} disabled={saving} size="sm">
            <Save className="h-4 w-4 mr-1.5" />
            {t('saveProposta')}
          </Button>
        </div>
      </div>

      {/* Title + Notes */}
      <Card className="shadow-sm">
        <CardContent className="pt-4 space-y-4">
          <div className="space-y-2">
            <Label>{t('propostaTitle')}</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Proposta Comparativa — Março 2025" />
          </div>
        </CardContent>
      </Card>

      {/* Bank comparison table */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3 flex-row items-center justify-between">
          <CardTitle className="text-base">{t('banks')}</CardTitle>
          <Button size="sm" variant="outline" onClick={addBank}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            {t('addBank')}
          </Button>
        </CardHeader>
        <CardContent>
          {banks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Adicione pelo menos um banco para começar.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr>
                    <th className="text-left py-2 pr-4 font-medium text-muted-foreground w-48">Campo</th>
                    {banks.map((bank, idx) => (
                      <th key={idx} className="py-2 px-2 min-w-36">
                        <div className="flex items-center gap-1">
                          <input
                            className={cn(inputClass, bank.highlight && 'ring-2 ring-primary border-primary')}
                            value={bank.name}
                            onChange={(e) => updateBank(idx, 'name', e.target.value)}
                          />
                          <button
                            onClick={() => updateBank(idx, 'highlight', !bank.highlight)}
                            className={cn('p-1 rounded', bank.highlight ? 'text-amber-500' : 'text-muted-foreground')}
                            title="Destacar melhor opção"
                          >
                            <Star className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => removeBank(idx)} className="p-1 text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[
                    { field: 'montante', label: t('montanteFinanciamento') },
                    { field: 'prazo', label: t('prazo') },
                    { field: 'tipo_taxa', label: t('tipoTaxa') },
                    { field: 'euribor', label: t('euribor') },
                    { field: 'spread', label: t('spread') },
                    { field: 'tan', label: t('tan') },
                    { field: 'prestacao', label: t('prestacaoMensal') },
                  ].map(({ field, label }) => (
                    <tr key={field}>
                      <td className="py-2 pr-4 text-muted-foreground font-medium">{label}</td>
                      {banks.map((bank, idx) => (
                        <td key={idx} className="py-2 px-2">
                          <input
                            className={inputClass}
                            value={(bank[field as keyof BankData] as string) ?? ''}
                            onChange={(e) => updateBank(idx, field as keyof BankData, e.target.value)}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Insurance sections */}
      {banks.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t('segurosSection')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr>
                    <th className="text-left py-2 pr-4 font-medium text-muted-foreground w-48">Campo</th>
                    {banks.map((bank, idx) => (
                      <th key={idx} className="py-2 px-2 text-center font-medium min-w-36">{bank.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr><td colSpan={banks.length + 1} className="pt-4 pb-1 text-xs font-semibold uppercase text-muted-foreground">{t('bankInsurance')}</td></tr>
                  {[
                    { field: 'vida' as const, label: t('seguroVida') },
                    { field: 'multirriscos' as const, label: t('seguroMultirriscos') },
                  ].map(({ field, label }) => (
                    <tr key={field}>
                      <td className="py-2 pr-4 text-muted-foreground">{label}</td>
                      {banks.map((bank, idx) => (
                        <td key={idx} className="py-2 px-2">
                          <input
                            className={inputClass}
                            value={getInsVal(bank.name, field)}
                            onChange={(e) => updateInsurance(bank.name, field, e.target.value)}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr className="bg-muted/30">
                    <td className="py-2 pr-4 font-medium">{t('subtotalComSeguros')}</td>
                    {banks.map((bank, idx) => (
                      <td key={idx} className="py-2 px-2 text-center font-medium">{calcSubtotalBank(bank.name)}</td>
                    ))}
                  </tr>

                  <tr><td colSpan={banks.length + 1} className="pt-4 pb-1 text-xs font-semibold uppercase text-muted-foreground">{t('externalInsurance')}</td></tr>
                  {[
                    { field: 'vida_ext' as const, label: t('seguroVidaExternal') },
                    { field: 'multirriscos_ext' as const, label: t('seguroMultirriscos') },
                  ].map(({ field, label }) => (
                    <tr key={field}>
                      <td className="py-2 pr-4 text-muted-foreground">{label}</td>
                      {banks.map((bank, idx) => (
                        <td key={idx} className="py-2 px-2">
                          <input
                            className={inputClass}
                            value={getInsVal(bank.name, field)}
                            onChange={(e) => updateInsurance(bank.name, field, e.target.value)}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr className="bg-muted/30">
                    <td className="py-2 pr-4 font-medium">{t('subtotalComSegurosExternos')}</td>
                    {banks.map((bank, idx) => (
                      <td key={idx} className="py-2 px-2 text-center font-medium">{calcSubtotalExt(bank.name)}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* One-time charges */}
      {banks.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t('encargosUnicos')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr>
                    <th className="text-left py-2 pr-4 font-medium text-muted-foreground w-56">Encargo</th>
                    {banks.map((bank, idx) => (
                      <th key={idx} className="py-2 px-2 text-center font-medium min-w-36">{bank.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {oneTimeCharges.map((row, rowIdx) => (
                    <tr key={rowIdx}>
                      <td className="py-2 pr-4 text-muted-foreground">{row.label}</td>
                      {banks.map((bank, idx) => (
                        <td key={idx} className="py-2 px-2">
                          <input
                            className={inputClass}
                            value={(row[bank.name] as string) ?? ''}
                            onChange={(e) => updateCharge(oneTimeCharges, setOneTimeCharges, rowIdx, bank.name, e.target.value)}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr className="bg-muted/30 font-medium">
                    <td className="py-2 pr-4">{t('totalEncargosUnicos')}</td>
                    {banks.map((bank, idx) => (
                      <td key={idx} className="py-2 px-2 text-center">{calcTotalOneTime(bank.name)}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Monthly charges */}
      {banks.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t('encargosMonthly')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr>
                    <th className="text-left py-2 pr-4 font-medium text-muted-foreground w-56">Encargo</th>
                    {banks.map((bank, idx) => (
                      <th key={idx} className="py-2 px-2 text-center font-medium min-w-36">{bank.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {monthlyCharges.map((row, rowIdx) => (
                    <tr key={rowIdx}>
                      <td className="py-2 pr-4 text-muted-foreground">{row.label}</td>
                      {banks.map((bank, idx) => (
                        <td key={idx} className="py-2 px-2">
                          <input
                            className={inputClass}
                            value={(row[bank.name] as string) ?? ''}
                            onChange={(e) => updateCharge(monthlyCharges, setMonthlyCharges, rowIdx, bank.name, e.target.value)}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      <Card className="shadow-sm">
        <CardContent className="pt-4">
          <div className="space-y-2">
            <Label>{t('notes')}</Label>
            <Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Save bar */}
      <div className="flex items-center justify-between gap-4 py-4 border-t sticky bottom-0 bg-background">
        <Button variant="outline" asChild>
          <Link href={`/dashboard/clients/${clientId}`}>
            <ChevronLeft className="h-4 w-4 mr-1.5" />
            Voltar
          </Link>
        </Button>
        <div className="flex gap-2">
          {propostaId && (
            <Button variant="outline" asChild>
              <a href={`/api/clients/${clientId}/propostas/${propostaId}/pdf`} download>
                <FileDown className="h-4 w-4 mr-1.5" />
                {t('downloadPdf')}
              </a>
            </Button>
          )}
          <Button onClick={() => save(false)} disabled={saving} variant="outline">
            {t('saveProposta')}
          </Button>
          <Button onClick={() => save(true)} disabled={saving}>
            <Save className="h-4 w-4 mr-1.5" />
            Guardar e Sair
          </Button>
        </div>
      </div>
    </div>
  );
}
