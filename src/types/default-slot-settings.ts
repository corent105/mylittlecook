import { MealType } from '@prisma/client';

export interface DefaultSlotSetting {
  id: string;
  dayOfWeek: number; // 0-6 (0 = Monday, 6 = Sunday)
  mealType: MealType;
  defaultCookResponsibleId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  ownerId: string;
  defaultCookResponsible?: {
    id: string;
    pseudo: string;
  } | null;
  defaultAssignments: DefaultSlotSettingAssignment[];
}

export interface DefaultSlotSettingAssignment {
  id: string;
  settingId: string;
  mealUserId: string;
  mealUser: {
    id: string;
    pseudo: string;
  };
  createdAt: Date;
}

export interface CreateDefaultSlotSettingInput {
  dayOfWeek: number;
  mealType: MealType;
  mealUserIds: string[];
  defaultCookResponsibleId?: string;
}

export interface UpdateDefaultSlotSettingInput {
  id: string;
  mealUserIds: string[];
  defaultCookResponsibleId?: string;
}

export interface DefaultSlotSettingsMap {
  [key: string]: string[]; // Key format: "dayOfWeek-mealType", Value: array of mealUserIds
}

export const MEAL_TYPES_LABELS = {
  BREAKFAST: 'Petit-déjeuner',
  LUNCH: 'Déjeuner',
  DINNER: 'Dîner',
  SNACK: 'Collation'
} as const;

export function getSlotKey(dayOfWeek: number, mealType: MealType): string {
  return `${dayOfWeek}-${mealType}`;
}