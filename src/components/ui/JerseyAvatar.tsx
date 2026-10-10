import React from 'react';
import { cn } from '../../lib/utils';

interface JerseyAvatarProps {
  jerseyNumber: number;
  position?: 'FWD' | 'MID' | 'DEF' | 'GK';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const JerseyAvatar: React.FC<JerseyAvatarProps> = ({
  jerseyNumber,
  position = 'FWD',
  size = 'md',
  className,
}) => {
  const sizeStyles = {
    sm: 'w-7 h-7 text-xs shadow-[0_2px_0_0_#DCD9D0]',
    md: 'w-10 h-10 text-sm shadow-[0_2px_0_0_#C9C4D9]',
    lg: 'w-13 h-13 text-base shadow-[0_3px_0_0_#C9C4D9]',
    xl: 'w-16 h-16 text-xl shadow-[0_4px_0_0_#A9A4B9]',
  };

  const positionAccents = {
    FWD: 'bg-primary-fixed text-primary border-primary/30',
    MID: 'bg-secondary-fixed text-on-secondary-fixed border-secondary-container/40',
    DEF: 'bg-tertiary-fixed text-tertiary border-tertiary/30',
    GK: 'bg-surface-container-high text-on-surface border-outline-variant',
  };

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-display-lg font-black border select-none shrink-0 transition-transform',
        sizeStyles[size],
        positionAccents[position],
        className
      )}
    >
      <span>#{jerseyNumber}</span>
    </div>
  );
};
