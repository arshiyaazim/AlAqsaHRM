import { Skeleton } from "@/components/ui/skeleton";

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  hasHeader?: boolean;
  hasActions?: boolean;
}

export const TableRowSkeleton = ({ columns = 5, hasActions = true }: { columns?: number, hasActions?: boolean }) => {
  return (
    <div className="flex items-center p-4 border-b border-gray-200">
      {Array(columns).fill(null).map((_, i) => (
        <div key={i} className="flex-1 px-2">
          <Skeleton className={`h-4 w-${Math.floor(Math.random() * 20) + 16}`} />
        </div>
      ))}
      {hasActions && (
        <div className="flex space-x-2 ml-4">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      )}
    </div>
  );
};

export const TableHeaderSkeleton = ({ columns = 5, hasActions = true }: { columns?: number, hasActions?: boolean }) => {
  return (
    <div className="flex items-center p-4 border-b border-gray-200 bg-gray-50">
      {Array(columns).fill(null).map((_, i) => (
        <div key={i} className="flex-1 px-2">
          <Skeleton className="h-5 w-24" />
        </div>
      ))}
      {hasActions && (
        <div className="flex space-x-2 ml-4">
          <Skeleton className="h-5 w-16" />
        </div>
      )}
    </div>
  );
};

export const TableSkeleton = ({ rows = 5, columns = 5, hasHeader = true, hasActions = true }: TableSkeletonProps) => {
  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      {hasHeader && <TableHeaderSkeleton columns={columns} hasActions={hasActions} />}
      {Array(rows).fill(null).map((_, i) => (
        <TableRowSkeleton key={i} columns={columns} hasActions={hasActions} />
      ))}
    </div>
  );
};

export const PaginationSkeleton = () => {
  return (
    <div className="flex items-center justify-between p-4 border-t border-gray-200">
      <div className="flex-1 flex justify-between sm:hidden">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-24" />
      </div>
      <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
        <div>
          <Skeleton className="h-5 w-40" />
        </div>
        <div>
          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
            <Skeleton className="h-9 w-9 rounded-l-md" />
            {Array(5).fill(null).map((_, i) => (
              <Skeleton key={i} className="h-9 w-9" />
            ))}
            <Skeleton className="h-9 w-9 rounded-r-md" />
          </nav>
        </div>
      </div>
    </div>
  );
};

export const TableWithPaginationSkeleton = (props: TableSkeletonProps) => {
  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <TableSkeleton {...props} />
      <PaginationSkeleton />
    </div>
  );
};