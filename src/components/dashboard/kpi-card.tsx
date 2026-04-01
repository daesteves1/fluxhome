import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KpiCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  trend?: 'positive' | 'warning' | 'neutral';
}

export function KpiCard({ title, value, icon: Icon, trend = 'neutral' }: KpiCardProps) {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold text-foreground mt-1">{value}</p>
          </div>
          <div
            className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center',
              trend === 'positive' && 'bg-green-100 text-green-600',
              trend === 'warning' && 'bg-amber-100 text-amber-600',
              trend === 'neutral' && 'bg-primary/10 text-primary'
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
