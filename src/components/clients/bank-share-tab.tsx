'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useRef, useState } from 'react';
import { Eye, Trash2, ChevronDown, Search, Copy, Send, Check, ExternalLink, Loader2, BookUser, Mail, Phone, Link2, FileArchive } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { banks } from '@/lib/banks';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.homeflux.pt';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BankShareTabProps {
  clientId: string;
  brokerId: string | null;
  clientName: string;
  officeName: string;
  approvedDocuments: ApprovedDocument[];
}

export interface ApprovedDocument {
  id: string;
  label: string;
  doc_type: string | null;
  proponente: 'p1' | 'p2' | 'shared';
}

interface BankContact {
  id: string;
  bank_id: string;
  bank_name: string;
  name: string;
  email: string;
  role: string | null;
  phone: string | null;
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

type SendMode = 'link' | 'zip';

// ─── Component ────────────────────────────────────────────────────────────────

export function BankShareTab({ clientId, officeName, approvedDocuments }: BankShareTabProps) {
  // — Bank contacts (from office)
  const [bankContacts, setBankContacts] = useState<BankContact[]>([]);

  // — Search / selection
  const [search, setSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const [selectedBank, setSelectedBank] = useState<{ id: string; name: string; color: string } | null>(null);
  const [selectedContact, setSelectedContact] = useState<BankContact | null>(null);
  const [contactEmail, setContactEmail] = useState('');

  // — Send mode
  const [sendMode, setSendMode] = useState<SendMode>('link');

  // — Form
  const [emailBody, setEmailBody] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [checkedDocIds, setCheckedDocIds] = useState<Set<string>>(new Set());
  const [docsExpanded, setDocsExpanded] = useState(true);

  // — Actions
  const [copying, setCopying] = useState(false);
  const [sending, setSending] = useState(false);
  const [formCollapsed, setFormCollapsed] = useState(false);

  // — Links history
  const [links, setLinks] = useState<BankShareLink[]>([]);
  const [expandedHistory, setExpandedHistory] = useState(false);
  const [accessLogOpen, setAccessLogOpen] = useState(false);
  const [accessLog, setAccessLog] = useState<AccessLogEvent[]>([]);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [linkToRevoke, setLinkToRevoke] = useState<string | null>(null);

  // ── Init ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const d = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    setExpiryDate(d.toISOString().split('T')[0]!);
    setCheckedDocIds(new Set(approvedDocuments.map((doc) => doc.id)));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetch('/api/office/bank-contacts')
      .then((r) => r.ok ? r.json() : [])
      .then((data: BankContact[]) => setBankContacts(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch(`/api/bank-share/links?client_id=${clientId}`)
      .then((r) => r.ok ? r.json() : { links: [] })
      .then((d) => setLinks(d.links ?? []))
      .catch(() => {});
  }, [clientId]);

  // ── Click-outside dropdown ──────────────────────────────────────────────────
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const q = search.toLowerCase();
  const filteredBanks = banks.filter(
    (b) => !q || b.name.toLowerCase().includes(q) || b.shortName.toLowerCase().includes(q)
  ).slice(0, 6);
  const filteredContacts = bankContacts.filter(
    (c) => !q || c.name.toLowerCase().includes(q) || c.bank_name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
  ).slice(0, 6);
  const showDropdownContent = showDropdown && (filteredBanks.length > 0 || filteredContacts.length > 0);

  const contactsForBank = selectedBank ? bankContacts.filter((c) => c.bank_id === selectedBank.id) : [];
  const hasEmail = contactEmail.trim().includes('@');
  const canAct = !!selectedBank && hasEmail;

  const today = new Date().toISOString().split('T')[0]!;
  const maxDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]!;

  // ── Handlers ────────────────────────────────────────────────────────────────
  function selectBank(id: string, name: string, color: string) {
    setSelectedBank({ id, name, color });
    setSelectedContact(null);
    setContactEmail('');
    setSearch(name);
    setShowDropdown(false);
  }

  function selectContact(c: BankContact) {
    const bank = banks.find((b) => b.id === c.bank_id);
    setSelectedBank({ id: c.bank_id, name: c.bank_name, color: bank?.color ?? '#94a3b8' });
    setSelectedContact(c);
    setContactEmail(c.email);
    setSearch(c.bank_name);
    setShowDropdown(false);
  }

  function clearSelection() {
    setSelectedBank(null);
    setSelectedContact(null);
    setContactEmail('');
    setSearch('');
  }

  function toggleDoc(id: string) {
    setCheckedDocIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function handleCopyLink() {
    if (!canAct) return;
    setCopying(true);
    try {
      const res = await fetch('/api/bank-share/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          bank_id: selectedBank!.id,
          bank_name: selectedBank!.name,
          contact_email: contactEmail,
          note: emailBody || null,
          expires_at: expiryDate,
          skip_email: true,
        }),
      });
      if (!res.ok) { toast.error('Erro ao criar link'); return; }
      const link = await res.json() as { token?: string; id?: string };
      const url = `${APP_URL}/bank-share/${link.token}`;
      await navigator.clipboard.writeText(url);
      toast.success('Link copiado para a área de transferência');
      setLinks((prev) => [{
        ...link,
        bank_id: selectedBank!.id,
        bank_name: selectedBank!.name,
        contact_email: contactEmail,
        note: emailBody || null,
        status: 'active' as const,
        created_at: new Date().toISOString(),
        expires_at: expiryDate,
        access_count: 0,
      } as BankShareLink, ...prev]);
    } catch {
      toast.error('Erro ao copiar link');
    } finally {
      setCopying(false);
    }
  }

  async function handleSend() {
    if (!canAct) return;
    setSending(true);
    try {
      if (sendMode === 'link') {
        // Send portal-link email (existing flow)
        const res = await fetch('/api/bank-share/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: clientId,
            bank_id: selectedBank!.id,
            bank_name: selectedBank!.name,
            contact_email: contactEmail,
            note: emailBody || null,
            expires_at: expiryDate,
          }),
        });
        if (!res.ok) { const e = await res.json() as { error?: string }; toast.error(e.error ?? 'Erro ao enviar'); return; }
        const link = await res.json() as { token?: string; id?: string };
        toast.success(`Email enviado para ${contactEmail}`);
        setLinks((prev) => [{
          ...link,
          bank_id: selectedBank!.id,
          bank_name: selectedBank!.name,
          contact_email: contactEmail,
          note: emailBody || null,
          status: 'active' as const,
          created_at: new Date().toISOString(),
          expires_at: expiryDate,
          access_count: 0,
        } as BankShareLink, ...prev]);
      } else {
        // Send ZIP email
        const res = await fetch('/api/bank-share/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId,
            bankId: selectedBank!.id,
            bankName: selectedBank!.name,
            contactEmail,
            emailBody,
            checkedDocRequestIds: Array.from(checkedDocIds),
            expiresAt: expiryDate,
          }),
        });
        if (!res.ok) { const e = await res.json() as { error?: string }; toast.error(e.error ?? 'Erro ao enviar'); return; }
        const data = await res.json() as { docCount: number };
        toast.success(`Email enviado${data.docCount > 0 ? ` com ${data.docCount} documento${data.docCount !== 1 ? 's' : ''}` : ''}`);
      }
      setFormCollapsed(true);
    } catch {
      toast.error('Erro de rede');
    } finally {
      setSending(false);
    }
  }

  async function handleRevoke() {
    if (!linkToRevoke) return;
    try {
      const res = await fetch('/api/bank-share/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ link_id: linkToRevoke }),
      });
      if (!res.ok) throw new Error();
      setLinks((prev) => prev.map((l) => l.id === linkToRevoke ? { ...l, status: 'revoked' as const } : l));
      toast.success('Link revogado');
    } catch {
      toast.error('Erro ao revogar link');
    } finally {
      setRevokeDialogOpen(false);
      setLinkToRevoke(null);
    }
  }

  async function openAccessLog(linkId: string) {
    try {
      const res = await fetch(`/api/bank-share/access-log/${linkId}`);
      if (!res.ok) throw new Error();
      const d = await res.json() as { events?: AccessLogEvent[] };
      setAccessLog(d.events ?? []);
      setAccessLogOpen(true);
    } catch {
      toast.error('Erro ao carregar histórico');
    }
  }

  const getEventLabel = (evt: string) => ({
    otp_requested: 'Código solicitado',
    otp_verified: 'Código verificado ✓',
    otp_failed: 'Código inválido',
    link_locked: 'Link bloqueado',
    page_viewed: 'Página consultada',
    doc_downloaded: 'Documento descarregado',
    bulk_downloaded: 'Documentos descarregados (ZIP)',
    data_copied: 'Dados copiados',
  }[evt] ?? evt);

  const statusBadge = (status: string) =>
    status === 'active' ? <Badge className="bg-green-100 text-green-800">Ativa</Badge>
    : status === 'expired' ? <Badge variant="outline" className="text-slate-600">Expirada</Badge>
    : <Badge className="bg-red-100 text-red-800">Revogada</Badge>;

  const activeLinks = links.filter((l) => l.status === 'active');
  const inactiveLinks = links.filter((l) => l.status !== 'active');

  return (
    <div className="space-y-6">

      {/* ── Create new share ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200">
        <button
          type="button"
          onClick={() => setFormCollapsed((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors text-left rounded-xl"
        >
          <h3 className="text-base font-semibold text-slate-900">Nova partilha bancária</h3>
          <ChevronDown className={cn('h-4 w-4 text-slate-400 transition-transform shrink-0', !formCollapsed && 'rotate-180')} />
        </button>

      {!formCollapsed && <div className="px-5 pb-5 space-y-5 border-t border-slate-100 overflow-visible">

        {/* Send mode selector */}
        <div
          className="flex h-9 rounded-lg p-0.5 gap-0.5"
          style={{ backgroundColor: 'rgba(0,0,0,0.05)' }}
        >
          <button
            type="button"
            onClick={() => setSendMode('link')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 rounded-md text-xs font-semibold transition-colors',
              sendMode === 'link' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            )}
          >
            <Link2 className="h-3.5 w-3.5" />
            Link da plataforma
          </button>
          <button
            type="button"
            onClick={() => setSendMode('zip')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 rounded-md text-xs font-semibold transition-colors',
              sendMode === 'zip' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            )}
          >
            <FileArchive className="h-3.5 w-3.5" />
            Email com documentos
          </button>
        </div>

        {/* Mode description */}
        <p className="text-xs text-slate-500 -mt-2">
          {sendMode === 'link'
            ? 'Envia um email com um link seguro para o banco aceder e descarregar os documentos no portal.'
            : 'Envia um email diretamente com os documentos selecionados em anexo (ZIP).'}
        </p>

        {/* Smart search */}
        <div ref={searchRef} className="relative">
          <label className="text-sm font-medium text-slate-700 block mb-1.5">Banco / Contacto</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setShowDropdown(true); if (!e.target.value) clearSelection(); }}
              onFocus={() => setShowDropdown(true)}
              placeholder="Pesquisar banco ou contacto..."
              className="w-full pl-9 pr-8 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {selectedBank && (
              <button
                type="button"
                onClick={clearSelection}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                ×
              </button>
            )}
          </div>

          {/* Dropdown */}
          {showDropdownContent && (
            <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
              {filteredBanks.length > 0 && (
                <div>
                  <p className="px-3 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Bancos</p>
                  {filteredBanks.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); selectBank(b.id, b.name, b.color); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 text-left"
                    >
                      <span className="w-5 h-5 rounded-full shrink-0" style={{ backgroundColor: b.color }} />
                      <span className="text-sm text-slate-800">{b.name}</span>
                      <span className="text-xs text-slate-400 ml-auto">{b.shortName}</span>
                    </button>
                  ))}
                </div>
              )}
              {filteredContacts.length > 0 && (
                <div className={filteredBanks.length > 0 ? 'border-t border-slate-100' : ''}>
                  <p className="px-3 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Contactos</p>
                  {filteredContacts.map((c) => {
                    const bank = banks.find((b) => b.id === c.bank_id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); selectContact(c); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 text-left"
                      >
                        <span className="w-5 h-5 rounded-full shrink-0" style={{ backgroundColor: bank?.color ?? '#94a3b8' }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-800 truncate">{c.name}</p>
                          <p className="text-xs text-slate-400 truncate">{c.bank_name}</p>
                        </div>
                        <span className="text-xs text-slate-400 truncate max-w-[120px]">{c.email}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Contact selector + email — shown after bank selected */}
        {selectedBank && (
          <div className="space-y-3">
            {/* Bank header */}
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: selectedBank.color }} />
              <span className="text-sm font-medium text-slate-800">{selectedBank.name}</span>
            </div>

            {/* Contacts for this bank */}
            {contactsForBank.length > 0 ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500">Selecionar contacto</p>
                  <a
                    href="/dashboard/office/bank-contacts"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline flex items-center gap-0.5"
                  >
                    Gerir <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                {contactsForBank.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      if (selectedContact?.id === c.id) { setSelectedContact(null); setContactEmail(''); }
                      else { setSelectedContact(c); setContactEmail(c.email); }
                    }}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors',
                      selectedContact?.id === c.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'
                    )}
                  >
                    <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                      <BookUser className="h-3.5 w-3.5 text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900">{c.name}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                        <span className="flex items-center gap-1 text-xs text-slate-500"><Mail className="h-3 w-3" />{c.email}</span>
                        {c.phone && <span className="flex items-center gap-1 text-xs text-slate-500"><Phone className="h-3 w-3" />{c.phone}</span>}
                      </div>
                    </div>
                    {selectedContact?.id === c.id && <Check className="h-4 w-4 text-blue-500 shrink-0" />}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-between text-xs text-slate-500 py-0.5">
                <span>Sem contactos guardados para este banco</span>
                <a href="/dashboard/office/bank-contacts" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-0.5">
                  Adicionar <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}

            {/* Email field */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Email <span className="text-destructive">*</span></label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => { setContactEmail(e.target.value); if (selectedContact && e.target.value !== selectedContact.email) setSelectedContact(null); }}
                placeholder="contacto@banco.pt"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Email body */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">
                Corpo do e-mail
                <span className="ml-1 text-xs font-normal text-slate-400">(opcional)</span>
              </label>
              <textarea
                rows={4}
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                placeholder={`Ex: Bom dia,\n\nEnvio os documentos do cliente para análise.\n\nCom os melhores cumprimentos,\n${officeName}`}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Expiry */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Validade do link</label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                min={today}
                max={maxDate}
                className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Document checklist — only for zip mode */}
            {sendMode === 'zip' && (
              <div className="rounded-lg border border-slate-200 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setDocsExpanded((v) => !v)}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
                >
                  <span className="text-sm font-medium text-slate-700">
                    Documentos em anexo
                    {approvedDocuments.length > 0 && (
                      <span className="ml-2 text-xs font-normal text-slate-500">
                        {checkedDocIds.size} de {approvedDocuments.length} selecionados
                      </span>
                    )}
                  </span>
                  <ChevronDown className={cn('h-4 w-4 text-slate-400 transition-transform', docsExpanded && 'rotate-180')} />
                </button>
                {docsExpanded && (
                  approvedDocuments.length === 0 ? (
                    <p className="px-3.5 py-3 text-sm text-slate-400">Sem documentos aprovados para anexar.</p>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {approvedDocuments.map((doc) => (
                        <label key={doc.id} className="flex items-center gap-3 px-3.5 py-2.5 cursor-pointer hover:bg-slate-50 select-none">
                          <input
                            type="checkbox"
                            checked={checkedDocIds.has(doc.id)}
                            onChange={() => toggleDoc(doc.id)}
                            className="rounded border-slate-300 text-blue-600"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-slate-800 truncate">{doc.label}</p>
                            <p className="text-xs text-slate-400">
                              {doc.proponente === 'p1' ? 'Proponente 1' : doc.proponente === 'p2' ? 'Proponente 2' : 'Partilhado'}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  )
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 pt-1">
              {sendMode === 'link' && (
                <Button
                  variant="outline"
                  onClick={handleCopyLink}
                  disabled={!canAct || copying || sending}
                  className="gap-2"
                >
                  {copying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
                  Copiar link
                </Button>
              )}
              <Button
                onClick={handleSend}
                disabled={!canAct || sending || copying}
                className="gap-2"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Enviar por e-mail
              </Button>
            </div>
          </div>
        )}
      </div>}
      </div>

      {/* ── Active links ─────────────────────────────────────────────────────── */}
      {activeLinks.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-slate-700">Links ativos</h4>
          {activeLinks.map((link) => (
            <div key={link.id} className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: banks.find((b) => b.id === link.bank_id)?.color ?? '#94a3b8' }} />
                  <span className="font-medium text-sm text-slate-900">{link.bank_name}</span>
                  {statusBadge(link.status)}
                </div>
                <span className="text-xs text-slate-400">{link.access_count} acesso{link.access_count !== 1 ? 's' : ''}</span>
              </div>
              <p className="text-xs text-slate-500 mb-0.5">{link.contact_email}</p>
              <p className="text-xs text-slate-400 mb-3">Expira {new Date(link.expires_at).toLocaleDateString('pt-PT')}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => openAccessLog(link.id)} className="gap-1.5 h-7 text-xs">
                  <Eye className="h-3.5 w-3.5" />Ver acessos
                </Button>
                <Button
                  variant="outline" size="sm"
                  onClick={() => { setLinkToRevoke(link.id); setRevokeDialogOpen(true); }}
                  className="gap-1.5 h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />Revogar
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── History ──────────────────────────────────────────────────────────── */}
      {inactiveLinks.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <button
            onClick={() => setExpandedHistory((v) => !v)}
            className="w-full px-4 py-3 flex items-center justify-between text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Histórico ({inactiveLinks.length})
            <ChevronDown className={cn('h-4 w-4 text-slate-400 transition-transform', expandedHistory && 'rotate-180')} />
          </button>
          {expandedHistory && (
            <div className="border-t border-slate-200 p-3 space-y-2">
              {inactiveLinks.map((link) => (
                <div key={link.id} className="bg-slate-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-medium text-slate-800">{link.bank_name}</span>
                    {statusBadge(link.status)}
                  </div>
                  <p className="text-xs text-slate-500 mb-2">{link.contact_email}</p>
                  <Button variant="outline" size="sm" onClick={() => openAccessLog(link.id)} className="gap-1.5 h-7 text-xs">
                    <Eye className="h-3.5 w-3.5" />Ver acessos
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Dialogs ──────────────────────────────────────────────────────────── */}
      <Dialog open={accessLogOpen} onOpenChange={setAccessLogOpen}>
        <DialogContent className="max-h-96 overflow-y-auto">
          <DialogHeader><DialogTitle>Histórico de acessos</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            {accessLog.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">Nenhum acesso registado</p>
            ) : accessLog.map((evt, i) => (
              <div key={i} className="flex items-start gap-3 pb-3 border-b last:border-0">
                <div className="text-slate-300 pt-1">•</div>
                <div>
                  <p className="text-sm font-medium text-slate-900">{getEventLabel(evt.event)}</p>
                  <p className="text-xs text-slate-400">
                    {new Date(evt.created_at).toLocaleDateString('pt-PT')}{' '}
                    {new Date(evt.created_at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revogar link</DialogTitle>
            <DialogDescription>Tem a certeza que pretende revogar este link? Esta ação não pode ser desfeita.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeDialogOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleRevoke}>Revogar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
