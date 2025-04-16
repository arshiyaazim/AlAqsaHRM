import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import FieldCustomizer from "@/components/settings/field-customizer";
import EmployeeImport from "@/components/employees/employee-import";

export default function Settings() {
  const [activeTab, setActiveTab] = useState<string>("fields");
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-gray-500">
          Customize your HR system and import data
        </p>
      </div>
      
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="fields">Field Customization</TabsTrigger>
          <TabsTrigger value="import">Data Import</TabsTrigger>
        </TabsList>
        
        <TabsContent value="fields" className="mt-6">
          <FieldCustomizer 
            onComplete={() => {
              // Show success message or refresh data if needed
            }}
          />
        </TabsContent>
        
        <TabsContent value="import" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Import Data</CardTitle>
              <CardDescription>
                Import employee data from Excel files
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EmployeeImport 
                onComplete={() => {
                  // Show success message or refresh data if needed
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}