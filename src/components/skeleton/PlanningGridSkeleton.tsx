import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function PlanningGridSkeleton() {
  return (
    <div className="space-y-4">
      {/* Week header skeleton */}
      <div className="grid grid-cols-7 gap-2 mb-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="text-center">
            <Skeleton className="h-4 w-16 mx-auto mb-1" />
            <Skeleton className="h-6 w-8 mx-auto" />
          </div>
        ))}
      </div>

      {/* Meal types skeleton */}
      {Array.from({ length: 3 }).map((_, mealIndex) => (
        <div key={mealIndex} className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 7 }).map((_, dayIndex) => (
              <Card key={dayIndex} className="p-2 min-h-[80px]">
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-3 w-3/4" />
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}