import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export const DashboardStatsSkeleton = () => {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {Array(4)
        .fill(null)
        .map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="mr-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                </div>
                <div className="flex-1">
                  <Skeleton className="h-5 w-20 mb-1" />
                  <Skeleton className="h-8 w-24" />
                </div>
                <div>
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
    </div>
  );
};

export const AttendanceChartSkeleton = () => {
  return (
    <Card>
      <CardContent className="p-6">
        <Skeleton className="h-6 w-48 mb-6" />
        <div className="space-y-4">
          <div className="flex gap-4 mb-6">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-8 w-full" />
            </div>
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-8 w-full" />
            </div>
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-8 w-full" />
            </div>
          </div>
          
          <Skeleton className="h-[200px] w-full" />
          
          <div className="grid grid-cols-7 gap-2 mt-4">
            {Array(7).fill(null).map((_, i) => (
              <div key={i}>
                <Skeleton className="h-3 w-6 mx-auto mb-1" />
                <Skeleton className="h-16 w-full rounded" />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const RecentPaymentsSkeleton = () => {
  return (
    <Card>
      <CardContent className="p-6">
        <Skeleton className="h-6 w-48 mb-6" />
        <div className="space-y-4">
          {Array(5).fill(null).map((_, i) => (
            <div key={i} className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center space-x-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div>
                  <Skeleton className="h-4 w-32 mb-1" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="h-6 w-24" />
            </div>
          ))}
        </div>
        <div className="flex justify-center mt-6">
          <Skeleton className="h-9 w-32" />
        </div>
      </CardContent>
    </Card>
  );
};

export const QuickActionsSkeleton = () => {
  return (
    <Card>
      <CardContent className="p-6">
        <Skeleton className="h-6 w-32 mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array(4).fill(null).map((_, i) => (
            <div key={i} className="flex flex-col items-center text-center space-y-2">
              <Skeleton className="h-12 w-12 rounded-full" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export const DashboardSkeleton = () => {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <Skeleton className="h-8 w-48 mb-2" />
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