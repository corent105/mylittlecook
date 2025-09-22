'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { ChefHat, Save, ArrowLeft } from "lucide-react";
import { api } from "@/trpc/react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAlertDialog } from "@/components/ui/alert-dialog-custom";
import RecipeBasicInfoEditor from "@/components/recipe-edit/RecipeBasicInfoEditor";
import RecipeIngredientsEditor from "@/components/recipe-edit/RecipeIngredientsEditor";
import RecipeStepsEditor from "@/components/recipe-edit/RecipeStepsEditor";

interface RecipeIngredient {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  notes: string;
}

interface RecipeStep {
  id: string;
  stepNumber: number;
  title: string;
  instruction: string;
  duration?: number;
  temperature?: string;
  notes?: string;
}

interface RecipeForm {
  title: string;
  description: string;
  content: string;
  imageUrl: string;
  prepTime: string;
  cookTime: string;
  servings: string;
  minimalServings: string;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  types: string[];
}

export default function EditRecipePage() {
  const params = useParams();
  const router = useRouter();
  const { showAlert, AlertDialogComponent } = useAlertDialog();
  const [form, setForm] = useState<RecipeForm>({
    title: '',
    description: '',
    content: '',
    imageUrl: '',
    prepTime: '',
    cookTime: '',
    servings: '',
    minimalServings: '',
    ingredients: [],
    steps: [],
    types: []
  });

  const recipeId = params.id as string;

  const { data: recipe, isLoading } = api.recipe.getById.useQuery(
    { id: recipeId },
    { enabled: !!recipeId }
  );

  const updateRecipeMutation = api.recipe.update.useMutation({
    onSuccess: () => {
      showAlert("Succès", "La recette a été mise à jour avec succès !", "success");
      router.push(`/recettes/${recipeId}`);
    },
    onError: (error) => {
      showAlert("Erreur", error.message || "Une erreur est survenue lors de la mise à jour.", "error");
    }
  });

  useEffect(() => {
    if (recipe) {
      setForm({
        title: recipe.title,
        description: recipe.description || '',
        content: recipe.content || '',
        imageUrl: recipe.imageUrl || '',
        prepTime: recipe.prepTime?.toString() || '',
        cookTime: recipe.cookTime?.toString() || '',
        servings: recipe.servings?.toString() || '',
        minimalServings: recipe.minimalServings?.toString() || '',
        ingredients: recipe.ingredients?.map((ing: any) => ({
          id: ing.id,
          name: ing.ingredient?.name || ing.name || '',
          quantity: (ing.quantity || '').toString(),
          unit: ing.ingredient?.unit || ing.unit || '',
          notes: ing.notes || ''
        })) || [],
        steps: recipe.steps?.map(step => ({
          id: step.id,
          stepNumber: step.stepNumber,
          title: step.title || '',
          instruction: step.instruction,
          duration: step.duration || undefined,
          temperature: step.temperature || '',
          notes: step.notes || ''
        })) || [],
        types: recipe.types?.map((rt: any) => rt.type) || []
      });
    }
  }, [recipe]);

  const handleFormUpdate = (field: keyof RecipeForm, value: string | string[] | RecipeIngredient[] | RecipeStep[]) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!form.title.trim()) {
      showAlert("Erreur", "Le titre de la recette est obligatoire.", "error");
      return;
    }

    const recipeData = {
      id: recipeId,
      title: form.title,
      description: form.description || undefined,
      content: form.content || undefined,
      imageUrl: form.imageUrl || undefined,
      prepTime: form.prepTime ? parseInt(form.prepTime) : undefined,
      cookTime: form.cookTime ? parseInt(form.cookTime) : undefined,
      servings: form.servings ? parseInt(form.servings) : undefined,
      minimalServings: form.minimalServings ? parseInt(form.minimalServings) : undefined,
      ingredients: form.ingredients.map(ing => ({
        id: ing.id,
        name: ing.name,
        quantity: ing.quantity || null,
        unit: ing.unit || null,
        notes: ing.notes || null
      })),
      steps: form.steps.map(step => ({
        id: step.id,
        stepNumber: step.stepNumber,
        title: step.title || null,
        instruction: step.instruction,
        duration: step.duration || null,
        temperature: step.temperature || null,
        notes: step.notes || null
      })),
      types: form.types as any
    };

    updateRecipeMutation.mutate(recipeData as any);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 animate-spin rounded-full border-2 border-orange-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Recette non trouvée</h1>
          <p className="text-gray-600 mb-4">La recette demandée n'existe pas.</p>
          <Link href="/recettes">
            <Button>Retour aux recettes</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Link href={`/recettes/${recipeId}`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Button>
            </Link>
            <div className="flex items-center space-x-2">
              <ChefHat className="h-6 w-6 text-orange-600" />
              <h1 className="text-2xl font-bold text-gray-900">Modifier la recette</h1>
            </div>
          </div>

          <Button
            onClick={handleSave}
            disabled={updateRecipeMutation.isPending}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            {updateRecipeMutation.isPending ? (
              <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Sauvegarder
          </Button>
        </div>

        <div className="grid gap-6">
          <RecipeBasicInfoEditor
            form={form}
            onFormUpdate={handleFormUpdate}
          />

          <RecipeIngredientsEditor
            ingredients={form.ingredients}
            onIngredientsChange={(ingredients) => handleFormUpdate('ingredients', ingredients)}
          />

          <RecipeStepsEditor
            steps={form.steps}
            onStepsChange={(steps) => handleFormUpdate('steps', steps)}
          />
        </div>
      </div>

      <AlertDialogComponent />
    </div>
  );
}