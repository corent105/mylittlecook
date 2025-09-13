'use client';

import { getRecipeTypeLabel, getRecipeTypeEmoji, getRecipeTypeColor, RECIPE_TYPES } from '@/lib/constants/recipe-types';

interface RecipeTypeBadgeProps {
  type: keyof typeof RECIPE_TYPES;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function RecipeTypeBadge({ type, size = 'sm', className = '' }: RecipeTypeBadgeProps) {
  const label = getRecipeTypeLabel(type);
  const emoji = getRecipeTypeEmoji(type);
  const colorClasses = getRecipeTypeColor(type);

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-medium ${colorClasses} ${sizeClasses[size]} ${className}`}
    >
      <span className="leading-none">{emoji}</span>
      <span>{label}</span>
    </span>
  );
}