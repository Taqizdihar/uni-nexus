import React from 'react';
import { cn } from '../../lib/utils';

export const Card: React.FC<{ className?: string, children?: React.ReactNode }> = ({ className, children }) => {
  return (
    <div className={cn("bg-white rounded-xl border border-[var(--nexus-border)] card-shadow overflow-hidden", className)}>
      {children}
    </div>
  );
}

export const CardHeader: React.FC<{ className?: string, children?: React.ReactNode }> = ({ className, children }) => {
  return (
    <div className={cn("px-6 py-4 border-b border-[var(--nexus-border)]", className)}>
      {children}
    </div>
  );
}

export const CardTitle: React.FC<{ className?: string, children?: React.ReactNode }> = ({ className, children }) => {
  return (
    <h3 className={cn("text-lg font-semibold text-[var(--nexus-charcoal)]", className)}>
      {children}
    </h3>
  );
}

export const CardContent: React.FC<{ className?: string, children?: React.ReactNode }> = ({ className, children }) => {
  return (
    <div className={cn("p-6", className)}>
      {children}
    </div>
  );
}
