import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, PlusCircle, Filter, Download, Search, FileSpreadsheet } from "lucide-react";
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
import { ShipDuty } from "@shared/schema";
import { exportShipDutiesToExcel } from "@/lib/exports/shipDutyExport";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function ShipDutyPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  
  // Fetch ship duties
  const { data: shipDuties, isLoading } = useQuery<ShipDuty[]>({
    queryKey: ["/api/ship-duties"],
    onError: (error) => {
      toast({
        title: "Error fetching ship duties",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Fetch employees to get names
  const { data: employees } = useQuery({
    queryKey: ["/api/employees"],
  });
  
  // Fetch projects to get project names
  const { data: projects } = useQuery({
    queryKey: ["/api/projects"],
  });

  // Create a map of employee names for easier lookup
  const employeeNameMap = employees?.reduce((acc, employee) => {
    if (employee.id) {
      acc[employee.id] = `${employee.firstName} ${employee.lastName}`;
    }
    return acc;
  }, {} as Record<number, string>) || {};
  
  // Get project name for export
  const projectName = projects?.[0]?.name || "Marine";
  
  // Handle export to Excel
  const handleExport = () => {
    if (!shipDuties || shipDuties.length === 0) {
      toast({
        title: "No data to export",
        description: "There are no ship duties to export.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      exportShipDutiesToExcel({
        duties: filteredDuties || shipDuties,
        employeeNames: employeeNameMap,
        projectName
      });
      
      toast({
        title: "Export successful",
        description: "Ship duties exported to Excel successfully.",
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
  
  // Filter duties based on search term
  const filteredDuties = shipDuties?.filter((duty) => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      (duty.vesselName && duty.vesselName.toLowerCase().includes(searchLower)) ||
      (duty.lighterName && duty.lighterName.toLowerCase().includes(searchLower)) ||
      (duty.releasePoint && duty.releasePoint.toLowerCase().includes(searchLower))
    );
  });

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-2xl font-bold">Ship Duty Management</CardTitle>
          <div className="flex space-x-2">
            <Link href="/ship-duties/add">
              <Button size="sm">
                <PlusCircle className="h-4 w-4 mr-2" />
                Add New
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
                <DropdownMenuItem onClick={handleExport}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export to Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by vessel name, lighter name, or release point..."
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
                    <TableHead>Vessel Name</TableHead>
                    <TableHead>Lighter Name</TableHead>
                    <TableHead>Duty Date</TableHead>
                    <TableHead>Duty Hours</TableHead>
                    <TableHead>Release Point</TableHead>
                    <TableHead>Salary Rate</TableHead>
                    <TableHead>Conveyance</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDuties && filteredDuties.length > 0 ? (
                    filteredDuties.map((duty) => (
                      <TableRow key={duty.id}>
                        <TableCell className="font-medium">{duty.vesselName}</TableCell>
                        <TableCell>{duty.lighterName || "—"}</TableCell>
                        <TableCell>
                          {format(new Date(duty.dutyDate), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell>{duty.dutyHours}</TableCell>
                        <TableCell>{duty.releasePoint || "—"}</TableCell>
                        <TableCell>৳{Number(duty.salaryRate).toFixed(2)}</TableCell>
                        <TableCell>৳{Number(duty.conveyanceAmount).toFixed(2)}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Link href={`/ship-duties/edit/${duty.id}`}>
                              <Button size="sm" variant="outline">
                                Edit
                              </Button>
                            </Link>
                            <Link href={`/ship-duties/view/${duty.id}`}>
                              <Button size="sm" variant="outline">
                                View
                              </Button>
                            </Link>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                        {searchTerm ? "No ship duties found matching your search." : "No ship duties recorded yet."}
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