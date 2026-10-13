import React from 'react';
import { Outlet } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { AppFooter } from './AppFooter';
import { OfflineBanner } from '@/components/common/OfflineScreen';
import { PwaUpdatePrompt } from '@/components/common/PwaUpdatePrompt';

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
        <OfflineBanner />
        <main className="flex-1 flex flex-col">
          {children || <Outlet />}
        </main>
        <AppFooter />
        <PwaUpdatePrompt />
      </div>
    </div>
  );
};
