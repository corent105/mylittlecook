'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ShoppingCart, Check } from "lucide-react";
import Link from "next/link";

interface ShoppingListContentProps {
  shoppingList: any[];
  checkedItems: Set<string>;
  onToggleItem: (ingredientId: string) => void;
  cookFilter: string;
  availableCooks: Array<{ id: string; pseudo: string }>;
}

export default function ShoppingListContent({
  shoppingList,
  checkedItems,
  onToggleItem,
  cookFilter,
  availableCooks
}: ShoppingListContentProps) {
  const groupedIngredients = shoppingList.reduce((acc, item) => {
    const category = item.ingredient.category || 'Autres';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, typeof shoppingList>);

  if (shoppingList.length === 0) {
    return (
      <Card className="p-12 text-center">
        <ShoppingCart className="h-24 w-24 text-gray-300 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Aucun ingrédient trouvé
        </h3>
        <p className="text-gray-600 mb-6">
          Il n'y a pas de repas planifiés pour cette semaine avec des ingrédients définis.
        </p>
        <Link href="/planning">
          <Button className="bg-orange-600 hover:bg-orange-700">
            Aller au planning
          </Button>
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card className="p-4 sm:p-6">
        <div className="space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between">
          <div className="flex-1">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">
              Résumé de la liste
              {cookFilter !== 'all' && (
                <span className="block sm:inline text-sm font-normal text-orange-600 sm:ml-2">
                  (Filtré par {availableCooks.find(c => c.id === cookFilter)?.pseudo})
                </span>
              )}
            </h3>
            <p className="text-sm sm:text-base text-gray-600">
              {shoppingList.length} ingrédients à acheter
              {cookFilter !== 'all' && availableCooks.length > 0 && (
                <span className="block sm:inline text-sm text-orange-600 sm:ml-1">
                  - {availableCooks.find(c => c.id === cookFilter)?.pseudo} 👨‍🍳
                </span>
              )}
            </p>
          </div>
          <div className="text-center sm:text-right">
            <div className="text-xl sm:text-2xl font-bold text-orange-600">
              {checkedItems.size}/{shoppingList.length}
            </div>
            <div className="text-sm text-gray-600">complétés</div>
          </div>
        </div>
      </Card>

      {/* Ingredients by Category */}
      {Object.entries(groupedIngredients).map(([category, ingredients]) => (
        <Card key={category} className="p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
            <div className="w-3 h-3 bg-orange-600 rounded-full mr-2"></div>
            {category}
          </h3>

          <div className="space-y-2 sm:space-y-3">
            {(ingredients as any[]).map((item: any) => {
              const isChecked = checkedItems.has(item.ingredient.id);
              const notes = item.notes.length > 0 ? ` (${item.notes.join(', ')})` : '';

              return (
                <div
                  key={item.ingredient.id}
                  className={`flex items-center space-x-3 p-3 rounded-lg border-2 transition-colors cursor-pointer active:scale-95 ${
                    isChecked
                      ? 'bg-green-50 border-green-200'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => onToggleItem(item.ingredient.id)}
                >
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                      isChecked
                        ? 'bg-green-600 border-green-600'
                        : 'border-gray-300 hover:border-green-400'
                    }`}
                  >
                    {isChecked && (
                      <Check className="h-3 w-3 text-white" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className={`font-medium transition-all text-sm sm:text-base ${
                      isChecked
                        ? 'text-green-800 line-through'
                        : 'text-gray-900'
                    }`}>
                      {item.ingredient.name}
                    </div>
                    <div className={`text-xs sm:text-sm transition-all ${
                      isChecked
                        ? 'text-green-600'
                        : 'text-gray-600'
                    }`}>
                      {item.totalQuantity} {item.ingredient.unit}{notes}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ))}

      {/* Progress Bar */}
      <Card className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Progression</span>
          <span className="text-sm font-medium text-gray-700">
            {Math.round((checkedItems.size / shoppingList.length) * 100)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3">
          <div
            className="bg-orange-600 h-2 sm:h-3 rounded-full transition-all duration-300"
            style={{
              width: `${(checkedItems.size / shoppingList.length) * 100}%`
            }}
          ></div>
        </div>
      </Card>
    </div>
  );
}