import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Plus, Edit, Trash, Eye, Calendar } from "lucide-react";
import { formatDate } from "@/lib/utils";
import PageHeader from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface Project {
  id: number;
  name: string;
  description: string | null;
  location: string | null;
  startDate: string | null;
  endDate: string | null;
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
      <PageHeader
        title="Projects"
        description="Manage your projects and their custom fields"
        actions={
          <Link href="/projects/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Project
            </Button>
          </Link>
        }
      />

      <Separator className="my-6" />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="pb-3">
                <Skeleton className="h-5 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-16 w-full mb-2" />
                <div className="flex items-center mt-2">
                  <Skeleton className="h-4 w-4 mr-2" />
                  <Skeleton className="h-4 w-28" />
                </div>
              </CardContent>
              <CardFooter className="bg-muted/30 pt-3">
                <div className="flex justify-end gap-2 w-full">
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-8 w-8" />
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <Card key={project.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{project.name}</CardTitle>
                  <Badge variant={project.active ? "default" : "outline"}>
                    {project.active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                {project.location && (
                  <p className="text-sm text-muted-foreground">{project.location}</p>
                )}
              </CardHeader>
              <CardContent className="pb-4">
                {project.description && (
                  <p className="text-sm line-clamp-3 mb-3">{project.description}</p>
                )}
                {(project.startDate || project.endDate) && (
                  <div className="flex items-center text-sm text-muted-foreground mt-2">
                    <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>
                      {project.startDate && formatDate(project.startDate)}
                      {project.startDate && project.endDate && " - "}
                      {project.endDate && formatDate(project.endDate)}
                    </span>
                  </div>
                )}
              </CardContent>
              <CardFooter className="bg-muted/30 pt-3 gap-2 justify-end">
                <Link href={`/projects/${project.id}/fields`}>
                  <Button variant="outline" size="icon" title="Manage Custom Fields">
                    <Eye className="h-4 w-4" />
                  </Button>
                </Link>
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
          <Link href="/projects/new">
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