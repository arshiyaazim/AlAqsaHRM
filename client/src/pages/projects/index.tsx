import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Plus, Edit, Trash, Calendar, User, Users, DollarSign, Anchor, Ship, Briefcase, MapPin, Truck, CreditCard } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface Project {
  id: number;
  name: string;
  clientName?: string;
  vessel?: string;
  lighter?: string;
  startDate?: string | null;
  endDate?: string | null;
  duty?: string;
  salary?: string;
  releasePoint?: string;
  conveyance?: string;
  loanAdvance?: string;
  due?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function ProjectsPage() {
  const { toast } = useToast();
  
  const { data: projects, isLoading, error } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  async function handleDeleteProject(id: number) {
    if (!confirm("Are you sure you want to delete this project?")) {
      return;
    }
    
    try {
      await apiRequest("DELETE", `/api/projects/${id}`);
      
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      
      toast({
        title: "Project deleted",
        description: "The project has been deleted successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete the project. Please try again.",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your projects and their details
          </p>
        </div>
        <Link href="/projects/add">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Button>
        </Link>
      </div>

      <Separator className="my-6" />

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="pb-3">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </CardContent>
              <CardFooter className="bg-muted/30 pt-3">
                <div className="flex justify-end gap-2 w-full">
                  <Skeleton className="h-9 w-9 rounded-md" />
                  <Skeleton className="h-9 w-9 rounded-md" />
                  <Skeleton className="h-9 w-9 rounded-md" />
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : error ? (
        <div className="text-center p-10 bg-muted rounded-lg">
          <p className="text-destructive">Failed to load projects. Please try again.</p>
        </div>
      ) : projects && projects.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {projects.map((project) => (
            <Card key={project.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{project.name}</CardTitle>
                  <Badge variant={project.active ? "default" : "outline"}>
                    {project.active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                {project.clientName && (
                  <p className="text-sm text-muted-foreground flex items-center">
                    <User className="h-3.5 w-3.5 mr-1.5 text-muted-foreground/70" />
                    {project.clientName}
                  </p>
                )}
              </CardHeader>
              <CardContent className="pb-4">
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  {(project.startDate || project.endDate) && (
                    <div className="col-span-2 flex items-center text-muted-foreground mb-1">
                      <Calendar className="h-3.5 w-3.5 mr-1.5 text-muted-foreground/70" />
                      <span>
                        {project.startDate && formatDate(project.startDate as string)}
                        {project.startDate && project.endDate && " - "}
                        {project.endDate && formatDate(project.endDate as string)}
                      </span>
                    </div>
                  )}
                  
                  {project.vessel && (
                    <div className="flex items-center gap-1.5">
                      <Ship className="h-3.5 w-3.5 text-muted-foreground/70" />
                      <span>Vessel: {project.vessel}</span>
                    </div>
                  )}
                  
                  {project.lighter && (
                    <div className="flex items-center gap-1.5">
                      <Anchor className="h-3.5 w-3.5 text-muted-foreground/70" />
                      <span>Lighter: {project.lighter}</span>
                    </div>
                  )}
                  
                  {project.duty && (
                    <div className="flex items-center gap-1.5">
                      <Briefcase className="h-3.5 w-3.5 text-muted-foreground/70" />
                      <span>Duty: {project.duty}</span>
                    </div>
                  )}
                  
                  {project.salary && (
                    <div className="flex items-center gap-1.5">
                      <DollarSign className="h-3.5 w-3.5 text-muted-foreground/70" />
                      <span>Salary: {project.salary}</span>
                    </div>
                  )}
                  
                  {project.releasePoint && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground/70" />
                      <span>Release: {project.releasePoint}</span>
                    </div>
                  )}
                  
                  {project.conveyance && (
                    <div className="flex items-center gap-1.5">
                      <Truck className="h-3.5 w-3.5 text-muted-foreground/70" />
                      <span>Conveyance: {project.conveyance}</span>
                    </div>
                  )}
                  
                  {project.loanAdvance && (
                    <div className="flex items-center gap-1.5">
                      <CreditCard className="h-3.5 w-3.5 text-muted-foreground/70" />
                      <span>Loan/Adv: {project.loanAdvance}</span>
                    </div>
                  )}
                  
                  {project.due && (
                    <div className="flex items-center gap-1.5">
                      <DollarSign className="h-3.5 w-3.5 text-muted-foreground/70" />
                      <span>Due: {project.due}</span>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="bg-muted/30 pt-3 gap-2 justify-end">
                <Link href={`/projects/${project.id}/edit`}>
                  <Button variant="outline" size="icon">
                    <Edit className="h-4 w-4" />
                  </Button>
                </Link>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => handleDeleteProject(project.id)}
                >
                  <Trash className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center p-10 bg-muted rounded-lg">
          <h3 className="text-lg font-medium mb-2">No Projects Found</h3>
          <p className="text-muted-foreground mb-4">
            Get started by creating your first project
          </p>
          <Link href="/projects/add">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Project
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}