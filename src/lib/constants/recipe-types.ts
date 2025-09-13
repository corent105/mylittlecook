export const RECIPE_TYPES = {
  BREAKFAST: {
    value: 'BREAKFAST',
    label: 'Petit-déjeuner',
    emoji: '🌅',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200'
  },
  APPETIZER: {
    value: 'APPETIZER',
    label: 'Apéritif',
    emoji: '🥂',
    color: 'bg-purple-100 text-purple-800 border-purple-200'
  },
  STARTER: {
    value: 'STARTER',
    label: 'Entrée',
    emoji: '🥗',
    color: 'bg-green-100 text-green-800 border-green-200'
  },
  MAIN_COURSE: {
    value: 'MAIN_COURSE',
    label: 'Plat principal',
    emoji: '🍽️',
    color: 'bg-red-100 text-red-800 border-red-200'
  },
  SIDE_DISH: {
    value: 'SIDE_DISH',
    label: 'Accompagnement',
    emoji: '🥔',
    color: 'bg-orange-100 text-orange-800 border-orange-200'
  },
  DESSERT: {
    value: 'DESSERT',
    label: 'Dessert',
    emoji: '🍰',
    color: 'bg-pink-100 text-pink-800 border-pink-200'
  },
  BEVERAGE: {
    value: 'BEVERAGE',
    label: 'Boisson',
    emoji: '🥤',
    color: 'bg-blue-100 text-blue-800 border-blue-200'
  }
} as const;

export const RECIPE_TYPE_OPTIONS = Object.values(RECIPE_TYPES);

export type RecipeCategoryType = keyof typeof RECIPE_TYPES;

// Helper pour obtenir les labels des types
export const getRecipeTypeLabel = (type: RecipeCategoryType): string => {
  return RECIPE_TYPES[type]?.label || type;
};

// Helper pour obtenir les emojis des types
export const getRecipeTypeEmoji = (type: RecipeCategoryType): string => {
  return RECIPE_TYPES[type]?.emoji || '';
};

// Helper pour obtenir les couleurs des types
export const getRecipeTypeColor = (type: RecipeCategoryType): string => {
  return RECIPE_TYPES[type]?.color || 'bg-gray-100 text-gray-800 border-gray-200';
};

// Helper pour filtrer les types compatibles avec un meal type
export const getCompatibleRecipeTypes = (mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK') => {
  switch (mealType) {
    case 'BREAKFAST':
      return [RECIPE_TYPES.BREAKFAST, RECIPE_TYPES.BEVERAGE];
    case 'LUNCH':
    case 'DINNER':
      return [
        RECIPE_TYPES.APPETIZER,
        RECIPE_TYPES.STARTER,
        RECIPE_TYPES.MAIN_COURSE,
        RECIPE_TYPES.SIDE_DISH,
        RECIPE_TYPES.DESSERT,
        RECIPE_TYPES.BEVERAGE
      ];
    case 'SNACK':
      return [RECIPE_TYPES.APPETIZER, RECIPE_TYPES.DESSERT, RECIPE_TYPES.BEVERAGE];
    default:
      return RECIPE_TYPE_OPTIONS;
  }
};