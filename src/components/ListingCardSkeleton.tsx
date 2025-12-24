import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface ListingCardSkeletonProps {
  count?: number;
}

const ListingCardSkeleton = ({ count = 1 }: ListingCardSkeletonProps) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} className="overflow-hidden">
          {/* Image placeholder */}
          <Skeleton className="aspect-[16/10] w-full" />

          <CardContent className="p-5">
            {/* Title */}
            <div className="mb-3">
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </div>

            {/* Details */}
            <div className="mb-4 flex items-center gap-4">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>

            {/* Price footer */}
            <div className="flex items-center justify-between border-t border-border pt-4">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-4 w-20" />
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  );
};

export default ListingCardSkeleton;
