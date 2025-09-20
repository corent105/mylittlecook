'use client';

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import RecipeTypeSelector from "@/components/recipe/RecipeTypeSelector";
import type { ExtractedRecipe } from '@/lib/recipe-extractor';

interface RecipeForm {
  title: string;
  description: string;
  content: string;
  imageUrl: string;
  prepTime: string;
  cookTime: string;
  servings: string;
  sourceUrl: string;
  types: string[];
}

interface RecipeInfoEditorProps {
  extractedRecipe: ExtractedRecipe;
  form: RecipeForm;
  onFormUpdate: (field: keyof RecipeForm, value: string | string[]) => void;
}

export default function RecipeInfoEditor({
  extractedRecipe,
  form,
  onFormUpdate
}: RecipeInfoEditorProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Left Column - Original Site Preview */}
      <div>
        <Card className="h-full">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="text-lg font-semibold">Site Original</h3>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(extractedRecipe.sourceUrl, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Ouvrir
              </Button>
            </div>
          </div>
          <div className="p-0">
            <iframe
              src={extractedRecipe.sourceUrl}
              className="w-full h-96 border-0"
              title="Aperçu de la recette originale"
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
        </Card>
      </div>

      {/* Right Column - Recipe Info */}
      <div>
        <Card className="p-6 h-full">
          <h3 className="text-lg font-semibold mb-4">Informations de la recette</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Titre de la recette *
              </label>
              <Input
                value={form.title}
                onChange={(e) => onFormUpdate('title', e.target.value)}
                placeholder="Titre de la recette"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Description courte
              </label>
              <Input
                value={form.description}
                onChange={(e) => onFormUpdate('description', e.target.value)}
                placeholder="Description de la recette"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                URL de l'image
              </label>
              <Input
                value={form.imageUrl}
                onChange={(e) => onFormUpdate('imageUrl', e.target.value)}
                placeholder="https://..."
                type="url"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Préparation (min)
                </label>
                <Input
                  value={form.prepTime}
                  onChange={(e) => onFormUpdate('prepTime', e.target.value)}
                  placeholder="15"
                  type="number"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Cuisson (min)
                </label>
                <Input
                  value={form.cookTime}
                  onChange={(e) => onFormUpdate('cookTime', e.target.value)}
                  placeholder="30"
                  type="number"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Personnes
                </label>
                <Input
                  value={form.servings}
                  onChange={(e) => onFormUpdate('servings', e.target.value)}
                  placeholder="4"
                  type="number"
                  min="1"
                />
              </div>
            </div>

            {/* Recipe Types */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Types de recette <span className="text-red-500">*</span>
              </label>
              <RecipeTypeSelector
                selectedTypes={form.types}
                onTypesChange={(types) => onFormUpdate('types', types)}
              />
              {form.types.length === 0 && (
                <p className="text-sm text-red-500 mt-1">
                  Veuillez sélectionner au moins un type de recette
                </p>
              )}
            </div>

            {/* Extraction Summary */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Résumé de l'extraction</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <div>✅ Titre: {extractedRecipe.title}</div>
                <div>✅ Ingrédients: {extractedRecipe.ingredients?.length || 0} trouvés</div>
                <div>✅ Étapes: {extractedRecipe.steps?.length || extractedRecipe.instructions?.length || 0} trouvées</div>
                {extractedRecipe.prepTime && <div>✅ Temps de préparation: {extractedRecipe.prepTime} min</div>}
                {extractedRecipe.servings && <div>✅ Portions: {extractedRecipe.servings} personnes</div>}
                {extractedRecipe.imageUrl && <div>✅ Image trouvée</div>}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}