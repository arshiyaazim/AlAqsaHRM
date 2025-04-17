import { Skeleton } from "@/components/ui/skeleton";

export const FormFieldSkeleton = () => {
  return (
    <div className="mb-4">
      <Skeleton className="h-4 w-24 mb-2" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
};

export const FormGroupSkeleton = ({ fields = 2 }: { fields?: number }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      {Array(fields).fill(null).map((_, i) => (
        <FormFieldSkeleton key={i} />
      ))}
    </div>
  );
};

export const FormSkeleton = ({ 
  groups = 3, 
  fieldsPerGroup = 2, 
  hasDivider = true,
  hasActions = true 
}: { 
  groups?: number, 
  fieldsPerGroup?: number,
  hasDivider?: boolean,
  hasActions?: boolean
}) => {
  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <Skeleton className="h-6 w-48 mb-6" />
      
      {Array(groups).fill(null).map((_, i) => (
        <div key={i}>
          {i > 0 && hasDivider && (
            <div className="border-t border-gray-200 my-6"></div>
          )}
          <Skeleton className="h-5 w-32 mb-4" />
          <FormGroupSkeleton fields={fieldsPerGroup} />
        </div>
      ))}
      
      {hasActions && (
        <div className="flex items-center justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      )}
    </div>
  );
};

export const FormWithSidebarSkeleton = () => {
  return (
    <div className="flex flex-col md:flex-row gap-6">
      <div className="md:w-2/3">
        <FormSkeleton />
      </div>
      <div className="md:w-1/3">
        <div className="bg-white shadow-md rounded-lg p-6 sticky top-6">
          <Skeleton className="h-5 w-32 mb-4" />
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          
          <div className="mt-6 pt-6 border-t border-gray-200">
            <Skeleton className="h-5 w-32 mb-4" />
            <div className="space-y-3">
              <div className="flex items-center">
                <Skeleton className="h-5 w-5 rounded mr-3" />
                <Skeleton className="h-4 w-32" />
              </div>
              <div className="flex items-center">
                <Skeleton className="h-5 w-5 rounded mr-3" />
                <Skeleton className="h-4 w-40" />
              </div>
              <div className="flex items-center">
                <Skeleton className="h-5 w-5 rounded mr-3" />
                <Skeleton className="h-4 w-36" />
              </div>
            </div>
          </div>
          
          <Skeleton className="h-10 w-full mt-6" />
        </div>
      </div>
    </div>
  );
};