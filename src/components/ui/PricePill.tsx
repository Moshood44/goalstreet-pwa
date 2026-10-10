import React from 'react';
import { formatPrice, cn } from '../../lib/utils';

interface PricePillProps {
  price: number;
  direction?: 'up' | 'down' | 'same';
  size?: 'sm' | 'md' | 'lg';
  showCurrency?: boolean;
  className?: string;
}

export const PricePill: React.FC<PricePillProps> = ({
  price,
  direction = 'same',
  size = 'md',
  showCurrency = true,
  className,
}) => {
  const sizeClasses = {
    sm: 'text-[11px] px-1.5 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3.5 py-1.5 font-bold',
  };

  const directionClasses = {
    up: 'flash-up text-tertiary-container bg-tertiary-container/10 border-tertiary-container/30',
    down: 'flash-down text-error bg-error/10 border-error/30',
    same: 'text-on-surface bg-surface-container-high border-transparent',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 font-label-ticker rounded-full border transition-colors select-none font-bold',
        sizeClasses[size],
        directionClasses[direction],
        className
      )}
    >
      {showCurrency && <span className="select-none text-xs">🧢</span>}
      <span>{formatPrice(price)}</span>
      {direction === 'up' && <span className="text-[10px] text-tertiary-container">▲</span>}
      {direction === 'down' && <span className="text-[10px] text-error">▼</span>}
    </div>
  );
};
