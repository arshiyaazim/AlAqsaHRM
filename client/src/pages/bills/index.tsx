import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, PlusCircle, Filter, Download, Search, FileText } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Bill, ShipDuty } from "@shared/schema";
import { exportBillToDocx } from "@/lib/exports/billExport";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function BillManagementPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  
  // Fetch bills
  const { data: bills, isLoading } = useQuery<Bill[]>({
    queryKey: ["/api/bills"],
    onError: (error) => {
      toast({
        title: "Error fetching bills",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Fetch company info
  const { data: companyInfo } = useQuery({
    queryKey: ["/api/company-info"],
  });
  
  // Fetch employees to get names
  const { data: employees } = useQuery({
    queryKey: ["/api/employees"],
  });
  
  // Fetch ship duties to include in the bill
  const { data: allShipDuties } = useQuery<ShipDuty[]>({
    queryKey: ["/api/ship-duties"],
  });

  // Filter bills based on search term
  const filteredBills = bills?.filter((bill) => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      bill.billNumber.toLowerCase().includes(searchLower) ||
      bill.clientName.toLowerCase().includes(searchLower)
    );
  });

  // Create a map of employee names for easier lookup
  const employeeNameMap = employees?.reduce((acc, employee) => {
    if (employee.id) {
      acc[employee.id] = `${employee.firstName} ${employee.lastName}`;
    }
    return acc;
  }, {} as Record<number, string>) || {};
  
  // Handle export to DOCX
  const handleExportBill = (billId: number) => {
    if (!bills || !allShipDuties) {
      toast({
        title: "Export failed",
        description: "Required data is not loaded",
        variant: "destructive",
      });
      return;
    }
    
    const bill = bills.find(b => b.id === billId);
    
    if (!bill) {
      toast({
        title: "Export failed",
        description: "Bill not found",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Get ship duties associated with this bill
      const selectedDuties = allShipDuties.filter(duty => 
        duty.billId === billId || 
        (new Date(duty.dutyDate) >= new Date(bill.startDate) && 
         new Date(duty.dutyDate) <= new Date(bill.endDate) &&
         duty.billId === null || duty.billId === undefined)
      ).map(duty => ({
        id: duty.id,
        dutyDate: duty.dutyDate,
        employeeId: duty.employeeId,
        employeeName: employeeNameMap[duty.employeeId] || `Employee #${duty.employeeId}`,
        vesselName: duty.vesselName,
        lighterName: duty.lighterName || "",
        dutyHours: duty.dutyHours,
        salaryRate: duty.salaryRate,
        conveyanceAmount: duty.conveyanceAmount,
        amount: duty.dutyHours * duty.salaryRate
      }));
      
      // Company info
      const company = {
        companyName: companyInfo?.companyName || "Marine HR Management",
        companyAddress: companyInfo?.address || "Dhaka, Bangladesh",
        companyPhone: companyInfo?.phone || "",
        companyEmail: companyInfo?.email || ""
      };
      
      exportBillToDocx({
        bill,
        companyName: company.companyName,
        companyAddress: company.companyAddress,
        companyPhone: company.companyPhone,
        companyEmail: company.companyEmail,
        selectedDuties,
        employeeNames: employeeNameMap
      });
      
      toast({
        title: "Export successful",
        description: "Bill exported to DOCX successfully",
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    }
  };
  
  // Helper function to get status badge color
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "draft":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200";
      case "sent":
        return "bg-blue-100 text-blue-800 hover:bg-blue-200";
      case "paid":
        return "bg-green-100 text-green-800 hover:bg-green-200";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-200";
    }
  };

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-2xl font-bold">Bill Management</CardTitle>
          <div className="flex space-x-2">
            <Link href="/bills/generate">
              <Button size="sm">
                <PlusCircle className="h-4 w-4 mr-2" />
                Generate New Bill
              </Button>
            </Link>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {filteredBills?.map(bill => (
                  <DropdownMenuItem key={bill.id} onClick={() => handleExportBill(bill.id)}>
                    <FileText className="h-4 w-4 mr-2" />
                    {bill.billNumber} - {bill.clientName}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by bill number or client name..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bill Number</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Bill Period</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due Amount</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBills && filteredBills.length > 0 ? (
                    filteredBills.map((bill) => (
                      <TableRow key={bill.id}>
                        <TableCell className="font-medium">{bill.billNumber}</TableCell>
                        <TableCell>{bill.clientName}</TableCell>
                        <TableCell>
                          {format(new Date(bill.billDate), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell>
                          {format(new Date(bill.startDate), "MMM dd")} - {format(new Date(bill.endDate), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell>৳{Number(bill.grossAmount).toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(bill.status)}>
                            {bill.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {Number(bill.dueAmount) > 0 ? (
                            <span className="text-red-600 font-medium">
                              ৳{Number(bill.dueAmount).toFixed(2)}
                            </span>
                          ) : (
                            "Paid"
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Link href={`/bills/edit/${bill.id}`}>
                              <Button size="sm" variant="outline">
                                Edit
                              </Button>
                            </Link>
                            <Link href={`/bills/view/${bill.id}`}>
                              <Button size="sm" variant="outline">
                                View
                              </Button>
                            </Link>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleExportBill(bill.id)}
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              Export
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                        {searchTerm ? "No bills found matching your search." : "No bills generated yet."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}