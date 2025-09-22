'use client';

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import RecipeTypeSelector from "@/components/recipe/RecipeTypeSelector";

interface RecipeForm {
  title: string;
  description: string;
  content: string;
  imageUrl: string;
  prepTime: string;
  cookTime: string;
  servings: string;
  minimalServings: string;
  types: string[];
}

interface RecipeBasicInfoEditorProps {
  form: RecipeForm;
  onFormUpdate: (field: keyof RecipeForm, value: string | string[]) => void;
}

export default function RecipeBasicInfoEditor({
  form,
  onFormUpdate
}: RecipeBasicInfoEditorProps) {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Informations générales</h3>

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

        <div className="grid grid-cols-2 gap-3">
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
        </div>

        <div className="grid grid-cols-2 gap-3">
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

          <div>
            <label className="block text-sm font-medium mb-1">
              Minimum à acheter
            </label>
            <Input
              value={form.minimalServings}
              onChange={(e) => onFormUpdate('minimalServings', e.target.value)}
              placeholder="4"
              type="number"
              min="1"
            />
            <p className="text-xs text-gray-500 mt-1">
              Nombre minimum de portions à acheter (ex: quiche pour 4 même si 1 seule portion nécessaire)
            </p>
          </div>
        </div>

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

        <div>
          <label className="block text-sm font-medium mb-1">
            Contenu/Instructions (Markdown)
          </label>
          <textarea
            value={form.content}
            onChange={(e) => onFormUpdate('content', e.target.value)}
            placeholder="Décrivez votre recette en détail..."
            rows={8}
            className="w-full p-3 border border-gray-300 rounded-md text-sm resize-y focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
          <p className="text-sm text-gray-500 mt-1">
            Vous pouvez utiliser le format Markdown pour formater votre texte
          </p>
        </div>
      </div>
    </Card>
  );
}