'use client';
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import { useEffect, useRef, useState } from 'react';
import { XCircle, Copy, Download, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type PageState = 'loading' | 'invalid' | 'otp_gate' | 'verified';

interface PageData {
  client: Record<string, unknown>;
  documents: Array<{
    request: { id: string; label: string; proponente: string; doc_type: string | null };
    upload: { id: string; file_name: string | null; file_size: number | null } | null;
  }>;
  office: { name: string; white_label: { logo_url?: string | null } };
  link: { contact_email: string; expires_at: string; bank_name: string };
}

interface SessionData {
  share_link_id: string;
  verified_at: string;
  expires_at: string;
}

export default function BankSharePage({ params }: { params: { token: string } }) {
  const { token } = params;
  const [state, setState] = useState<PageState>('loading');
  const [pageData, setPageData] = useState<PageData | null>(null);
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [attempts, setAttempts] = useState(3);
  const [locked, setLocked] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [bulkDownloadDialogOpen, setBulkDownloadDialogOpen] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Session key helper
  const getSessionKey = () => `bank_share_session_${token}`;

  // Initialize page
  useEffect(() => {
    const initPage = async () => {
      // 1. Check for existing valid session in sessionStorage
      const sessionKey = getSessionKey();
      let existingSession: SessionData | null = null;
      try {
        const raw = sessionStorage.getItem(sessionKey);
        if (raw) {
          const parsed: SessionData = JSON.parse(raw);
          if (new Date(parsed.expires_at) > new Date()) {
            existingSession = parsed;
          } else {
            sessionStorage.removeItem(sessionKey);
          }
        }
      } catch {
        sessionStorage.removeItem(sessionKey);
      }

      if (existingSession) {
        // Valid session — go straight to loading data
        await loadPageData();
        return;
      }

      // 2. No session — validate token by requesting OTP.
      //    request-otp validates the link (expired/revoked → 404) and sends the code.
      try {
        const response = await fetch('/api/bank-share/request-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        if (response.status === 404) {
          setState('invalid');
          return;
        }

        if (response.ok) {
          const data = await response.json();
          setMaskedEmail(data.masked_email ?? '');
          setCooldownSeconds(60);
        }
        // 429 (rate limit) → token is valid, just show OTP gate without auto-sending
        setState('otp_gate');
      } catch {
        setState('invalid');
      }
    };

    initPage();
  }, [token]);

  const loadPageData = async () => {
    try {
      const response = await fetch('/api/bank-share/page-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        setState('invalid');
        return;
      }

      const data: PageData = await response.json();
      setPageData(data);
      setState('verified');
    } catch (error) {
      setState('invalid');
    }
  };

  const requestOtp = async () => {
    try {
      const response = await fetch('/api/bank-share/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.masked_email) setMaskedEmail(data.masked_email);
        setCooldownSeconds(60);
      } else if (response.status === 429) {
        toast.error('Demasiadas tentativas. Aguarde antes de reenviar.');
      }
    } catch {
      toast.error('Erro ao enviar código. Tente novamente.');
    }
  };

  // Cooldown timer
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds(s => s - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  // OTP input handlers
  const handleOtpDigitChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;

    const newDigits = [...otpDigits];
    newDigits[index] = value;
    setOtpDigits(newDigits);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const verifyOtp = async () => {
    if (locked) return;

    const otp = otpDigits.join('');
    if (otp.length !== 6) {
      toast.error('Código incompleto');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/bank-share/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, otp }),
      });

      if (response.ok) {
        const data = await response.json();
        const sessionData: SessionData = {
          share_link_id: data.share_link_id,
          verified_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours
        };
        sessionStorage.setItem(getSessionKey(), JSON.stringify(sessionData));
        await loadPageData();
      } else if (response.status === 429) {
        setLocked(true);
        toast.error('Este link foi bloqueado por razões de segurança.');
      } else {
        const newAttempts = attempts - 1;
        setAttempts(newAttempts);
        if (newAttempts <= 0) {
          setLocked(true);
          toast.error('Link bloqueado por múltiplas tentativas falhas.');
        } else {
          toast.error(`Código inválido. Tentativas restantes: ${newAttempts}`);
        }
        setOtpDigits(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (error) {
      toast.error('Erro ao verificar código');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (value: string, fieldName?: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(fieldName || 'all');
      setTimeout(() => setCopied(null), 2000);

      if (fieldName) {
        toast.success('Copiado!');
      }
    } catch (error) {
      toast.error('Erro ao copiar');
    }
  };

  const downloadDocument = async (docId: string) => {
    try {
      const response = await fetch('/api/bank-share/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, docId }),
      });

      if (!response.ok) {
        toast.error('Erro ao descarregar documento');
        return;
      }

      const data = await response.json();
      window.open(data.signedUrl, '_blank');
    } catch (error) {
      toast.error('Erro ao descarregar documento');
    }
  };

  const bulkDownload = async () => {
    if (selectedDocs.length === 0) {
      toast.error('Selecione pelo menos um documento');
      return;
    }

    try {
      const response = await fetch('/api/bank-share/bulk-download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, docIds: selectedDocs }),
      });

      if (!response.ok) {
        toast.error('Erro ao descarregar documentos');
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'documentos.zip';
      a.click();
      URL.revokeObjectURL(url);
      setBulkDownloadDialogOpen(false);
    } catch (error) {
      toast.error('Erro ao descarregar documentos');
    }
  };

  // LOADING STATE
  if (state === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-slate-600">A carregar...</p>
        </div>
      </div>
    );
  }

  // INVALID STATE
  if (state === 'invalid') {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-slate-900 mb-2">Link inválido ou expirado</h1>
          <p className="text-slate-600 text-sm">
            Este link de acesso não é válido, expirou ou foi revogado. Contacte o mediador para obter um novo link.
          </p>
        </div>
      </div>
    );
  }

  // OTP GATE STATE
  if (state === 'otp_gate') {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
          {pageData?.office.white_label?.logo_url ? (
            <img src={pageData.office.white_label.logo_url} alt={pageData.office.name} className="h-10 object-contain mx-auto mb-6" />
          ) : (
            <p className="text-center font-bold text-slate-900 mb-6">{pageData?.office.name}</p>
          )}

          <h1 className="text-xl font-semibold text-slate-900 mb-2 text-center">Acesso seguro à documentação</h1>
          <p className="text-slate-500 text-sm text-center mb-6">
            Foi enviado um código de 6 dígitos para {maskedEmail}
          </p>

          {/* OTP Input */}
          <div className="flex gap-2 justify-center mb-6">
            {otpDigits.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpDigitChange(index, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(index, e)}
                disabled={locked || loading}
                className="w-10 h-12 text-center text-xl border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-50"
              />
            ))}
          </div>

          {/* Error state */}
          {attempts < 3 && !locked && (
            <p className="text-red-600 text-sm text-center mb-4">
              Código inválido. Tentativas restantes: {attempts}
            </p>
          )}

          {/* Locked state */}
          {locked && (
            <div className="border border-red-200 bg-red-50 rounded-lg p-3 mb-4">
              <p className="text-red-700 text-sm text-center">
                Este link foi bloqueado por razões de segurança. Contacte o mediador.
              </p>
            </div>
          )}

          {/* Verify button */}
          <Button
            onClick={verifyOtp}
            disabled={loading || locked}
            className="w-full mb-4"
          >
            {loading ? 'A verificar...' : 'Verificar código'}
          </Button>

          {/* Resend link */}
          <div className="text-center text-sm text-slate-600">
            {cooldownSeconds > 0 ? (
              <p>Pode reenviar em {cooldownSeconds}s</p>
            ) : (
              <p>
                Não recebeu o código?{' '}
                <button
                  onClick={requestOtp}
                  disabled={locked}
                  className="text-blue-600 hover:underline font-medium disabled:opacity-50"
                >
                  Reenviar
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // VERIFIED STATE
  if (state === 'verified' && pageData) {
    const client = pageData.client as any;
    const currentDate = new Date();
    const expiresAt = new Date(pageData.link.expires_at);
    const expiryFormatted = expiresAt.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });

    // Document grouping
    const docsByProponente: Record<string, any[]> = {
      'Proponente 1': [],
      'Proponente 2': [],
      'Partilhados': [],
    };
    pageData.documents.forEach(doc => {
      const groupKey =
        doc.request.proponente === 'p1' ? 'Proponente 1' :
        doc.request.proponente === 'p2' ? 'Proponente 2' :
        'Partilhados';
      docsByProponente[groupKey].push(doc);
    });

    // Copy all data builder
    const buildAllDataText = () => {
      const lines: string[] = [];
      lines.push('DADOS DO PROCESSO');
      lines.push('');
      lines.push(`Tipo de processo: ${client.mortgage_type ?? '—'}`);
      lines.push(`Finalidade: ${client.notes_general ?? '—'}`);
      const loanAmount = client.loan_amount ? new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(client.loan_amount) : '—';
      lines.push(`Montante solicitado: ${loanAmount}`);
      const term = client.term_months ? `${Math.floor(client.term_months / 12)} anos (${client.term_months} meses)` : '—';
      lines.push(`Prazo: ${term}`);
      const propValue = client.property_value ? new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(client.property_value) : '—';
      lines.push(`Valor do imóvel: ${propValue}`);
      const ltv = client.loan_amount && client.property_value ? `${Math.round((client.loan_amount / client.property_value) * 100)}%` : '—';
      lines.push(`Rácio LTV: ${ltv}`);
      lines.push('');

      // Proponents
      ['p1', 'p2'].forEach((proponente, idx) => {
        const num = idx + 1;
        const nameKey = `${proponente}_name`;
        const name = client[nameKey];
        if (!name && proponente === 'p2') return;

        lines.push(`PROPONENTE ${num}`);
        lines.push(`Nome completo: ${name ?? '—'}`);
        const birthDateKey = `${proponente}_birth_date`;
        const birthDate = client[birthDateKey] ? new Date(client[birthDateKey]).toLocaleDateString('pt-PT') : '—';
        lines.push(`Data de nascimento: ${birthDate}`);
        const nifKey = `${proponente}_nif`;
        lines.push(`NIF: ${client[nifKey] ?? '—'}`);
        lines.push(`Estado civil: —`);
        lines.push(`Profissão: —`);
        lines.push(`Entidade empregadora: —`);
        const empTypeKey = `${proponente}_employment_type`;
        lines.push(`Tipo de contrato: ${client[empTypeKey] ?? '—'}`);
        lines.push(`Rendimento mensal líquido: —`);
        lines.push('');
      });

      return lines.join('\n');
    };

    return (
      <div className="min-h-screen bg-slate-50">
        {/* Sticky header */}
        <div className="sticky top-0 z-10 bg-white border-b border-slate-200 shadow-sm">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {pageData.office.white_label?.logo_url ? (
                <img src={pageData.office.white_label.logo_url} alt={pageData.office.name} className="h-8 object-contain" />
              ) : (
                <p className="font-bold text-slate-900">{pageData.office.name}</p>
              )}
            </div>
            <Badge variant="outline" className="text-xs">
              Acesso confidencial · Válido até {expiryFormatted}
            </Badge>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Section 1: Dados do processo */}
          <div className="bg-white rounded-lg border border-slate-200 p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-slate-900">Dados do processo</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(buildAllDataText())}
                className="gap-2"
              >
                <Copy className="w-4 h-4" />
                Copiar todos os dados
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {[
                { label: 'Tipo de processo', value: client.mortgage_type ?? '—' },
                { label: 'Finalidade', value: client.notes_general ?? '—' },
                {
                  label: 'Montante solicitado',
                  value: client.loan_amount ? new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(client.loan_amount) : '—',
                },
                {
                  label: 'Prazo',
                  value: client.term_months ? `${Math.floor(client.term_months / 12)} anos (${client.term_months} meses)` : '—',
                },
                {
                  label: 'Valor do imóvel',
                  value: client.property_value ? new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(client.property_value) : '—',
                },
                {
                  label: 'Rácio LTV',
                  value: client.loan_amount && client.property_value ? `${Math.round((client.loan_amount / client.property_value) * 100)}%` : '—',
                },
              ].map((field, idx) => (
                <div key={idx} className="bg-white rounded-lg border border-slate-200 p-3 relative">
                  <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">{field.label}</p>
                  <p className="text-sm font-medium text-slate-800 mb-2">{field.value}</p>
                  <button
                    onClick={() => copyToClipboard(field.value, field.label)}
                    className="absolute bottom-2 right-2 text-slate-400 hover:text-slate-700 transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Proponents */}
            {['p1', 'p2'].map((proponente, idx) => {
              const num = idx + 1;
              const nameKey = `${proponente}_name`;
              const name = client[nameKey];
              if (!name && proponente === 'p2') return null;

              return (
                <div key={proponente} className="mb-6">
                  <h3 className="text-sm font-semibold text-slate-600 mb-3">Proponente {num}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { label: 'Nome completo', value: name ?? '—' },
                      {
                        label: 'Data de nascimento',
                        value: client[`${proponente}_birth_date`] ? new Date(client[`${proponente}_birth_date`]).toLocaleDateString('pt-PT') : '—',
                      },
                      { label: 'NIF', value: client[`${proponente}_nif`] ?? '—' },
                      { label: 'Estado civil', value: '—' },
                      { label: 'Profissão', value: '—' },
                      { label: 'Entidade empregadora', value: '—' },
                      { label: 'Tipo de contrato', value: client[`${proponente}_employment_type`] ?? '—' },
                      { label: 'Rendimento mensal líquido', value: '—' },
                    ].map((field, fieldIdx) => (
                      <div key={fieldIdx} className="bg-slate-50 rounded-lg border border-slate-200 p-3 relative">
                        <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">{field.label}</p>
                        <p className="text-sm font-medium text-slate-800 mb-2">{field.value}</p>
                        <button
                          onClick={() => copyToClipboard(field.value, field.label)}
                          className="absolute bottom-2 right-2 text-slate-400 hover:text-slate-700 transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Section 2: Documentos para análise */}
          <div className="bg-white rounded-lg border border-slate-200 p-6 mb-16">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-slate-900">Documentos para análise</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const allIds = pageData.documents
                    .filter(d => d.upload)
                    .map(d => d.upload!.id);
                  setSelectedDocs(allIds);
                  setBulkDownloadDialogOpen(true);
                }}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Descarregar todos
              </Button>
            </div>

            {Object.entries(docsByProponente).map(([groupName, docs]) => {
              if (docs.length === 0) return null;
              return (
                <div key={groupName} className="mb-6">
                  <h3 className="text-sm font-semibold text-slate-600 mb-3">{groupName}</h3>
                  <div className="space-y-2">
                    {docs.map((doc, idx) => (
                      <div key={idx} className="flex items-center justify-between border-b border-slate-200 py-3 last:border-0">
                        <div>
                          <p className="font-medium text-slate-800">{doc.request.label}</p>
                          {doc.upload && (
                            <>
                              <p className="text-xs text-slate-400">{doc.upload.file_name}</p>
                              <p className="text-xs text-slate-400">
                                {doc.upload.file_size ? `${(doc.upload.file_size / 1024 / 1024).toFixed(2)} MB` : ''}
                              </p>
                            </>
                          )}
                        </div>
                        {doc.upload && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadDocument(doc.upload!.id)}
                            className="gap-2"
                          >
                            <Download className="w-4 h-4" />
                            Descarregar
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-200 pt-8 pb-4 text-center text-xs text-slate-400">
            <p>Este acesso é confidencial e destinado exclusivamente a {pageData.link.contact_email}.</p>
            <p className="mt-1">Qualquer utilização não autorizada é proibida.</p>
            <p className="mt-3">
              Fornecido por {pageData.office.name} via HomeFlux · {new Date().getFullYear()}
            </p>
          </div>
        </div>

        {/* Bulk Download Dialog */}
        <Dialog open={bulkDownloadDialogOpen} onOpenChange={setBulkDownloadDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Selecionar documentos</DialogTitle>
              <DialogDescription>
                Escolha quais os documentos que deseja descarregar.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 max-h-96 overflow-y-auto py-4">
              {pageData.documents
                .filter(d => d.upload)
                .map((doc) => (
                  <label key={doc.upload!.id} className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={selectedDocs.includes(doc.upload!.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedDocs([...selectedDocs, doc.upload!.id]);
                        } else {
                          setSelectedDocs(selectedDocs.filter(id => id !== doc.upload!.id));
                        }
                      }}
                      className="rounded"
                    />
                    <div>
                      <p className="text-sm font-medium text-slate-900">{doc.request.label}</p>
                      <p className="text-xs text-slate-500">{doc.upload!.file_name}</p>
                    </div>
                  </label>
                ))}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setBulkDownloadDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={bulkDownload} disabled={selectedDocs.length === 0}>
                Descarregar {selectedDocs.length > 0 ? `(${selectedDocs.length})` : ''}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return null;
}
