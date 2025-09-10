'use client';

import { ChannelTag } from '@/types';
import { X } from 'lucide-react';
import { withLightOpacity, withMediumOpacity } from '@/utils/colorUtils';

interface TagBadgeProps {
  tag: ChannelTag;
  size?: 'sm' | 'md' | 'lg';
  removable?: boolean;
  onRemove?: () => void;
  onClick?: (event: React.MouseEvent | React.KeyboardEvent) => void;
}

export function TagBadge({
  tag,
  size = 'md',
  removable = false,
  onRemove,
  onClick,
}: TagBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2',
  };

  const iconSizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  const handleClick = (event: React.MouseEvent) => {
    if (removable && onRemove) {
      event.stopPropagation();
      return;
    }
    onClick?.(event);
  };

  const handleRemove = (event: React.MouseEvent) => {
    event.stopPropagation();
    onRemove?.();
  };

  return (
    <span
      className={`
        TagBadge inline-flex items-center gap-1.5 rounded-full font-medium
        transition-all duration-200 select-none
        ${sizeClasses[size]}
        ${onClick && !removable ? 'cursor-pointer hover:shadow-md' : ''}
        ${removable ? 'pr-1.5' : ''}
      `}
      style={{
        backgroundColor: withLightOpacity(tag.color),
        color: tag.color,
        border: `1px solid ${withMediumOpacity(tag.color)}`,
      }}
      onClick={handleClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(keyEvent) => {
        if (onClick && keyEvent.key === 'Enter') {
          keyEvent.preventDefault();
          onClick(keyEvent);
        }
      }}
    >
      <span className="truncate">{tag.name}</span>
      {removable && (
        <button
          onClick={handleRemove}
          className={`
            TagBadge__remove-button flex items-center justify-center rounded-full
            transition-colors duration-150
            hover:bg-current hover:bg-opacity-20
            focus:outline-none focus:ring-2 focus:ring-current focus:ring-opacity-50
            ${iconSizeClasses[size]}
          `}
          aria-label={`Remove ${tag.name} tag`}
          type="button"
        >
          <X className={iconSizeClasses[size]} />
        </button>
      )}
    </span>
  );
}