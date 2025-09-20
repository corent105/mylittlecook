'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Save } from "lucide-react";
import { api } from "@/components/providers/trpc-provider";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ExtractedRecipe, ExtractedRecipeStep } from '@/lib/recipe-extractor';
import { RecipeCategoryType } from '@prisma/client';
import { useAlertDialog } from "@/components/ui/alert-dialog-custom";
import UrlExtractor from "@/components/recipe-import/UrlExtractor";
import RecipeInfoEditor from "@/components/recipe-import/RecipeInfoEditor";
import IngredientsEditor from "@/components/recipe-import/IngredientsEditor";
import StepsEditor from "@/components/recipe-import/StepsEditor";

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

export default function ImportRecipePage() {
  const router = useRouter();
  const { showAlert, AlertDialogComponent } = useAlertDialog();
  const [extractedRecipe, setExtractedRecipe] = useState<ExtractedRecipe | null>(null);
  const [editableIngredients, setEditableIngredients] = useState<Array<{
    id: string;
    quantity: number;
    unit: string;
    name: string;
    notes?: string;
    category?: string;
  }>>([]);
  const [editableSteps, setEditableSteps] = useState<ExtractedRecipeStep[]>([]);
  const [form, setForm] = useState<RecipeForm>({
    title: '',
    description: '',
    content: '',
    imageUrl: '',
    prepTime: '',
    cookTime: '',
    servings: '',
    sourceUrl: '',
    types: [],
  });

  // Extract recipe from URL
  const extractMutation = api.recipeImport.extractFromUrl.useMutation({
    onSuccess: (data: ExtractedRecipe) => {
      setExtractedRecipe(data);
      setForm({
        title: data.title,
        description: data.description || '',
        content: data.markdown,
        imageUrl: data.imageUrl || '',
        prepTime: data.prepTime?.toString() || '',
        cookTime: data.cookTime?.toString() || '',
        servings: data.servings?.toString() || '',
        sourceUrl: data.sourceUrl,
        types: [],
      });
      
      // Set editable ingredients with unique IDs
      setEditableIngredients(
        data.parsedIngredients.map((ingredient, index) => ({
          id: `ingredient-${index}`,
          ...ingredient,
        }))
      );

      // Set editable steps
      setEditableSteps(data.steps || []);
    },
    onError: (error) => {
      console.error('Extraction error:', error);
      showAlert(
        'Erreur d\'extraction',
        `Impossible d'extraire la recette depuis cette URL: ${error.message}`,
        'error'
      );
    },
  });

  // Create recipe from extracted data
  const createRecipeMutation = api.recipeImport.createFromExtracted.useMutation({
    onSuccess: (data) => {
      router.push(`/recettes/${data?.id}`);
    },
    onError: (error) => {
      console.error('Creation error:', error);
      showAlert(
        'Erreur de création',
        `Impossible de créer la recette: ${error.message}`,
        'error'
      );
    },
  });

  const handleExtract = async (url: string) => {
    if (!url.trim()) {
      showAlert(
        'URL manquante',
        'Veuillez entrer une URL pour extraire la recette.',
        'warning'
      );
      return;
    }

    try {
      await extractMutation.mutateAsync({ url });
    } catch (error) {
      // Error handling is done in onError callback
    }
  };

  const handleSaveRecipe = async () => {
    if (!form.title.trim()) {
      showAlert(
        'Titre manquant',
        'Le titre est obligatoire pour sauvegarder la recette.',
        'warning'
      );
      return;
    }


    if (form.types.length === 0) {
      showAlert(
        'Type de recette requis',
        'Veuillez sélectionner au moins un type de recette.',
        'warning'
      );
      return;
    }

    try {
      await createRecipeMutation.mutateAsync({
        title: form.title,
        description: form.description || undefined,
        content: "Recette importée", // Contenu générique pour les recettes importées
        imageUrl: form.imageUrl || undefined,
        prepTime: form.prepTime ? parseInt(form.prepTime) : undefined,
        cookTime: form.cookTime ? parseInt(form.cookTime) : undefined,
        servings: form.servings ? parseInt(form.servings) : undefined,
        sourceUrl: form.sourceUrl,
        parsedIngredients: editableIngredients.filter(ing => ing.name.trim() !== ''),
        steps: editableSteps,
        types: form.types as RecipeCategoryType[],
      });
    } catch (error) {
      // Error handling is done in onError callback
    }
  };

  const updateForm = (field: keyof RecipeForm, value: string | string[]) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Link href="/recettes">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour aux recettes
              </Button>
            </Link>
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Importer une Recette</h2>
              <p className="text-gray-600">Importez une recette depuis une URL et personnalisez-la</p>
            </div>
          </div>
        </div>

        {!extractedRecipe && (
          <UrlExtractor
            onExtract={handleExtract}
            isLoading={extractMutation.isPending}
          />
        )}

        {extractedRecipe && (
          <div className="space-y-8 mb-8">
            <RecipeInfoEditor
              extractedRecipe={extractedRecipe}
              form={form}
              onFormUpdate={updateForm}
            />

            <IngredientsEditor
              ingredients={editableIngredients}
              onIngredientsChange={setEditableIngredients}
            />

            <StepsEditor
              steps={editableSteps}
              onStepsChange={setEditableSteps}
            />
          </div>
        )}


        {/* Action Buttons */}
        {extractedRecipe && (
          <div className="flex items-center justify-end space-x-4 pt-6 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setExtractedRecipe(null);
                setEditableIngredients([]);
                setForm({
                  title: '',
                  description: '',
                  content: '',
                  imageUrl: '',
                  prepTime: '',
                  cookTime: '',
                  servings: '',
                  sourceUrl: '',
                  types: [],
                });
              }}
            >
              Recommencer
            </Button>
            <Button
              onClick={handleSaveRecipe}
              className="bg-orange-600 hover:bg-orange-700"
              disabled={createRecipeMutation.isPending}
            >
              {createRecipeMutation.isPending ? (
                'Sauvegarde...'
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Sauvegarder la recette
                </>
              )}
            </Button>
          </div>
        )}
      </div>
      <AlertDialogComponent />
    </div>
  );
}