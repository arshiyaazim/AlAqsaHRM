import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from "@/components/ui/pagination";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/utils";
import { Plus, Search } from "lucide-react";
import type { DailyExpenditure } from "@shared/schema";

export default function ExpenditureList() {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  const { data: expenditures, isLoading, error } = useQuery<DailyExpenditure[]>({
    queryKey: ["/api/expenditures"],
    refetchOnWindowFocus: false,
  });

  // Filter expenditures based on search term
  const filteredExpenditures = expenditures?.filter(expenditure => {
    if (!searchTerm.trim()) return true;
    
    const searchTermLower = searchTerm.toLowerCase();
    const employee = `Employee ID: ${expenditure.employeeId}`.toLowerCase();
    const payment = expenditure.payment?.toLowerCase() || "";
    const loanAdvance = expenditure.loanAdvance?.toLowerCase() || "";
    const remarks = expenditure.remarks?.toLowerCase() || "";
    
    return (
      employee.includes(searchTermLower) ||
      payment.includes(searchTermLower) ||
      loanAdvance.includes(searchTermLower) ||
      remarks.includes(searchTermLower)
    );
  });

  // Calculate pagination
  const totalPages = Math.ceil((filteredExpenditures?.length || 0) / itemsPerPage);
  const paginatedExpenditures = filteredExpenditures?.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Handle pagination changes
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold">Daily Expenditures</h1>
        <Link href="/expenditures/add">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Expenditure
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle>Expenditure Records</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search expenditures..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">
              Error loading expenditures. Please try again.
            </div>
          ) : filteredExpenditures?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No expenditures found.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Employee ID</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Loan/Advance</TableHead>
                      <TableHead>Remarks</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedExpenditures?.map((expenditure) => (
                      <TableRow key={expenditure.id}>
                        <TableCell>{formatDate(new Date(expenditure.date))}</TableCell>
                        <TableCell>{expenditure.employeeId}</TableCell>
                        <TableCell>{expenditure.payment}</TableCell>
                        <TableCell>{expenditure.loanAdvance}</TableCell>
                        <TableCell>{expenditure.remarks}</TableCell>
                        <TableCell className="text-right">
                          <Link href={`/expenditures/edit/${expenditure.id}`}>
                            <Button variant="outline" size="sm">
                              Edit
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <Pagination className="mt-4">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                    
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <PaginationItem key={page}>
                        <PaginationLink
                          onClick={() => handlePageChange(page)}
                          isActive={page === currentPage}
                          className="cursor-pointer"
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}