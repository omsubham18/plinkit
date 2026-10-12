import React from 'react';
import { OrderTimelineStep } from '@/types';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StatusTimelineProps {
  steps: OrderTimelineStep[];
  className?: string;
}

export const StatusTimeline: React.FC<StatusTimelineProps> = ({ steps, className }) => {
  return (
    <div className={cn('flex flex-col py-2 px-1', className)}>
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;

        return (
          <div key={step.status} className="flex gap-3.5 relative">
            {/* Step Icon & Vertical connecting line */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center shrink-0 z-10 transition-colors duration-state',
                  step.isCurrent
                    ? 'bg-brand text-surface ring-4 ring-brand-soft'
                    : step.isCompleted
                    ? 'bg-success text-surface'
                    : 'bg-canvas border border-line text-ink-3'
                )}
              >
                {step.isCompleted ? (
                  <Check size={14} strokeWidth={2.5} />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-current" />
                )}
              </div>

              {!isLast && (
                <div
                  className={cn(
                    'w-0.5 flex-1 min-h-[36px] my-1 transition-colors duration-state',
                    step.isCompleted ? 'bg-success' : 'bg-line'
                  )}
                />
              )}
            </div>

            {/* Step Label & Timestamp */}
            <div className={cn('pb-6 flex-1 flex flex-col justify-start', isLast && 'pb-1')}>
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    'type-body font-bold',
                    step.isCurrent
                      ? 'text-brand'
                      : step.isCompleted
                      ? 'text-ink'
                      : 'text-ink-3'
                  )}
                >
                  {step.label}
                </span>

                {step.time && (
                  <span className="type-caption text-ink-2 tabular-nums">
                    {step.time}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
