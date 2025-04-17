import { Skeleton } from "@/components/ui/skeleton";

export const FormFieldSkeleton = () => {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
};

export const FormGroupSkeleton = ({ fields = 2 }: { fields?: number }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Array(fields).fill(null).map((_, i) => (
        <FormFieldSkeleton key={i} />
      ))}
    </div>
  );
};

export const FormSkeleton = ({ 
  groups = 3, 
  buttons = 2 
}: { 
  groups?: number;
  buttons?: number;
}) => {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <Skeleton className="h-7 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>

      <div className="space-y-6">
        {Array(groups).fill(null).map((_, i) => (
          <FormGroupSkeleton key={i} />
        ))}
      </div>

      <div className="flex justify-end gap-3">
        {Array(buttons).fill(null).map((_, i) => (
          <Skeleton key={i} className="h-10 w-24" />
        ))}
      </div>
    </div>
  );
};

export const FormWithSidebarSkeleton = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <FormSkeleton />
      </div>
      <div className="lg:col-span-1 space-y-6">
        <div className="border rounded-lg p-4 space-y-4">
          <Skeleton className="h-6 w-32" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <Skeleton className="h-9 w-full" />
        </div>
        
        <div className="border rounded-lg p-4 space-y-4">
          <Skeleton className="h-6 w-40" />
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div>
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24 mt-1" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div>
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-28 mt-1" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};