'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChefHat, ShoppingCart, Download, Share2, Check, Calendar, ArrowLeft } from "lucide-react";
import { api } from "@/components/providers/trpc-provider";
import Link from "next/link";

const TEMP_PROJECT_ID = 'temp-project-1';

export default function ShoppingListPage() {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  const getWeekStart = (date: Date) => {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(start.setDate(diff));
  };

  const weekStart = getWeekStart(currentWeek);

  const { data: shoppingList = [], isLoading } = api.mealPlan.generateShoppingList.useQuery({
    projectId: TEMP_PROJECT_ID,
    weekStart,
  });

  const formatWeekRange = (weekStart: Date) => {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    return `${weekStart.toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'long' 
    })} - ${weekEnd.toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'long',
      year: 'numeric'
    })}`;
  };

  const toggleItem = (ingredientId: string) => {
    const newChecked = new Set(checkedItems);
    if (newChecked.has(ingredientId)) {
      newChecked.delete(ingredientId);
    } else {
      newChecked.add(ingredientId);
    }
    setCheckedItems(newChecked);
  };

  const groupedIngredients = shoppingList.reduce((acc, item) => {
    const category = item.ingredient.category || 'Autres';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, typeof shoppingList>);

  const exportToText = () => {
    const content = [
      `# Liste de courses - ${formatWeekRange(weekStart)}`,
      '',
      ...Object.entries(groupedIngredients).map(([category, items]) => [
        `## ${category}`,
        ...items.map(item => {
          const notes = item.notes.length > 0 ? ` (${item.notes.join(', ')})` : '';
          return `- ${item.ingredient.name}: ${item.totalQuantity} ${item.ingredient.unit}${notes}`;
        }),
        ''
      ]).flat()
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `liste-de-courses-${weekStart.toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const shareList = async () => {
    const content = [
      `Liste de courses - ${formatWeekRange(weekStart)}`,
      '',
      ...Object.entries(groupedIngredients).map(([category, items]) => [
        `${category}:`,
        ...items.map(item => {
          const notes = item.notes.length > 0 ? ` (${item.notes.join(', ')})` : '';
          return `• ${item.ingredient.name}: ${item.totalQuantity} ${item.ingredient.unit}${notes}`;
        }),
        ''
      ]).flat()
    ].join('\n');

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Liste de courses - My Little Cook',
          text: content,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback to clipboard
      await navigator.clipboard.writeText(content);
      alert('Liste copiée dans le presse-papiers!');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Link href="/planning">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour au planning
              </Button>
            </Link>
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Liste de Courses</h2>
              <div className="flex items-center text-gray-600">
                <Calendar className="h-4 w-4 mr-2" />
                <span>Semaine du {formatWeekRange(weekStart)}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button variant="outline" onClick={shareList}>
              <Share2 className="h-4 w-4 mr-2" />
              Partager
            </Button>
            <Button variant="outline" onClick={exportToText}>
              <Download className="h-4 w-4 mr-2" />
              Télécharger
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <Card className="p-8">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="space-y-2">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="h-3 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* Shopping List */}
        {!isLoading && (
          <>
            {shoppingList.length === 0 ? (
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
            ) : (
              <div className="space-y-6">
                {/* Summary Card */}
                <Card className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Résumé de la liste
                      </h3>
                      <p className="text-gray-600">
                        {shoppingList.length} ingrédients à acheter
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-orange-600">
                        {checkedItems.size}/{shoppingList.length}
                      </div>
                      <div className="text-sm text-gray-600">complétés</div>
                    </div>
                  </div>
                </Card>

                {/* Ingredients by Category */}
                {Object.entries(groupedIngredients).map(([category, ingredients]) => (
                  <Card key={category} className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <div className="w-3 h-3 bg-orange-600 rounded-full mr-2"></div>
                      {category}
                    </h3>
                    
                    <div className="space-y-3">
                      {ingredients.map((item) => {
                        const isChecked = checkedItems.has(item.ingredient.id);
                        const notes = item.notes.length > 0 ? ` (${item.notes.join(', ')})` : '';
                        
                        return (
                          <div
                            key={item.ingredient.id}
                            className={`flex items-center space-x-3 p-3 rounded-lg border-2 transition-colors cursor-pointer ${
                              isChecked
                                ? 'bg-green-50 border-green-200'
                                : 'bg-white border-gray-200 hover:border-gray-300'
                            }`}
                            onClick={() => toggleItem(item.ingredient.id)}
                          >
                            <div
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                                isChecked
                                  ? 'bg-green-600 border-green-600'
                                  : 'border-gray-300 hover:border-green-400'
                              }`}
                            >
                              {isChecked && (
                                <Check className="h-3 w-3 text-white" />
                              )}
                            </div>
                            
                            <div className="flex-1">
                              <div className={`font-medium transition-all ${
                                isChecked 
                                  ? 'text-green-800 line-through' 
                                  : 'text-gray-900'
                              }`}>
                                {item.ingredient.name}
                              </div>
                              <div className={`text-sm transition-all ${
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
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Progression</span>
                    <span className="text-sm font-medium text-gray-700">
                      {Math.round((checkedItems.size / shoppingList.length) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-orange-600 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${(checkedItems.size / shoppingList.length) * 100}%`
                      }}
                    ></div>
                  </div>
                </Card>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}