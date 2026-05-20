'use client';

import { useState, useEffect } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface BrokerNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora mesmo';
  if (mins < 60) return `há ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `há ${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `há ${days}d`;
  return new Date(dateStr).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<BrokerNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const router = useRouter();

  async function fetchNotifications() {
    try {
      const res = await fetch('/api/broker-notifications');
      if (!res.ok) return;
      const json = await res.json();
      setNotifications(json.notifications ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchNotifications();
  }, []);

  async function markAllRead() {
    setMarkingAll(true);
    try {
      await fetch('/api/broker-notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } finally {
      setMarkingAll(false);
    }
  }

  function handleClick(n: BrokerNotification) {
    if (n.link) router.push(n.link);
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-slate-600" />
          <h1 className="text-xl font-semibold text-slate-900">Notificações</h1>
          {unreadCount > 0 && (
            <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={markAllRead}
            disabled={markingAll}
            className="text-slate-500 hover:text-slate-700 gap-1.5"
          >
            <CheckCheck className="h-4 w-4" />
            Marcar todas como lidas
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 rounded-lg bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Bell className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Sem notificações</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
          {notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => handleClick(n)}
              className={cn(
                'w-full text-left px-5 py-4 hover:bg-slate-50 transition-colors',
                !n.is_read && 'bg-blue-50/60',
                !n.link && 'cursor-default',
              )}
            >
              <div className="flex items-start gap-3">
                {!n.is_read && (
                  <span className="mt-2 shrink-0 h-2 w-2 rounded-full bg-blue-500" />
                )}
                <div className={cn('flex-1 min-w-0', n.is_read && 'pl-5')}>
                  <p className="text-sm font-medium text-slate-800">{n.title}</p>
                  {n.body && <p className="text-sm text-slate-500 mt-0.5">{n.body}</p>}
                </div>
                <span className="shrink-0 text-xs text-slate-400 mt-0.5 whitespace-nowrap">{relativeTime(n.created_at)}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
