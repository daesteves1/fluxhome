import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ComingSoonCardProps {
  title: string;
  description?: string;
  className?: string;
}

export function ComingSoonCard({ title, description, className }: ComingSoonCardProps) {
  return (
    <div className={cn('bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-2', className)}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-700">{title}</p>
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-400">
          <Clock className="h-2.5 w-2.5" />
          Em breve
        </span>
      </div>
      {description && (
        <p className="text-xs text-slate-400">{description}</p>
      )}
      <div className="h-16 rounded-lg bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center">
        <span className="text-xs text-slate-300">Dados em breve</span>
      </div>
    </div>
  );
}
