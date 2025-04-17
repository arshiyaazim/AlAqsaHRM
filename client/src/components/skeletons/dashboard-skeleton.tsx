import { Skeleton } from "@/components/ui/skeleton";

export const StatCardSkeleton = () => {
  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex items-center">
          <Skeleton className="h-10 w-10 rounded-md" />
          <div className="ml-4 flex-1">
            <Skeleton className="h-3 w-24 mb-2" />
            <Skeleton className="h-6 w-16" />
          </div>
        </div>
        <div className="mt-3 flex items-center">
          <Skeleton className="h-4 w-14" />
        </div>
      </div>
    </div>
  );
};

export const DashboardStatsSkeleton = () => {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {Array(4).fill(0).map((_, index) => (
        <StatCardSkeleton key={index} />
      ))}
    </div>
  );
};

export const AttendanceChartSkeleton = () => {
  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="p-5 border-b border-gray-200">
        <Skeleton className="h-5 w-40" />
      </div>
      <div className="p-5">
        <div className="flex justify-between items-center mb-4">
          <div className="flex space-x-4">
            <div className="flex items-center">
              <Skeleton className="h-3 w-3 rounded-full mr-2" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="flex items-center">
              <Skeleton className="h-3 w-3 rounded-full mr-2" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="flex items-center">
              <Skeleton className="h-3 w-3 rounded-full mr-2" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="h-64">
          <div className="h-full w-full flex items-end space-x-2">
            {Array(7).fill(null).map((_, i) => (
              <div key={i} className="flex-1 flex flex-col items-center">
                <Skeleton className="w-full" style={{ height: `${Math.random() * 60 + 20}%` }} />
                <Skeleton className="h-4 w-8 mt-2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export const RecentPaymentsSkeleton = () => {
  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="p-5 border-b border-gray-200">
        <Skeleton className="h-5 w-40" />
      </div>
      <div className="p-1">
        {Array(5).fill(null).map((_, i) => (
          <div key={i} className="p-4 border-b border-gray-100 flex justify-between items-center">
            <div className="flex items-center">
              <Skeleton className="h-10 w-10 rounded-full mr-3" />
              <div>
                <Skeleton className="h-4 w-32 mb-1" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="h-5 w-20" />
          </div>
        ))}
      </div>
      <div className="p-4 bg-gray-50">
        <Skeleton className="h-9 w-full max-w-xs mx-auto" />
      </div>
    </div>
  );
};

export const QuickActionsSkeleton = () => {
  return (
    <div>
      <Skeleton className="h-6 w-32 mb-4" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {Array(4).fill(null).map((_, i) => (
          <div key={i} className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center">
              <Skeleton className="h-12 w-12 rounded-md" />
              <Skeleton className="h-5 w-24 ml-3" />
            </div>
            <Skeleton className="h-4 w-full mt-2" />
            <Skeleton className="h-4 w-3/4 mt-1" />
          </div>
        ))}
      </div>
    </div>
  );
};

export const DashboardSkeleton = () => {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-40 mb-1" />
        <Skeleton className="h-4 w-64" />
      </div>
      
      <DashboardStatsSkeleton />
      
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AttendanceChartSkeleton />
        <RecentPaymentsSkeleton />
      </div>
      
      <QuickActionsSkeleton />
    </div>
  );
};