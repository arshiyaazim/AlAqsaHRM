import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const TableRowSkeleton = ({
  columns = 5,
  hasActions = true,
}: {
  columns?: number;
  hasActions?: boolean;
}) => {
  const actualColumns = hasActions ? columns - 1 : columns;

  return (
    <TableRow>
      {Array(actualColumns)
        .fill(null)
        .map((_, i) => (
          <TableCell key={i}>
            <Skeleton className="h-4 w-24" />
          </TableCell>
        ))}
      {hasActions && (
        <TableCell>
          <div className="flex items-center gap-2">
            <Skeleton className="h-7 w-7 rounded" />
            <Skeleton className="h-7 w-7 rounded" />
            <Skeleton className="h-7 w-7 rounded" />
          </div>
        </TableCell>
      )}
    </TableRow>
  );
};

export const TableSkeleton = ({
  rows = 5,
  columns = 5,
  hasActions = true,
  showHeader = true,
}: {
  rows?: number;
  columns?: number;
  hasActions?: boolean;
  showHeader?: boolean;
}) => {
  return (
    <div className="rounded-md border">
      <Table>
        {showHeader && (
          <TableHeader>
            <TableRow>
              {Array(columns)
                .fill(null)
                .map((_, i) => (
                  <TableHead key={i}>
                    <Skeleton className="h-4 w-24" />
                  </TableHead>
                ))}
            </TableRow>
          </TableHeader>
        )}
        <TableBody>
          {Array(rows)
            .fill(null)
            .map((_, i) => (
              <TableRowSkeleton
                key={i}
                columns={columns}
                hasActions={hasActions}
              />
            ))}
        </TableBody>
      </Table>
    </div>
  );
};

export const TableWithPaginationSkeleton = ({
  rows = 5,
  columns = 5,
  hasActions = true,
}: {
  rows?: number;
  columns?: number;
  hasActions?: boolean;
}) => {
  return (
    <div className="space-y-4">
      <TableSkeleton
        rows={rows}
        columns={columns}
        hasActions={hasActions}
      />
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      </div>
    </div>
  );
};

export const DataTableSkeleton = ({
  title = "Data Table",
  description,
  rows = 5,
  columns = 5,
  hasActions = true,
  hasFilter = true,
  hasPagination = true,
}: {
  title?: string;
  description?: string;
  rows?: number;
  columns?: number;
  hasActions?: boolean;
  hasFilter?: boolean;
  hasPagination?: boolean;
}) => {
  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
        <div>
          <CardTitle>{title}</CardTitle>
          {description && <p className="text-sm text-gray-500">{description}</p>}
        </div>
        <div className="flex items-center gap-3">
          {hasFilter && <Skeleton className="h-10 w-32" />}
          <Skeleton className="h-10 w-32" />
        </div>
      </CardHeader>
      <CardContent>
        {hasPagination ? (
          <TableWithPaginationSkeleton
            rows={rows}
            columns={columns}
            hasActions={hasActions}
          />
        ) : (
          <TableSkeleton
            rows={rows}
            columns={columns}
            hasActions={hasActions}
          />
        )}
      </CardContent>
    </Card>
  );
};