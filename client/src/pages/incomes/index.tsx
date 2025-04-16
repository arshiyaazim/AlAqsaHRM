import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { DailyIncome } from "@shared/schema";
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

export default function IncomeList() {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedIncome, setSelectedIncome] = useState<DailyIncome | null>(null);
  const { toast } = useToast();

  const { data: incomes, isLoading } = useQuery<DailyIncome[]>({
    queryKey: ["/api/incomes"],
  });

  const handleDeleteClick = (income: DailyIncome) => {
    setSelectedIncome(income);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedIncome) return;

    try {
      const response = await fetch(`/api/incomes/${selectedIncome.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast({
          title: "Income deleted",
          description: "The income record has been deleted successfully.",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/incomes"] });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete income");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred while deleting the income",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setSelectedIncome(null);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Daily Income</h1>
        <Button asChild>
          <Link href="/incomes/add">
            <Plus className="mr-2 h-4 w-4" /> Add Income
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Income Records</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center">Loading income data...</div>
          ) : incomes && incomes.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Received From</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Remarks</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incomes.map((income) => (
                  <TableRow key={income.id}>
                    <TableCell>{formatDate(income.date)}</TableCell>
                    <TableCell>{income.receivedFrom}</TableCell>
                    <TableCell>{income.amount}</TableCell>
                    <TableCell>{income.description || "-"}</TableCell>
                    <TableCell>{income.remarks || "-"}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/incomes/edit/${income.id}`}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(income)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-8 text-center">No income records found. Add one to get started.</div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this income record? This action cannot be undone.
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