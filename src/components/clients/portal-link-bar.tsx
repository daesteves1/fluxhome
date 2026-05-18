'use client';

import { Copy, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Props {
  portalToken: string;
}

export function PortalLinkBar({ portalToken }: Props) {
  const portalUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/portal/${portalToken}`;

  return (
    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5">
      <span className="text-xs text-slate-500 flex-1 truncate">Portal do cliente</span>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs"
        onClick={() => { navigator.clipboard.writeText(portalUrl); toast.success('Link copiado!'); }}
      >
        <Copy className="h-3.5 w-3.5 mr-1" />
        Copiar link
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs"
        onClick={() => window.open(portalUrl, '_blank')}
      >
        <ExternalLink className="h-3.5 w-3.5 mr-1" />
        Abrir portal
      </Button>
    </div>
  );
}
