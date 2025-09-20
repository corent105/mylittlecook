'use client';

import { Button } from "@/components/ui/button";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

interface WeekNavigationProps {
  currentWeek: Date;
  onNavigateWeek: (direction: 'prev' | 'next') => void;
  onGoToToday: () => void;
  formatWeekRange: (weekStart: Date) => string;
  getWeekStart: (date: Date) => Date;
}

export default function WeekNavigation({
  currentWeek,
  onNavigateWeek,
  onGoToToday,
  formatWeekRange,
  getWeekStart
}: WeekNavigationProps) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 sm:mb-8">
      <div className="flex items-center space-x-2 sm:space-x-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onNavigateWeek('prev')}
        >
          <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
        <div className="flex items-center space-x-1 sm:space-x-2">
          <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
          <h2 className="text-sm sm:text-lg md:text-xl font-semibold text-center px-2">
            {formatWeekRange(getWeekStart(currentWeek))}
          </h2>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onNavigateWeek('next')}
        >
          <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onGoToToday}
          className="text-orange-600 hover:text-orange-700"
        >
          Aujourd'hui
        </Button>
      </div>
      <Link href="/liste-de-courses" className="sm:block">
        <Button className="bg-orange-600 hover:bg-orange-700 text-xs sm:text-sm px-3 py-2">
          <span className="hidden sm:inline">Générer liste de courses</span>
          <span className="sm:hidden">Liste de courses</span>
        </Button>
      </Link>
    </div>
  );
}