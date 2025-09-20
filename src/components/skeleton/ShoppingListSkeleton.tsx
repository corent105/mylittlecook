import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function ShoppingListSkeleton() {
  return (
    <div className="space-y-4">
      {/* Summary skeleton */}
      <Card className="p-4">
        <Skeleton className="h-6 w-48 mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="text-center">
              <Skeleton className="h-8 w-12 mx-auto mb-2" />
              <Skeleton className="h-4 w-20 mx-auto" />
            </div>
          ))}
        </div>
      </Card>

      {/* Categories skeleton */}
      {Array.from({ length: 4 }).map((_, categoryIndex) => (
        <Card key={categoryIndex} className="p-4">
          <Skeleton className="h-5 w-32 mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, itemIndex) => (
              <div key={itemIndex} className="flex items-center space-x-3">
                <Skeleton className="h-5 w-5 rounded" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-3/4 mb-1" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  )
}