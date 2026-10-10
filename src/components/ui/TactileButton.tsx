import React from 'react';
import { cn } from '../../lib/utils';

interface TactileButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'surface' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export const TactileButton: React.FC<TactileButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className,
  disabled,
  ...props
}) => {
  const baseStyles = 'font-headline-sm rounded-xl font-bold flex items-center justify-center gap-2 transition-all select-none active:translate-y-[2px] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:active:translate-y-0';

  const variants = {
    primary: 'bg-primary-container text-on-primary shadow-[0_3px_0_0_#4500D8] active:shadow-[0_1px_0_0_#4500D8]',
    secondary: 'bg-secondary-container text-on-secondary-fixed shadow-[0_3px_0_0_#F5BF34] active:shadow-[0_1px_0_0_#F5BF34]',
    surface: 'bg-surface-container-lowest text-on-surface shadow-[0_3px_0_0_#E9E8E4] active:shadow-[0_1px_0_0_#E9E8E4] hover:bg-surface-container-low',
    danger: 'bg-error text-on-error shadow-[0_3px_0_0_#93000A] active:shadow-[0_1px_0_0_#93000A]',
    outline: 'border border-outline-variant bg-transparent text-on-surface hover:bg-surface-container active:shadow-none',
  };

  const sizes = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-11 px-4 text-sm',
    lg: 'h-13 px-6 text-base',
  };

  return (
    <button
      disabled={disabled}
      className={cn(baseStyles, variants[variant], sizes[size], fullWidth && 'w-full', className)}
      {...props}
    >
      {children}
    </button>
  );
};
