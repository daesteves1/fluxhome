'use client';
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import { useEffect, useState } from 'react';
import { Eye, Trash2, Download, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { banks } from '@/lib/banks';

interface BankShareTabProps {
  clientId: string;
  brokerId: string | null;
}

interface BankShareLink {
  id: string;
  bank_id: string;
  bank_name: string;
  contact_email: string;
  note: string | null;
  token: string;
  status: 'active' | 'expired' | 'revoked';
  created_at: string;
  expires_at: string;
  access_count: number;
}

interface AccessLogEvent {
  id: string;
  event: string;
  created_at: string;
}

export function BankShareTab({ clientId, brokerId }: BankShareTabProps) {
  const [links, setLinks] = useState<BankShareLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedBank, setSelectedBank] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [accessLogOpen, setAccessLogOpen] = useState(false);
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);
  const [accessLog, setAccessLog] = useState<AccessLogEvent[]>([]);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [linkToRevoke, setLinkToRevoke] = useState<string | null>(null);
  const [expandedHistory, setExpandedHistory] = useState(false);

  // Initialize default expiry date (today + 7 days)
  useEffect(() => {
    const today = new Date();
    const sevenDaysLater = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const formattedDate = sevenDaysLater.toISOString().split('T')[0];
    setExpiryDate(formattedDate);
  }, []);

  // Load links on mount
  useEffect(() => {
    loadLinks();
  }, [clientId]);

  const loadLinks = async () => {
    try {
      const response = await fetch(`/api/bank-share/links?client_id=${clientId}`);
      if (!response.ok) throw new Error('Failed to load links');
      const data = await response.json();
      setLinks(data.links || []);
    } catch (error) {
      console.error('Failed to load links:', error);
      toast.error('Erro ao carregar links');
    }
  };

  const createLink = async () => {
    if (!selectedBank || !email || !expiryDate) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const selectedBankObj = banks.find(b => b.id === selectedBank);
    if (!selectedBankObj) {
      toast.error('Banco inválido');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/bank-share/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          bank_id: selectedBank,
          bank_name: selectedBankObj.name,
          contact_email: email,
          note: note || null,
          expires_at: expiryDate,
        }),
      });

      if (!response.ok) throw new Error('Failed to create link');

      toast.success(`Link criado e email enviado para ${email}`);
      setSelectedBank(null);
      setEmail('');
      setNote('');
      const today = new Date();
      const sevenDaysLater = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      setExpiryDate(sevenDaysLater.toISOString().split('T')[0]);
      await loadLinks();
    } catch (error) {
      toast.error('Erro ao criar link. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const openAccessLog = async (linkId: string) => {
    try {
      const response = await fetch(`/api/bank-share/access-log/${linkId}`);
      if (!response.ok) throw new Error('Failed to load access log');
      const data = await response.json();
      setAccessLog(data.events || []);
      setSelectedLinkId(linkId);
      setAccessLogOpen(true);
    } catch (error) {
      toast.error('Erro ao carregar histórico de acessos');
    }
  };

  const revokeLink = async () => {
    if (!linkToRevoke) return;

    try {
      const response = await fetch('/api/bank-share/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ link_id: linkToRevoke }),
      });

      if (!response.ok) throw new Error('Failed to revoke link');

      toast.success('Link revogado com sucesso');
      setRevokeDialogOpen(false);
      setLinkToRevoke(null);
      await loadLinks();
    } catch (error) {
      toast.error('Erro ao revogar link');
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'active') return <Badge className="bg-green-100 text-green-800">Ativa</Badge>;
    if (status === 'expired') return <Badge variant="outline" className="bg-slate-100 text-slate-700">Expirada</Badge>;
    if (status === 'revoked') return <Badge className="bg-red-100 text-red-800">Revogada</Badge>;
    return null;
  };

  const getEventLabel = (eventType: string): string => {
    const labels: Record<string, string> = {
      otp_requested: 'Código solicitado',
      otp_verified: 'Código verificado ✓',
      otp_failed: 'Código inválido',
      link_locked: 'Link bloqueado',
      page_viewed: 'Página consultada',
      doc_downloaded: 'Documento descarregado',
      bulk_downloaded: 'Documentos descarregados (ZIP)',
      data_copied: 'Dados copiados',
    };
    return labels[eventType] || eventType;
  };

  const activeLinks = links.filter(l => l.status === 'active');
  const inactiveLinks = links.filter(l => l.status !== 'active');

  const today = new Date();
  const minDate = today.toISOString().split('T')[0];
  const maxDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  return (
    <div className="space-y-8">
      {/* Section A: Create new bank share */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-6">Criar nova partilha bancária</h3>

        {/* Bank selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-3">Selecione o banco</label>
          <div className="grid grid-cols-3 gap-3">
            {banks.map((bank) => (
              <button
                key={bank.id}
                onClick={() => setSelectedBank(bank.id)}
                className={cn(
                  'p-3 rounded-lg border-2 transition-all text-center',
                  selectedBank === bank.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                )}
              >
                <div className="flex items-center justify-center gap-2 mb-1">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: bank.color }}
                  />
                  <span className="text-sm font-medium text-slate-900">{bank.shortName}</span>
                </div>
              </button>
            ))}
          </div>
          {selectedBank && (
            <p className="text-sm text-slate-600 mt-2">
              Banco selecionado: {banks.find(b => b.id === selectedBank)?.name}
            </p>
          )}
        </div>

        {/* Email input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">Email do contacto</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="contacto@banco.pt"
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Note input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">Nota (opcional)</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="ex: Seguimento reunião 15 abril"
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Date input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">Validade</label>
          <input
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            min={minDate}
            max={maxDate}
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Submit button */}
        <Button
          onClick={createLink}
          disabled={loading}
          className="w-full sm:w-auto"
        >
          {loading ? 'A criar...' : 'Criar link e enviar email'}
        </Button>
      </div>

      {/* Section B: Active links */}
      {activeLinks.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Links ativos</h3>
          <div className="space-y-3">
            {activeLinks.map((link) => (
              <div key={link.id} className="bg-white border border-slate-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <h4 className="font-semibold text-slate-900">{link.bank_name}</h4>
                    {getStatusBadge(link.status)}
                  </div>
                  <p className="text-sm text-slate-600">Acessos: {link.access_count}</p>
                </div>
                <p className="text-sm text-slate-600 mb-2">{link.contact_email}</p>
                {link.note && (
                  <p className="text-sm text-slate-500 mb-2 line-clamp-1" title={link.note}>
                    {link.note}
                  </p>
                )}
                <p className="text-xs text-slate-400 mb-4">
                  Expira em {new Date(link.expires_at).toLocaleDateString('pt-PT')}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openAccessLog(link.id)}
                    className="gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    Ver acessos
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setLinkToRevoke(link.id);
                      setRevokeDialogOpen(true);
                    }}
                    className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    Revogar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section C: Inactive links (history) */}
      {inactiveLinks.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200">
          <button
            onClick={() => setExpandedHistory(!expandedHistory)}
            className="w-full px-4 py-3 flex items-center justify-between text-lg font-semibold text-slate-900 hover:bg-slate-50"
          >
            Histórico ({inactiveLinks.length})
            <ChevronDown className={cn('w-5 h-5 transition-transform', expandedHistory && 'rotate-180')} />
          </button>

          {expandedHistory && (
            <div className="border-t border-slate-200 p-4 space-y-3">
              {inactiveLinks.map((link) => (
                <div key={link.id} className="bg-slate-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <h4 className="font-semibold text-slate-900">{link.bank_name}</h4>
                      {getStatusBadge(link.status)}
                    </div>
                    <p className="text-sm text-slate-600">Acessos: {link.access_count}</p>
                  </div>
                  <p className="text-sm text-slate-600 mb-2">{link.contact_email}</p>
                  {link.note && (
                    <p className="text-sm text-slate-500 mb-2 line-clamp-1" title={link.note}>
                      {link.note}
                    </p>
                  )}
                  <p className="text-xs text-slate-400 mb-3">
                    {link.status === 'expired' && `Expirou em ${new Date(link.expires_at).toLocaleDateString('pt-PT')}`}
                    {link.status === 'revoked' && `Revogado em ${new Date(link.created_at).toLocaleDateString('pt-PT')}`}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openAccessLog(link.id)}
                    className="gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    Ver acessos
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Access Log Sheet/Dialog */}
      <Dialog open={accessLogOpen} onOpenChange={setAccessLogOpen}>
        <DialogContent className="max-h-96 overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Histórico de acessos</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-4">
            {accessLog.length === 0 ? (
              <p className="text-sm text-slate-600 text-center">Nenhum acesso registrado</p>
            ) : (
              accessLog.map((event, idx) => (
                <div key={idx} className="flex items-start gap-3 pb-3 border-b last:border-0">
                  <div className="text-slate-400 pt-1">•</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      {getEventLabel(event.event)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(event.created_at).toLocaleDateString('pt-PT')}{' '}
                      {new Date(event.created_at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Revoke confirmation dialog */}
      <Dialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revogar link</DialogTitle>
            <DialogDescription>
              Tem a certeza que pretende revogar este link? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={revokeLink}>
              Revogar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
