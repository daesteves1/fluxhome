import { cn } from '@/lib/utils';

interface HomeFluxLogoProps {
  className?: string;
  iconOnly?: boolean;
}

export function HomeFluxLogo({ className, iconOnly = false }: HomeFluxLogoProps) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <svg
        width="28"
        height="28"
        viewBox="0 0 28 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        {/* Roof */}
        <path
          d="M14 3L26 13H22V24H16V17H12V24H6V13H2L14 3Z"
          fill="currentColor"
          className="text-primary"
        />
        {/* Door */}
        <rect x="11.5" y="17" width="5" height="7" rx="1" fill="white" opacity="0.9" />
      </svg>
      {!iconOnly && (
        <span className="font-bold text-[15px] tracking-tight text-sidebar-foreground">
          HomeFlux
        </span>
      )}
    </div>
  );
}

export function HomeFluxLogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M14 3L26 13H22V24H16V17H12V24H6V13H2L14 3Z"
        fill="currentColor"
      />
      <rect x="11.5" y="17" width="5" height="7" rx="1" fill="white" opacity="0.9" />
    </svg>
  );
}
