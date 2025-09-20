'use client';

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";
import type { ExtractedRecipeStep } from '@/lib/recipe-extractor';

interface StepsEditorProps {
  steps: ExtractedRecipeStep[];
  onStepsChange: (steps: ExtractedRecipeStep[]) => void;
}

export default function StepsEditor({ steps, onStepsChange }: StepsEditorProps) {
  const addStep = () => {
    const newStep: ExtractedRecipeStep = {
      stepNumber: steps.length + 1,
      instruction: '',
    };
    onStepsChange([...steps, newStep]);
  };

  const updateStep = (index: number, field: keyof ExtractedRecipeStep, value: string | number | undefined) => {
    const updated = steps.map((s, idx) =>
      idx === index ? { ...s, [field]: value } : s
    );
    onStepsChange(updated);
  };

  const removeStep = (index: number) => {
    const updated = steps.filter((_, idx) => idx !== index);
    const renumbered = updated.map((s, idx) => ({ ...s, stepNumber: idx + 1 }));
    onStepsChange(renumbered);
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Étapes de préparation</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={addStep}
        >
          <Plus className="h-4 w-4 mr-2" />
          Ajouter une étape
        </Button>
      </div>

      <div className="space-y-4">
        {steps.map((step, index) => (
          <div key={`step-${index}`} className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-sm">Étape {step.stepNumber}</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => removeStep(index)}
                className="p-2"
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>

            <div className="grid grid-cols-12 gap-4 mb-3">
              <div className="col-span-4">
                <Input
                  value={step.title || ''}
                  onChange={(e) => updateStep(index, 'title', e.target.value)}
                  placeholder="Titre de l'étape (optionnel)"
                  className="text-sm"
                />
              </div>
              <div className="col-span-3">
                <Input
                  value={step.duration ? step.duration.toString() : ''}
                  onChange={(e) => updateStep(index, 'duration', e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="Durée (min)"
                  type="number"
                  className="text-sm"
                />
              </div>
              <div className="col-span-3">
                <Input
                  value={step.temperature || ''}
                  onChange={(e) => updateStep(index, 'temperature', e.target.value)}
                  placeholder="Température"
                  className="text-sm"
                />
              </div>
            </div>

            <div className="mb-3">
              <textarea
                value={step.instruction}
                onChange={(e) => updateStep(index, 'instruction', e.target.value)}
                placeholder="Instruction détaillée (supporte le markdown)"
                className="w-full p-3 border rounded-md text-sm min-h-[80px] resize-y"
                rows={3}
              />
            </div>

            {step.notes && (
              <div>
                <Input
                  value={step.notes}
                  onChange={(e) => updateStep(index, 'notes', e.target.value)}
                  placeholder="Notes additionnelles"
                  className="text-sm"
                />
              </div>
            )}
          </div>
        ))}

        {steps.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>Aucune étape détectée. Vous pouvez en ajouter manuellement.</p>
          </div>
        )}
      </div>
    </Card>
  );
}