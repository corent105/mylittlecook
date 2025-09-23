export type DateFilterType = 'today' | 'week' | 'twoWeeks' | 'custom';

export interface ShoppingListFilters {
  selectedMealUsers: string[];
  cookFilter: string; // 'all' or specific cook ID
  dateFilter: DateFilterType;
  customStartDate: string;
  customEndDate: string;
}

export interface ShoppingListFilterActions {
  setSelectedMealUsers: (users: string[]) => void;
  setCookFilter: (filter: string) => void;
  setDateFilter: (filter: DateFilterType) => void;
  setCustomStartDate: (date: string) => void;
  setCustomEndDate: (date: string) => void;
}