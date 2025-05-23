import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { DailyExpenditure } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export default function ExpenditureList() {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedExpenditure, setSelectedExpenditure] = useState<DailyExpenditure | null>(null);
  const { toast } = useToast();

  const { data: expenditures, isLoading } = useQuery<DailyExpenditure[]>({
    queryKey: ["/api/expenditures"],
  });

  const handleDeleteClick = (expenditure: DailyExpenditure) => {
    setSelectedExpenditure(expenditure);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedExpenditure) return;

    try {
      const response = await fetch(`/api/expenditures/${selectedExpenditure.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast({
          title: "Expenditure deleted",
          description: "The expenditure record has been deleted successfully.",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/expenditures"] });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete expenditure");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred while deleting the expenditure",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setSelectedExpenditure(null);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Daily Expenditures</h1>
        <Button asChild>
          <Link href="/expenditures/add">
            <Plus className="mr-2 h-4 w-4" /> Add Expenditure
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Expenditure Records</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center">Loading expenditure data...</div>
          ) : expenditures && expenditures.length > 0 ? (
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
                {expenditures.map((expenditure) => (
                  <TableRow key={expenditure.id}>
                    <TableCell>{formatDate(expenditure.date)}</TableCell>
                    <TableCell>{expenditure.employeeId}</TableCell>
                    <TableCell>{expenditure.payment || "0.00"}</TableCell>
                    <TableCell>{expenditure.loanAdvance || "0.00"}</TableCell>
                    <TableCell>{expenditure.remarks || "-"}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/expenditures/edit/${expenditure.id}`}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(expenditure)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-8 text-center">No expenditure records found. Add one to get started.</div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this expenditure record? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}