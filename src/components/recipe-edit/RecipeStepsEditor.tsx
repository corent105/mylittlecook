'use client';

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, X, ChevronUp, ChevronDown, Clock, Thermometer } from "lucide-react";

interface RecipeStep {
  id: string;
  stepNumber: number;
  title: string;
  instruction: string;
  duration?: number;
  temperature?: string;
  notes?: string;
}

interface RecipeStepsEditorProps {
  steps: RecipeStep[];
  onStepsChange: (steps: RecipeStep[]) => void;
}

export default function RecipeStepsEditor({
  steps,
  onStepsChange
}: RecipeStepsEditorProps) {
  const addStep = () => {
    const newStep: RecipeStep = {
      id: crypto.randomUUID(),
      stepNumber: steps.length + 1,
      title: '',
      instruction: '',
      duration: undefined,
      temperature: '',
      notes: ''
    };
    onStepsChange([...steps, newStep]);
  };

  const updateStep = (index: number, field: keyof RecipeStep, value: string | number | undefined) => {
    const updated = steps.map((step, idx) =>
      idx === index ? { ...step, [field]: value } : step
    );
    onStepsChange(updated);
  };

  const removeStep = (index: number) => {
    const updated = steps.filter((_, idx) => idx !== index);
    const renumbered = updated.map((step, idx) => ({ ...step, stepNumber: idx + 1 }));
    onStepsChange(renumbered);
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= steps.length) return;

    const updated = [...steps];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];

    const renumbered = updated.map((step, idx) => ({ ...step, stepNumber: idx + 1 }));
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
          <div key={step.id} className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-sm">Étape {step.stepNumber}</h4>
              <div className="flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => moveStep(index, 'up')}
                  disabled={index === 0}
                  className="h-6 w-6 p-0"
                >
                  <ChevronUp className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => moveStep(index, 'down')}
                  disabled={index === steps.length - 1}
                  className="h-6 w-6 p-0"
                >
                  <ChevronDown className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeStep(index)}
                  className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-4 mb-3">
              <div className="col-span-6">
                <Input
                  value={step.title}
                  onChange={(e) => updateStep(index, 'title', e.target.value)}
                  placeholder="Titre de l'étape (optionnel)"
                  className="text-sm"
                />
              </div>
              <div className="col-span-3">
                <div className="relative">
                  <Clock className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    value={step.duration ? step.duration.toString() : ''}
                    onChange={(e) => updateStep(index, 'duration', e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="Durée (min)"
                    type="number"
                    className="text-sm pl-8"
                  />
                </div>
              </div>
              <div className="col-span-3">
                <div className="relative">
                  <Thermometer className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    value={step.temperature || ''}
                    onChange={(e) => updateStep(index, 'temperature', e.target.value)}
                    placeholder="Température"
                    className="text-sm pl-8"
                  />
                </div>
              </div>
            </div>

            <div className="mb-3">
              <textarea
                value={step.instruction}
                onChange={(e) => updateStep(index, 'instruction', e.target.value)}
                placeholder="Instruction détaillée..."
                rows={3}
                className="w-full p-3 border border-gray-300 rounded-md text-sm resize-y focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            <div>
              <Input
                value={step.notes || ''}
                onChange={(e) => updateStep(index, 'notes', e.target.value)}
                placeholder="Notes additionnelles (optionnel)"
                className="text-sm"
              />
            </div>
          </div>
        ))}
      </div>

      {steps.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">Aucune étape ajoutée</p>
          <p className="text-xs mt-1">Cliquez sur "Ajouter une étape" pour commencer</p>
        </div>
      )}
    </Card>
  );
}