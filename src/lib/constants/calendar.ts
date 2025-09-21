// Monday-first (French format)
export const DAYS_FRENCH = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

// Sunday-first (ISO format)
export const DAYS_ISO = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

export const MEAL_TYPES_FRENCH = ['Petit-déjeuner', 'Déjeuner', 'Dîner'] as const;
export type MealTypeFrench = typeof MEAL_TYPES_FRENCH[number];