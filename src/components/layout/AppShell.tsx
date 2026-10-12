import React from 'react';
import { Outlet } from 'react-router-dom';
import { cn } from '@/lib/utils';

export interface AppShellProps {
  children?: React.ReactNode;
  className?: string;
  hasFloatingBar?: boolean;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  className,
  hasFloatingBar = true,
}) => {
  return (
    <div className="min-h-screen w-full bg-canvas flex justify-center selection:bg-brand-soft selection:text-brand">
      {/* Centred 480 px column container on canvas background */}
      <div
        className={cn(
          'w-full max-w-[480px] min-h-screen bg-surface relative flex flex-col',
          'border-x border-line/50 md:shadow-sm',
          hasFloatingBar && 'pb-24',
          className
        )}
      >
        {children || <Outlet />}
      </div>
    </div>
  );
};
