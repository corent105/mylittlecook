'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { RECIPE_TYPE_OPTIONS, RECIPE_TYPES } from '@/lib/constants/recipe-types';
import RecipeTypeBadge from './RecipeTypeBadge';

interface RecipeTypeSelectorProps {
  selectedTypes: string[];
  onTypesChange: (types: string[]) => void;
  maxSelections?: number;
  className?: string;
}

export default function RecipeTypeSelector({
  selectedTypes,
  onTypesChange,
  maxSelections,
  className = ''
}: RecipeTypeSelectorProps) {
  const handleTypeToggle = (typeValue: string) => {
    const isSelected = selectedTypes.includes(typeValue);

    if (isSelected) {
      // Remove the type
      onTypesChange(selectedTypes.filter(t => t !== typeValue));
    } else {
      // Add the type (if not at max limit)
      if (!maxSelections || selectedTypes.length < maxSelections) {
        onTypesChange([...selectedTypes, typeValue]);
      }
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex flex-wrap gap-2">
        {RECIPE_TYPE_OPTIONS.map((recipeType) => {
          const isSelected = selectedTypes.includes(recipeType.value);
          const isDisabled = Boolean(maxSelections && selectedTypes.length >= maxSelections && !isSelected);

          return (
            <Button
              key={recipeType.value}
              type="button"
              variant={isSelected ? "default" : "outline"}
              size="sm"
              disabled={isDisabled}
              onClick={() => handleTypeToggle(recipeType.value)}
              className={`${isSelected ? 'bg-orange-600 hover:bg-orange-700 border-orange-600' : 'hover:border-orange-300'} ${isDisabled ? 'opacity-50' : ''}`}
            >
              <span className="mr-1">{recipeType.emoji}</span>
              {recipeType.label}
            </Button>
          );
        })}
      </div>

      {selectedTypes.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Types sélectionnés :</p>
          <div className="flex flex-wrap gap-1">
            {selectedTypes.map((typeValue) => {
              const recipeType = Object.values(RECIPE_TYPES).find(rt => rt.value === typeValue);
              return recipeType ? (
                <RecipeTypeBadge
                  key={typeValue}
                  type={typeValue as keyof typeof RECIPE_TYPES}
                  size="sm"
                />
              ) : null;
            })}
          </div>
        </div>
      )}

      {maxSelections && (
        <p className="text-xs text-gray-500">
          {selectedTypes.length}/{maxSelections} type{maxSelections > 1 ? 's' : ''} sélectionné{maxSelections > 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}