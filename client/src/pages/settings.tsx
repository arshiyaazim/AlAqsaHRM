import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ColorPicker } from "@/components/ui/color-picker";
import { Separator } from "@/components/ui/separator";
import FieldCustomizer from "@/components/settings/field-customizer";
import EmployeeImport from "@/components/employees/employee-import";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { apiRequest } from "@/lib/queryClient";

// Company settings schema
const companyFormSchema = z.object({
  companyName: z.string().min(2, { message: "Company name must be at least 2 characters" }),
  companyTagline: z.string().optional(),
  primaryColor: z.string(),
  logo: z.any().optional(), // This would be a file input
});

// Login page customization schema
const loginFormSchema = z.object({
  title: z.string().min(2, { message: "Title must be at least 2 characters" }),
  description: z.string().optional(),
  backgroundImage: z.any().optional(), // This would be a file input
  logoEnabled: z.boolean().default(true),
});

// Feature customization schema
const featureFormSchema = z.object({
  enablePayroll: z.boolean().default(true),
  enableAttendance: z.boolean().default(true),
  enableProjects: z.boolean().default(true),
  enableIncomeTracking: z.boolean().default(true),
  enableExpenditureTracking: z.boolean().default(true),
  enableFileUploads: z.boolean().default(true),
  customModuleTitle1: z.string().optional(),
  customModuleTitle2: z.string().optional(),
});

type CompanyFormValues = z.infer<typeof companyFormSchema>;
type LoginFormValues = z.infer<typeof loginFormSchema>;
type FeatureFormValues = z.infer<typeof featureFormSchema>;

export default function Settings() {
  const [activeTab, setActiveTab] = useState<string>("company");
  const { toast } = useToast();
  const { settings, updateSettings } = useCompanySettings();
  
  // Company form
  const companyForm = useForm<CompanyFormValues>({
    resolver: zodResolver(companyFormSchema),
    defaultValues: {
      companyName: settings.companyName || "My Company",
      companyTagline: settings.companyTagline || "HR & Payroll Management",
      primaryColor: settings.primaryColor || "#2C5282",
    },
  });
  
  // Update form when settings load
  useEffect(() => {
    companyForm.reset({
      companyName: settings.companyName || "My Company",
      companyTagline: settings.companyTagline || "HR & Payroll Management",
      primaryColor: settings.primaryColor || "#2C5282",
    });
  }, [settings, companyForm]);
  
  // Login page form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      title: "HR & Payroll Management",
      description: "Login or create a new account to get started",
      logoEnabled: true,
    },
  });
  
  // Features form
  const featureForm = useForm<FeatureFormValues>({
    resolver: zodResolver(featureFormSchema),
    defaultValues: {
      enablePayroll: true,
      enableAttendance: true,
      enableProjects: true,
      enableIncomeTracking: true,
      enableExpenditureTracking: true,
      enableFileUploads: true,
    },
  });
  
  // Form submission handlers
  const onCompanySubmit = async (data: CompanyFormValues) => {
    try {
      console.log("Company settings:", data);
      
      // If logo is a File, upload it first
      let logoUrl = undefined;
      
      if (data.logo instanceof File) {
        const formData = new FormData();
        formData.append('file', data.logo);
        
        // Upload the file
        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        
        if (!uploadResponse.ok) {
          throw new Error('Failed to upload logo');
        }
        
        const uploadResult = await uploadResponse.json();
        console.log("Upload result:", uploadResult);
        
        // Use the url or filePath property from the response
        logoUrl = uploadResult.url || uploadResult.filePath;
      }
      
      // Save company settings with the logo URL
      const settingsData = {
        companyName: data.companyName,
        companyTagline: data.companyTagline || '',
        primaryColor: data.primaryColor,
        logoUrl: logoUrl // Use the uploaded file URL
      };
      
      // Save company settings
      const response = await apiRequest('POST', '/api/settings/company', settingsData);
      
      if (!response.ok) {
        throw new Error('Failed to save company settings');
      }
      
      // Update the settings context
      const savedSettings = await response.json();
      updateSettings(savedSettings);
      
      toast({
        title: "Company settings saved",
        description: "Your changes have been applied successfully.",
      });
    } catch (error) {
      console.error('Error saving company settings:', error);
      toast({
        title: "Error saving settings",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    }
  };
  
  const onLoginSubmit = (data: LoginFormValues) => {
    console.log("Login page settings:", data);
    toast({
      title: "Login page settings saved",
      description: "Your changes have been applied successfully.",
    });
  };
  
  const onFeatureSubmit = (data: FeatureFormValues) => {
    console.log("Feature settings:", data);
    toast({
      title: "Feature settings saved",
      description: "Your changes have been applied successfully.",
    });
  };
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-gray-500">
          Customize your HR system and import data
        </p>
      </div>
      
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="company">Company</TabsTrigger>
          <TabsTrigger value="login">Login Page</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="fields">Field Customization</TabsTrigger>
          <TabsTrigger value="import">Data Import</TabsTrigger>
        </TabsList>
        
        {/* Company Settings */}
        <TabsContent value="company" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Company Settings</CardTitle>
              <CardDescription>
                Customize your company information and branding
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...companyForm}>
                <form onSubmit={companyForm.handleSubmit(onCompanySubmit)} className="space-y-6">
                  <FormField
                    control={companyForm.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormDescription>
                          This will be displayed throughout the application.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={companyForm.control}
                    name="companyTagline"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tagline (Optional)</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormDescription>
                          A short description of your company.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={companyForm.control}
                    name="primaryColor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Primary Color</FormLabel>
                        <FormControl>
                          <div className="flex items-center gap-4">
                            <Input {...field} type="text" />
                            <div 
                              className="w-10 h-10 rounded-md border" 
                              style={{ backgroundColor: field.value }}
                            />
                          </div>
                        </FormControl>
                        <FormDescription>
                          The main color for buttons and accents.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={companyForm.control}
                    name="logo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Logo</FormLabel>
                        <FormControl>
                          <Input 
                            type="file" 
                            accept="image/*" 
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                field.onChange(file);
                              }
                            }} 
                          />
                        </FormControl>
                        <FormDescription>
                          Upload your company logo (PNG, JPG, or SVG).
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button type="submit">Save Company Settings</Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Login Page Customization */}
        <TabsContent value="login" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Login Page Customization</CardTitle>
              <CardDescription>
                Customize the appearance of your login page
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-6">
                  <FormField
                    control={loginForm.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Page Title</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormDescription>
                          The main title displayed on the login page.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={loginForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Page Description</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
                        </FormControl>
                        <FormDescription>
                          A brief description or welcome message.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={loginForm.control}
                    name="backgroundImage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Background Image</FormLabel>
                        <FormControl>
                          <Input 
                            type="file" 
                            accept="image/*" 
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                field.onChange(file);
                              }
                            }} 
                          />
                        </FormControl>
                        <FormDescription>
                          Custom background image for the login page.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button type="submit">Save Login Settings</Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Features Settings */}
        <TabsContent value="features" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Features Customization</CardTitle>
              <CardDescription>
                Enable or disable features and customize module titles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...featureForm}>
                <form onSubmit={featureForm.handleSubmit(onFeatureSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={featureForm.control}
                      name="enablePayroll"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between p-3 border rounded-md">
                          <div>
                            <FormLabel>Payroll Module</FormLabel>
                            <FormDescription>
                              Manage employee compensation
                            </FormDescription>
                          </div>
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              className="toggle toggle-primary"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={featureForm.control}
                      name="enableAttendance"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between p-3 border rounded-md">
                          <div>
                            <FormLabel>Attendance Module</FormLabel>
                            <FormDescription>
                              Track employee presence and hours
                            </FormDescription>
                          </div>
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              className="toggle toggle-primary"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={featureForm.control}
                      name="enableProjects"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between p-3 border rounded-md">
                          <div>
                            <FormLabel>Projects Module</FormLabel>
                            <FormDescription>
                              Manage work projects and assignments
                            </FormDescription>
                          </div>
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              className="toggle toggle-primary"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={featureForm.control}
                      name="enableIncomeTracking"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between p-3 border rounded-md">
                          <div>
                            <FormLabel>Income Tracking</FormLabel>
                            <FormDescription>
                              Record and manage income sources
                            </FormDescription>
                          </div>
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              className="toggle toggle-primary"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={featureForm.control}
                      name="enableExpenditureTracking"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between p-3 border rounded-md">
                          <div>
                            <FormLabel>Expenditure Tracking</FormLabel>
                            <FormDescription>
                              Record and categorize expenses
                            </FormDescription>
                          </div>
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              className="toggle toggle-primary"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={featureForm.control}
                      name="enableFileUploads"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between p-3 border rounded-md">
                          <div>
                            <FormLabel>File Uploads</FormLabel>
                            <FormDescription>
                              Allow document and image uploads
                            </FormDescription>
                          </div>
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              className="toggle toggle-primary"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <Separator className="my-6" />
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Custom Module Titles</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={featureForm.control}
                        name="customModuleTitle1"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Custom Module 1</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Enter module title" />
                            </FormControl>
                            <FormDescription>
                              Name for your custom module
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={featureForm.control}
                        name="customModuleTitle2"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Custom Module 2</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Enter module title" />
                            </FormControl>
                            <FormDescription>
                              Name for another custom module
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  
                  <Button type="submit">Save Feature Settings</Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Field Customization */}
        <TabsContent value="fields" className="mt-6">
          <FieldCustomizer 
            onComplete={() => {
              toast({
                title: "Fields customized",
                description: "Your field changes have been saved successfully.",
              });
            }}
          />
        </TabsContent>
        
        {/* Data Import */}
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
                  toast({
                    title: "Import completed",
                    description: "Your data has been imported successfully.",
                  });
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}