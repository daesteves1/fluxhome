'use client';

import { useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, Loader2, Mail, Phone, ChevronDown, ChevronRight, BookUser } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { banks } from '@/lib/banks';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BankContact {
  id: string;
  bank_id: string;
  bank_name: string;
  name: string;
  email: string;
  role: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
}

interface FormState {
  bank_id: string;
  bank_name: string;
  name: string;
  email: string;
  role: string;
  phone: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  bank_id: '',
  bank_name: '',
  name: '',
  email: '',
  role: '',
  phone: '',
  notes: '',
};

// ─── Contact form dialog ──────────────────────────────────────────────────────

function ContactFormDialog({
  open,
  editing,
  onClose,
  onSaved,
}: {
  open: boolean;
  editing: BankContact | null;
  onClose: () => void;
  onSaved: (contact: BankContact) => void;
}) {
  const [form, setForm] = useState<FormState>(() =>
    editing
      ? { bank_id: editing.bank_id, bank_name: editing.bank_name, name: editing.name, email: editing.email, role: editing.role ?? '', phone: editing.phone ?? '', notes: editing.notes ?? '' }
      : EMPTY_FORM
  );
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  // Sync form when dialog opens with different contact
  const resetFor = useCallback((c: BankContact | null) => {
    setForm(c
      ? { bank_id: c.bank_id, bank_name: c.bank_name, name: c.name, email: c.email, role: c.role ?? '', phone: c.phone ?? '', notes: c.notes ?? '' }
      : EMPTY_FORM
    );
    setErrors({});
  }, []);

  function set(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function selectBank(bankId: string) {
    const bank = banks.find((b) => b.id === bankId);
    if (bank) {
      setForm((prev) => ({ ...prev, bank_id: bankId, bank_name: bank.name }));
      setErrors((prev) => ({ ...prev, bank_id: undefined }));
    }
  }

  function validate(): boolean {
    const errs: Partial<Record<keyof FormState, string>> = {};
    if (!form.bank_id) errs.bank_id = 'Selecione um banco';
    if (!form.name.trim()) errs.name = 'Campo obrigatório';
    if (!form.email.trim()) errs.email = 'Campo obrigatório';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Email inválido';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    try {
      const url = editing
        ? `/api/office/bank-contacts/${editing.id}`
        : '/api/office/bank-contacts';
      const method = editing ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json() as { error?: string };
        toast.error(err.error ?? 'Erro ao guardar');
        return;
      }
      const saved = await res.json() as BankContact;
      toast.success(editing ? 'Contacto atualizado' : 'Contacto adicionado');
      onSaved(saved);
      onClose();
    } catch {
      toast.error('Erro de rede');
    } finally {
      setSaving(false);
    }
  }

  // Reset form when dialog opens/closes
  const handleOpenChange = (o: boolean) => {
    if (!o) onClose();
    else resetFor(editing);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar contacto' : 'Adicionar contacto'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Bank selector */}
          <div className="space-y-1.5">
            <Label>Banco <span className="text-destructive">*</span></Label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-48 overflow-y-auto pr-1">
              {banks.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => selectBank(b.id)}
                  className={cn(
                    'flex flex-col items-center gap-1 p-2 rounded-lg border text-xs font-medium transition-colors',
                    form.bank_id === b.id
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-slate-200 bg-white hover:border-slate-300 text-slate-600'
                  )}
                >
                  <span
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] text-white font-bold"
                    style={{ backgroundColor: b.color }}
                  >
                    {b.shortName.slice(0, 2)}
                  </span>
                  <span className="truncate w-full text-center">{b.shortName}</span>
                </button>
              ))}
            </div>
            {errors.bank_id && <p className="text-xs text-destructive">{errors.bank_id}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Nome <span className="text-destructive">*</span></Label>
              <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Ana Silva" />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Email <span className="text-destructive">*</span></Label>
              <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="ana.silva@banco.pt" />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Função / Cargo</Label>
              <Input value={form.role} onChange={(e) => set('role', e.target.value)} placeholder="Gestora de crédito" />
            </div>
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+351 912 345 678" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Notas</Label>
            <Textarea
              rows={2}
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Condições especiais, disponibilidade…"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {editing ? 'Guardar alterações' : 'Adicionar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Bank group card ──────────────────────────────────────────────────────────

function BankGroup({
  bankId,
  bankName,
  contacts,
  onEdit,
  onDelete,
}: {
  bankId: string;
  bankName: string;
  contacts: BankContact[];
  onEdit: (c: BankContact) => void;
  onDelete: (c: BankContact) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const bank = banks.find((b) => b.id === bankId);

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      {/* Group header */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
      >
        <span
          className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] text-white font-bold shrink-0"
          style={{ backgroundColor: bank?.color ?? '#94a3b8' }}
        >
          {(bank?.shortName ?? bankName).slice(0, 2)}
        </span>
        <span className="font-semibold text-sm text-slate-800 flex-1">{bankName}</span>
        <span className="text-xs text-slate-400 mr-1">{contacts.length} {contacts.length === 1 ? 'contacto' : 'contactos'}</span>
        {expanded
          ? <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
          : <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
        }
      </button>

      {/* Contacts list */}
      {expanded && (
        <div className="divide-y divide-slate-100">
          {contacts.map((c) => (
            <div key={c.id} className="flex items-start gap-3 px-4 py-3">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                <BookUser className="h-4 w-4 text-slate-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-slate-900">{c.name}</p>
                  {c.role && (
                    <span className="text-xs text-slate-400 bg-slate-100 rounded px-1.5 py-0.5">{c.role}</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                  <a href={`mailto:${c.email}`} className="flex items-center gap-1 text-xs text-slate-500 hover:text-primary transition-colors">
                    <Mail className="h-3 w-3 shrink-0" />
                    {c.email}
                  </a>
                  {c.phone && (
                    <a href={`tel:${c.phone}`} className="flex items-center gap-1 text-xs text-slate-500 hover:text-primary transition-colors">
                      <Phone className="h-3 w-3 shrink-0" />
                      {c.phone}
                    </a>
                  )}
                </div>
                {c.notes && (
                  <p className="text-xs text-slate-400 mt-1 italic">{c.notes}</p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => onEdit(c)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                  title="Editar"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(c)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  title="Eliminar"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function BankContactsManager({ initialContacts }: { initialContacts: BankContact[] }) {
  const [contacts, setContacts] = useState<BankContact[]>(initialContacts);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<BankContact | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Group contacts by bank_id
  const groups = Object.values(
    contacts.reduce<Record<string, { bankId: string; bankName: string; contacts: BankContact[] }>>((acc, c) => {
      if (!acc[c.bank_id]) acc[c.bank_id] = { bankId: c.bank_id, bankName: c.bank_name, contacts: [] };
      acc[c.bank_id]!.contacts.push(c);
      return acc;
    }, {})
  ).sort((a, b) => a.bankName.localeCompare(b.bankName));

  function openAdd() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(c: BankContact) {
    setEditing(c);
    setDialogOpen(true);
  }

  function handleSaved(saved: BankContact) {
    setContacts((prev) => {
      const idx = prev.findIndex((c) => c.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [...prev, saved];
    });
  }

  async function handleDelete(contact: BankContact) {
    if (!confirm(`Eliminar contacto "${contact.name}"?`)) return;
    setDeletingId(contact.id);
    try {
      const res = await fetch(`/api/office/bank-contacts/${contact.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao eliminar');
      setContacts((prev) => prev.filter((c) => c.id !== contact.id));
      toast.success('Contacto eliminado');
    } catch {
      toast.error('Erro ao eliminar contacto');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Contactos Bancários</h1>
          <p className="text-sm text-slate-500 mt-1">Gestore os seus contactos em cada banco.</p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4 mr-1.5" />
          Adicionar contacto
        </Button>
      </div>

      {/* Content */}
      {groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <BookUser className="h-7 w-7 text-slate-400" />
          </div>
          <p className="text-slate-600 font-medium">Sem contactos bancários</p>
          <p className="text-sm text-slate-400 mt-1 max-w-xs">
            Adicione os contactos dos gestores de crédito de cada banco para ter tudo centralizado.
          </p>
          <Button className="mt-5" onClick={openAdd}>
            <Plus className="h-4 w-4 mr-1.5" />
            Adicionar contacto
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map(({ bankId, bankName, contacts: groupContacts }) => (
            <BankGroup
              key={bankId}
              bankId={bankId}
              bankName={bankName}
              contacts={groupContacts}
              onEdit={openEdit}
              onDelete={(c) => { if (deletingId !== c.id) handleDelete(c); }}
            />
          ))}
        </div>
      )}

      <ContactFormDialog
        open={dialogOpen}
        editing={editing}
        onClose={() => setDialogOpen(false)}
        onSaved={handleSaved}
      />
    </>
  );
}
