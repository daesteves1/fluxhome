'use client';

import { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { HomeFluxLogoMark } from '@/components/layout/homeflux-logo';
import { cn } from '@/lib/utils';

export interface StepDef {
  id: string;
  name: string;
  subtitle: string;
}

export interface VerticalStepperProps {
  steps: StepDef[];
  currentStep: number;
  /** Booleans parallel to steps[] — true means step shows checkmark */
  completedSteps: boolean[];
  onStepClick: (index: number) => void;
  children: React.ReactNode;
  onNext: () => void;
  onPrev: () => void;
  onCancel: () => void;
  isLastStep: boolean;
  isSubmitting: boolean;
  /** Text for the primary CTA button, e.g. "Criar cliente" on last step */
  nextLabel?: string;
  /** Title shown in the right panel */
  stepTitle: string;
  /** Description shown below the title */
  stepDescription: string;
  /** Office logo URL (optional) */
  logoUrl?: string;
  /** Office name shown if no logo */
  officeName?: string;
}

export function VerticalStepper({
  steps,
  currentStep,
  completedSteps,
  onStepClick,
  children,
  onNext,
  onPrev,
  onCancel,
  isLastStep,
  isSubmitting,
  nextLabel,
  stepTitle,
  stepDescription,
  logoUrl,
  officeName,
}: VerticalStepperProps) {
  const [cancelOpen, setCancelOpen] = useState(false);

  const progressPct = steps.length > 1
    ? (currentStep / (steps.length - 1)) * 100
    : 0;

  function handleCancelConfirm() {
    setCancelOpen(false);
    onCancel();
  }

  return (
    <>
      {/* ── Layout ────────────────────────────────────────────────── */}
      {/*  Negative margins counteract the shell's px-4 sm:px-6 / py-4 sm:py-6 */}
      <div className="-mx-4 sm:-mx-6 -mt-4 sm:-mt-6 -mb-4 sm:-mb-6 flex overflow-hidden"
        style={{ minHeight: 'calc(100vh - 64px)' }}
      >
        {/* ── Left sidebar ────────────────────────────────────────── */}
        <aside className="hidden md:flex w-[240px] shrink-0 flex-col bg-white border-r border-slate-100">
          {/* Logo area */}
          <div className="px-5 py-5 border-b border-slate-100">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={officeName ?? 'Logo'} className="h-8 object-contain" />
            ) : (
              <div className="flex items-center gap-2">
                <HomeFluxLogoMark size={28} />
                <span className="text-sm font-semibold text-slate-700 truncate">
                  {officeName ?? 'HomeFlux'}
                </span>
              </div>
            )}
          </div>

          {/* Steps list — scrollable */}
          <div className="flex-1 overflow-y-auto py-4 px-3 relative">
            {/* Vertical progress line on left edge of steps */}
            <div className="absolute left-[28px] top-[32px] bottom-[32px] w-0.5 bg-slate-100" />
            <div
              className="absolute left-[28px] top-[32px] w-0.5 bg-primary transition-all duration-500"
              style={{ height: `${progressPct}%` }}
            />

            <ol className="space-y-1 relative">
              {steps.map((step, i) => {
                const isCompleted = completedSteps[i] ?? false;
                const isActive = i === currentStep;
                const isPast = isCompleted && i < currentStep;
                const canClick = isPast || isCompleted;

                return (
                  <li key={step.id}>
                    <button
                      type="button"
                      disabled={!canClick && !isActive}
                      onClick={() => canClick ? onStepClick(i) : undefined}
                      className={cn(
                        'w-full flex items-start gap-3 px-2 py-2.5 rounded-lg text-left transition-colors',
                        isActive && 'bg-primary/5',
                        canClick && !isActive && 'hover:bg-slate-50 cursor-pointer',
                        !canClick && !isActive && 'cursor-default',
                      )}
                    >
                      {/* Step number / check circle */}
                      <div className={cn(
                        'mt-0.5 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold z-10 relative',
                        isActive && 'bg-primary text-white',
                        isPast && 'bg-emerald-500 text-white',
                        !isActive && !isPast && 'border-2 border-slate-200 text-slate-400 bg-white',
                      )}>
                        {isPast ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <span>{i + 1}</span>
                        )}
                      </div>

                      {/* Labels */}
                      <div className="min-w-0 flex-1">
                        <p className={cn(
                          'text-sm leading-tight',
                          isActive ? 'font-medium text-slate-900' : 'font-normal text-slate-500',
                        )}>
                          {step.name}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5 leading-tight truncate">
                          {step.subtitle}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* Cancel link at bottom */}
          <div className="px-5 py-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCancelOpen(true)}
              className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </aside>

        {/* ── Right content area ──────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-50">
          {/* Mobile progress bar (visible < md) */}
          <div className="md:hidden bg-white border-b border-slate-100 px-4 py-3">
            <div className="flex items-center justify-between text-sm text-slate-500 mb-2">
              <span className="font-medium text-slate-800">{stepTitle}</span>
              <span>{currentStep + 1} / {steps.length}</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Step title + content */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto px-6 pt-8 pb-32">
              {/* Step header */}
              <div className="mb-6">
                <h2 className="text-[22px] font-semibold text-slate-900">{stepTitle}</h2>
                <p className="text-sm text-slate-500 mt-1">{stepDescription}</p>
              </div>

              {/* Form content injected here */}
              {children}
            </div>
          </div>

          {/* ── Sticky action bar ────────────────────────────────── */}
          <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-between gap-3">
            {/* Anterior */}
            <div>
              {currentStep > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onPrev}
                  disabled={isSubmitting}
                >
                  Anterior
                </Button>
              )}
            </div>

            {/* Seguinte / Submit */}
            <Button
              type="button"
              onClick={onNext}
              disabled={isSubmitting}
              className="min-w-[140px]"
            >
              {isSubmitting ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />A guardar…</>
              ) : isLastStep ? (
                nextLabel ?? 'Confirmar'
              ) : (
                'Seguinte'
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Cancel confirmation dialog ───────────────────────────── */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar processo?</DialogTitle>
            <DialogDescription>
              Tem a certeza? Os dados não serão guardados.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>
              Continuar a preencher
            </Button>
            <Button variant="destructive" onClick={handleCancelConfirm}>
              Sim, cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
