import { Skeleton } from "@/components/ui/skeleton";

export const CardSkeleton = () => {
  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="p-6">
        <Skeleton className="h-6 w-48 mb-4" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
      <div className="border-t border-gray-200 p-4 bg-gray-50 flex justify-end">
        <Skeleton className="h-9 w-24" />
      </div>
    </div>
  );
};

export const CardWithImageSkeleton = () => {
  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <Skeleton className="h-48 w-full" />
      <div className="p-6">
        <Skeleton className="h-6 w-48 mb-2" />
        <Skeleton className="h-4 w-32 mb-4" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
      <div className="border-t border-gray-200 p-4 flex justify-between items-center">
        <div className="flex items-center">
          <Skeleton className="h-8 w-8 rounded-full mr-2" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-9 w-24" />
      </div>
    </div>
  );
};

export const CardGridSkeleton = ({ cards = 6 }: { cards?: number }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array(cards).fill(null).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
};

export const CardWithStatsSkeleton = () => {
  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="p-6">
        <Skeleton className="h-6 w-48 mb-4" />
        <div className="space-y-2 mb-6">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="border rounded-lg p-4">
            <Skeleton className="h-4 w-16 mb-1" />
            <Skeleton className="h-7 w-24" />
          </div>
          <div className="border rounded-lg p-4">
            <Skeleton className="h-4 w-16 mb-1" />
            <Skeleton className="h-7 w-24" />
          </div>
          <div className="border rounded-lg p-4">
            <Skeleton className="h-4 w-16 mb-1" />
            <Skeleton className="h-7 w-24" />
          </div>
          <div className="border rounded-lg p-4">
            <Skeleton className="h-4 w-16 mb-1" />
            <Skeleton className="h-7 w-24" />
          </div>
        </div>
      </div>
      <div className="border-t border-gray-200 p-4 bg-gray-50 flex justify-between">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-24" />
      </div>
    </div>
  );
};

export const ContentSkeleton = () => {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-3/4 mb-2" />
        <Skeleton className="h-4 w-1/2 mb-6" />
      </div>
      
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
      
      <Skeleton className="h-48 w-full rounded-lg" />
      
      <div className="space-y-3">
        <Skeleton className="h-6 w-1/3 mb-2" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <Skeleton className="h-6 w-1/2 mb-2" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-6 w-1/2 mb-2" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      </div>
    </div>
  );
};