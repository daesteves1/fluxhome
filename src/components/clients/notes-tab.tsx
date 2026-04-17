'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { formatDateTime } from '@/lib/utils';
import { toast } from 'sonner';
import type { BrokerNote } from './client-detail-tabs';

interface Props {
  clientId: string;
  notes: BrokerNote[];
  currentBrokerId: string | null;
  apiBase?: string;
}

export function NotesTab({ clientId, notes, currentBrokerId, apiBase }: Props) {
  const base = apiBase ?? `/api/clients/${clientId}`;
  const t = useTranslations('notes');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  async function saveNote() {
    if (!content.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`${base}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        setContent('');
        router.refresh();
      } else {
        toast.error(tCommon('error'));
      }
    } finally {
      setSaving(false);
    }
  }

  async function updateNote(noteId: string) {
    const res = await fetch(`${base}/notes/${noteId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: editContent }),
    });
    if (res.ok) {
      setEditingId(null);
      router.refresh();
    } else {
      toast.error(tCommon('error'));
    }
  }

  async function deleteNote(noteId: string) {
    if (!confirm(t('confirmDelete'))) return;
    const res = await fetch(`${base}/notes/${noteId}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      router.refresh();
    } else {
      toast.error(tCommon('error'));
    }
  }

  return (
    <div className="space-y-5">
      {/* Add note */}
      <Card className="shadow-sm">
        <CardContent className="p-4 space-y-3">
          <Textarea
            placeholder={t('placeholder')}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
          />
          <div className="flex justify-end">
            <Button size="sm" onClick={saveNote} disabled={saving || !content.trim()}>
              {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : null}
              {t('saveNote')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notes list */}
      {notes.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          {t('noNotes')}
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <Card key={note.id} className="shadow-sm">
              <CardContent className="p-4">
                {editingId === note.id ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={3}
                    />
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" size="sm" onClick={() => setEditingId(null)}>
                        {tCommon('cancel')}
                      </Button>
                      <Button size="sm" onClick={() => updateNote(note.id)}>
                        {tCommon('save')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-sm text-foreground whitespace-pre-wrap">{note.content}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatDateTime(note.created_at)}
                      </p>
                    </div>
                    {note.broker_id === currentBrokerId && (
                      <div className="flex gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setEditingId(note.id); setEditContent(note.content); }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deleteNote(note.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
