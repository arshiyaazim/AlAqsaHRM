import { Skeleton } from "@/components/ui/skeleton";

export const EmployeeCardSkeleton = () => {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-5">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-x-4 gap-y-2">
          <div className="space-y-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="space-y-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="space-y-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="space-y-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      </div>
      <div className="bg-gray-50 px-5 py-3">
        <Skeleton className="h-8 w-40" />
      </div>
    </div>
  );
};

export const EmployeeTableRowSkeleton = () => {
  return (
    <div className="flex items-center p-4 border-b border-gray-200">
      <Skeleton className="h-10 w-10 rounded-full mr-4" />
      <div className="flex-1">
        <Skeleton className="h-4 w-32 mb-2" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-4 w-20 mr-4" />
      <Skeleton className="h-4 w-16 mr-4" />
      <Skeleton className="h-8 w-24" />
    </div>
  );
};

export const EmployeeDetailSkeleton = () => {
  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="flex flex-col md:flex-row">
        <div className="md:w-1/3 bg-gray-50 p-6 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-gray-200">
          <Skeleton className="h-32 w-32 rounded-full mb-4" />
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-40 mb-4" />
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="md:w-2/3 p-6">
          <Skeleton className="h-6 w-48 mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <Skeleton className="h-3 w-24 mb-1" />
              <Skeleton className="h-5 w-48" />
            </div>
            <div className="space-y-1">
              <Skeleton className="h-3 w-24 mb-1" />
              <Skeleton className="h-5 w-48" />
            </div>
            <div className="space-y-1">
              <Skeleton className="h-3 w-24 mb-1" />
              <Skeleton className="h-5 w-48" />
            </div>
            <div className="space-y-1">
              <Skeleton className="h-3 w-24 mb-1" />
              <Skeleton className="h-5 w-48" />
            </div>
            <div className="space-y-1">
              <Skeleton className="h-3 w-24 mb-1" />
              <Skeleton className="h-5 w-48" />
            </div>
            <div className="space-y-1">
              <Skeleton className="h-3 w-24 mb-1" />
              <Skeleton className="h-5 w-48" />
            </div>
          </div>
          <div className="mt-8 border-t border-gray-200 pt-4">
            <Skeleton className="h-5 w-40 mb-4" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full max-w-md" />
              <Skeleton className="h-4 w-full max-w-md" />
              <Skeleton className="h-4 w-3/4 max-w-md" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const EmployeeListSkeleton = ({ count = 3 }: { count?: number }) => {
  return (
    <div className="space-y-4">
      {Array(count)
        .fill(null)
        .map((_, index) => (
          <EmployeeTableRowSkeleton key={index} />
        ))}
    </div>
  );
};