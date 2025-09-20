'use client';

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";

interface EditableIngredient {
  id: string;
  quantity: number;
  unit: string;
  name: string;
  notes?: string;
  category?: string;
}

interface IngredientsEditorProps {
  ingredients: EditableIngredient[];
  onIngredientsChange: (ingredients: EditableIngredient[]) => void;
}

export default function IngredientsEditor({
  ingredients,
  onIngredientsChange
}: IngredientsEditorProps) {
  const addIngredient = () => {
    const newIngredient: EditableIngredient = {
      id: `ingredient-${ingredients.length}`,
      quantity: 1,
      unit: 'pièce',
      name: '',
      notes: '',
      category: 'autres'
    };
    onIngredientsChange([...ingredients, newIngredient]);
  };

  const updateIngredient = (index: number, field: keyof EditableIngredient, value: string | number) => {
    const updated = ingredients.map((ing, idx) =>
      idx === index ? { ...ing, [field]: value } : ing
    );
    onIngredientsChange(updated);
  };

  const removeIngredient = (index: number) => {
    const updated = ingredients.filter((_, idx) => idx !== index);
    onIngredientsChange(updated);
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Ingrédients</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={addIngredient}
        >
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un ingrédient
        </Button>
      </div>

      <div className="space-y-3">
        {ingredients.map((ingredient, index) => (
          <div key={ingredient.id} className="grid grid-cols-12 gap-3 items-center p-3 bg-gray-50 rounded-lg">
            <div className="col-span-2">
              <Input
                type="number"
                value={ingredient.quantity}
                onChange={(e) => updateIngredient(index, 'quantity', parseFloat(e.target.value) || 0)}
                placeholder="Qté"
                step="0.1"
                min="0"
                className="text-sm"
              />
            </div>
            <div className="col-span-2">
              <Input
                value={ingredient.unit}
                onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                placeholder="Unité"
                className="text-sm"
              />
            </div>
            <div className="col-span-4">
              <Input
                value={ingredient.name}
                onChange={(e) => updateIngredient(index, 'name', e.target.value)}
                placeholder="Nom de l'ingrédient"
                className="text-sm"
              />
            </div>
            <div className="col-span-3">
              <Input
                value={ingredient.notes || ''}
                onChange={(e) => updateIngredient(index, 'notes', e.target.value)}
                placeholder="Notes (optionnel)"
                className="text-sm"
              />
            </div>
            <div className="col-span-1 flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeIngredient(index)}
                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {ingredients.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">Aucun ingrédient ajouté</p>
          <p className="text-xs mt-1">Cliquez sur "Ajouter un ingrédient" pour commencer</p>
        </div>
      )}
    </Card>
  );
}