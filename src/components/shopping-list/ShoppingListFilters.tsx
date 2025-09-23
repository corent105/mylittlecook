'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calendar, Clock } from "lucide-react";
import type { ShoppingListFilters, ShoppingListFilterActions, DateFilterType } from "@/types/shopping-list-filters";

interface ShoppingListFiltersProps {
  filters: ShoppingListFilters;
  filterActions: ShoppingListFilterActions;
  availableCooks: Array<{ id: string; pseudo: string }>;
  formatDateRange: () => string;
  weekMealPlans: any[];
}

export default function ShoppingListFilters({
  filters,
  filterActions,
  availableCooks,
  formatDateRange,
  weekMealPlans
}: ShoppingListFiltersProps) {
  const handleDateFilterChange = (newFilter: DateFilterType) => {
    filterActions.setDateFilter(newFilter);

    if (newFilter === 'custom' && (!filters.customStartDate || !filters.customEndDate)) {
      const today = new Date();
      const weekStart = new Date(today);
      const day = weekStart.getDay();
      const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
      weekStart.setDate(diff);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      filterActions.setCustomStartDate(weekStart.toISOString().split('T')[0]);
      filterActions.setCustomEndDate(weekEnd.toISOString().split('T')[0]);
    }
  };

  return (
    <>
      {/* Period Filter Section */}
      <Card className="mb-6 sm:mb-8 p-4">
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Période de génération</h3>
            <p className="text-sm text-gray-600">
              Choisissez la période pour laquelle générer la liste de courses
            </p>
            {process.env.NODE_ENV === 'development' && weekMealPlans.length > 0 && (
              <div className="text-xs text-blue-600 mt-1 font-mono bg-blue-50 px-2 py-1 rounded">
                Debug: {weekMealPlans.length} recettes trouvées |
                Exemples: {weekMealPlans.slice(0, 2).map(mp => {
                  const mealDate = new Date(mp.mealDate);
                  return mealDate.toLocaleDateString('fr-FR');
                }).join(', ')}
              </div>
            )}
          </div>

          {/* Quick Filter Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={filters.dateFilter === 'today' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleDateFilterChange('today')}
              className="flex items-center gap-2"
            >
              <Clock className="h-4 w-4" />
              Aujourd'hui
            </Button>
            <Button
              variant={filters.dateFilter === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleDateFilterChange('week')}
              className="flex items-center gap-2"
            >
              <Calendar className="h-4 w-4" />
              7 jours
            </Button>
            <Button
              variant={filters.dateFilter === 'twoWeeks' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleDateFilterChange('twoWeeks')}
              className="flex items-center gap-2"
            >
              <Calendar className="h-4 w-4" />
              14 jours
            </Button>
            <Button
              variant={filters.dateFilter === 'custom' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleDateFilterChange('custom')}
              className="flex items-center gap-2"
            >
              <Calendar className="h-4 w-4" />
              Personnalisé
            </Button>
          </div>

          {/* Custom Date Range */}
          {filters.dateFilter === 'custom' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date de début
                </label>
                <Input
                  type="date"
                  value={filters.customStartDate}
                  onChange={(e) => filterActions.setCustomStartDate(e.target.value)}
                  className="w-full"
                  max={filters.customEndDate || undefined}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date de fin
                </label>
                <Input
                  type="date"
                  value={filters.customEndDate}
                  onChange={(e) => filterActions.setCustomEndDate(e.target.value)}
                  className="w-full"
                  min={filters.customStartDate || undefined}
                />
              </div>
              {filters.customStartDate && filters.customEndDate && new Date(filters.customStartDate) > new Date(filters.customEndDate) && (
                <div className="col-span-full">
                  <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md border border-red-200">
                    ⚠️ La date de début ne peut pas être postérieure à la date de fin
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Cook Filter Section */}
      {availableCooks.length > 0 && (
        <Card className="mb-6 sm:mb-8 p-4">
          <div className="space-y-4 md:space-y-0 md:flex md:items-center md:justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Filtrer par responsable de cuisine</h3>
              <p className="text-sm text-gray-600">
                Afficher les recettes et ingrédients pour un cuisinier spécifique ou pour tous
              </p>
            </div>
            <div className="w-full md:w-48">
              <Select value={filters.cookFilter} onValueChange={filterActions.setCookFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un filtre" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    🛒 Tous les ingrédients
                  </SelectItem>
                  {availableCooks.map((cook) => (
                    <SelectItem key={cook.id} value={cook.id}>
                      👨‍🍳 {cook.pseudo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>
      )}
    </>
  );
}