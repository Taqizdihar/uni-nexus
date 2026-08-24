import React from 'react';
import { cn } from '../../lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    const variants = {
      primary: "bg-[var(--nexus-yellow)] text-black hover:bg-[var(--nexus-yellow-deep)] font-semibold",
      secondary: "bg-[var(--nexus-charcoal)] text-white hover:bg-black",
      outline: "border border-[var(--nexus-border)] bg-transparent hover:bg-gray-50 text-[var(--nexus-charcoal)]",
      ghost: "bg-transparent hover:bg-gray-100 text-gray-700",
    };

    const sizes = {
      sm: "h-8 px-3 text-xs",
      md: "h-10 px-4 py-2 text-sm",
      lg: "h-12 px-8 text-base",
    };

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-lg transition-all duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--nexus-yellow)]/30 disabled:opacity-50 disabled:pointer-events-none",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
