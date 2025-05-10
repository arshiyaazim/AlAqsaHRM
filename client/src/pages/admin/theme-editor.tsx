import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Palette, 
  Type, 
  Layout, 
  LayoutGrid, 
  Eye,
  Save,
  RotateCcw,
  CheckCircle,
  AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function ThemeEditorPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("colors");
  const [previewMode, setPreviewMode] = useState<"light" | "dark">("light");

  // Theme state
  const [themeSettings, setThemeSettings] = useState({
    primaryColor: "#2C5282",
    secondaryColor: "#38B2AC",
    textColor: "#1A202C",
    backgroundColor: "#FFFFFF",
    accentColor: "#4FD1C5",
    errorColor: "#E53E3E",
    successColor: "#38A169",
    borderRadius: 6,
    fontPrimary: "Nunito",
    fontSize: 16,
    darkMode: true,
    navbarPosition: "left",
    customCSS: "",
  });

  // Sample preview content
  const previewContent = {
    title: "Sample Dashboard",
    description: "This is how your theme will look",
    ctaText: "Primary Action",
    secondaryText: "Secondary Action",
    alertText: "This is an important alert message that requires attention",
    successText: "Operation completed successfully",
  };

  // Query to get current theme settings
  const { data: currentTheme, isLoading } = useQuery({
    queryKey: ['/api/admin/theme'],
    retry: false,
    onError: (error) => {
      console.error("Error loading theme settings:", error);
      return {
        theme: { ...themeSettings }
      };
    }
  });

  // Update theme settings
  const updateThemeMutation = useMutation({
    mutationFn: async (themeData: any) => {
      return await apiRequest('POST', '/api/admin/theme', themeData);
    },
    onSuccess: () => {
      toast({
        title: "Theme Updated",
        description: "Your theme settings have been saved.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/theme'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update theme. " + (error as Error).message,
        variant: "destructive",
      });
    }
  });

  // Reset theme to defaults
  const resetTheme = () => {
    const defaultTheme = {
      primaryColor: "#2C5282",
      secondaryColor: "#38B2AC",
      textColor: "#1A202C",
      backgroundColor: "#FFFFFF",
      accentColor: "#4FD1C5",
      errorColor: "#E53E3E",
      successColor: "#38A169",
      borderRadius: 6,
      fontPrimary: "Nunito",
      fontSize: 16,
      darkMode: true,
      navbarPosition: "left",
      customCSS: "",
    };
    
    if (window.confirm("Are you sure you want to reset to default theme settings?")) {
      setThemeSettings(defaultTheme);
      toast({
        title: "Theme Reset",
        description: "Theme settings have been reset to defaults. Click Save to apply changes.",
      });
    }
  };

  const saveTheme = () => {
    updateThemeMutation.mutate(themeSettings);
  };

  // Update theme settings from server data
  useEffect(() => {
    if (currentTheme?.theme) {
      setThemeSettings(prev => ({
        ...prev,
        ...currentTheme.theme
      }));
    }
  }, [currentTheme]);

  // Check admin access
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        if (userData && userData.role !== 'admin') {
          toast({
            title: "Access Denied",
            description: "You don't have permission to access this page.",
            variant: "destructive"
          });
          window.location.href = "/";
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    } else {
      toast({
        title: "Authentication Required",
        description: "Please log in to access this page.",
        variant: "destructive"
      });
      window.location.href = "/auth";
    }
  }, [toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Palette className="h-10 w-10 text-primary animate-pulse mx-auto mb-4" />
          <p className="text-muted-foreground">Loading theme settings...</p>
        </div>
      </div>
    );
  }

  // Dynamic preview styles
  const previewStyles = {
    container: {
      backgroundColor: previewMode === "light" ? themeSettings.backgroundColor : "#1E293B",
      color: previewMode === "light" ? themeSettings.textColor : "#E2E8F0",
      borderRadius: `${themeSettings.borderRadius}px`,
      fontFamily: themeSettings.fontPrimary,
      fontSize: `${themeSettings.fontSize}px`,
      padding: "20px",
      transition: "all 0.3s ease"
    },
    header: {
      backgroundColor: previewMode === "light" ? "#F7FAFC" : "#0F172A",
      color: previewMode === "light" ? themeSettings.textColor : "#E2E8F0",
      padding: "16px",
      borderRadius: `${themeSettings.borderRadius}px ${themeSettings.borderRadius}px 0 0`,
      borderBottom: previewMode === "light" ? "1px solid #E2E8F0" : "1px solid #2D3748",
    },
    button: {
      primary: {
        backgroundColor: themeSettings.primaryColor,
        color: "#FFFFFF",
        borderRadius: `${themeSettings.borderRadius}px`,
        padding: "8px 16px",
        border: "none",
        cursor: "pointer",
        fontWeight: "bold",
      },
      secondary: {
        backgroundColor: "transparent",
        color: themeSettings.secondaryColor,
        borderRadius: `${themeSettings.borderRadius}px`,
        padding: "8px 16px",
        border: `1px solid ${themeSettings.secondaryColor}`,
        cursor: "pointer",
      }
    },
    alert: {
      backgroundColor: previewMode === "light" ? "#FFF5F5" : "#3B1818",
      color: themeSettings.errorColor,
      borderRadius: `${themeSettings.borderRadius}px`,
      padding: "16px",
      border: `1px solid ${themeSettings.errorColor}`,
    },
    success: {
      backgroundColor: previewMode === "light" ? "#F0FFF4" : "#1C2A22",
      color: themeSettings.successColor,
      borderRadius: `${themeSettings.borderRadius}px`,
      padding: "16px",
      border: `1px solid ${themeSettings.successColor}`,
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Theme Editor</h2>
          <p className="text-muted-foreground">
            Customize the appearance of your application
          </p>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={resetTheme}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset to Defaults
          </Button>
          <Button 
            onClick={saveTheme}
            disabled={updateThemeMutation.isPending}
          >
            {updateThemeMutation.isPending ? (
              <>Loading...</>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Editor Panel */}
        <div className="col-span-1 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Theme Settings</CardTitle>
              <CardDescription>
                Configure the visual appearance of your application
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="colors" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="grid grid-cols-4 w-full">
                  <TabsTrigger value="colors" className="flex items-center">
                    <Palette className="mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">Colors</span>
                  </TabsTrigger>
                  <TabsTrigger value="typography" className="flex items-center">
                    <Type className="mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">Typography</span>
                  </TabsTrigger>
                  <TabsTrigger value="layout" className="flex items-center">
                    <Layout className="mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">Layout</span>
                  </TabsTrigger>
                  <TabsTrigger value="custom" className="flex items-center">
                    <LayoutGrid className="mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">Custom CSS</span>
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="colors" className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="primaryColor">Primary Color</Label>
                        <div className="flex space-x-2">
                          <div 
                            className="w-8 h-8 rounded border"
                            style={{ backgroundColor: themeSettings.primaryColor }}
                          />
                          <Input 
                            id="primaryColor"
                            type="text"
                            value={themeSettings.primaryColor} 
                            onChange={(e) => setThemeSettings({...themeSettings, primaryColor: e.target.value})}
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="secondaryColor">Secondary Color</Label>
                        <div className="flex space-x-2">
                          <div 
                            className="w-8 h-8 rounded border"
                            style={{ backgroundColor: themeSettings.secondaryColor }}
                          />
                          <Input 
                            id="secondaryColor"
                            type="text"
                            value={themeSettings.secondaryColor} 
                            onChange={(e) => setThemeSettings({...themeSettings, secondaryColor: e.target.value})}
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="accentColor">Accent Color</Label>
                        <div className="flex space-x-2">
                          <div 
                            className="w-8 h-8 rounded border"
                            style={{ backgroundColor: themeSettings.accentColor }}
                          />
                          <Input 
                            id="accentColor"
                            type="text"
                            value={themeSettings.accentColor} 
                            onChange={(e) => setThemeSettings({...themeSettings, accentColor: e.target.value})}
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="textColor">Text Color</Label>
                        <div className="flex space-x-2">
                          <div 
                            className="w-8 h-8 rounded border"
                            style={{ backgroundColor: themeSettings.textColor }}
                          />
                          <Input 
                            id="textColor"
                            type="text"
                            value={themeSettings.textColor} 
                            onChange={(e) => setThemeSettings({...themeSettings, textColor: e.target.value})}
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="backgroundColor">Background Color</Label>
                        <div className="flex space-x-2">
                          <div 
                            className="w-8 h-8 rounded border"
                            style={{ backgroundColor: themeSettings.backgroundColor }}
                          />
                          <Input 
                            id="backgroundColor"
                            type="text"
                            value={themeSettings.backgroundColor} 
                            onChange={(e) => setThemeSettings({...themeSettings, backgroundColor: e.target.value})}
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="errorColor">Error Color</Label>
                          <div className="flex space-x-2">
                            <div 
                              className="w-8 h-8 rounded border"
                              style={{ backgroundColor: themeSettings.errorColor }}
                            />
                            <Input 
                              id="errorColor"
                              type="text"
                              value={themeSettings.errorColor} 
                              onChange={(e) => setThemeSettings({...themeSettings, errorColor: e.target.value})}
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="successColor">Success Color</Label>
                          <div className="flex space-x-2">
                            <div 
                              className="w-8 h-8 rounded border"
                              style={{ backgroundColor: themeSettings.successColor }}
                            />
                            <Input 
                              id="successColor"
                              type="text"
                              value={themeSettings.successColor} 
                              onChange={(e) => setThemeSettings({...themeSettings, successColor: e.target.value})}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="darkMode">Enable Dark Mode Support</Label>
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="darkMode"
                        checked={themeSettings.darkMode} 
                        onCheckedChange={(checked) => setThemeSettings({...themeSettings, darkMode: checked})}
                      />
                      <span className="text-sm text-muted-foreground">
                        {themeSettings.darkMode ? "Dark mode support is enabled" : "Dark mode support is disabled"}
                      </span>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="typography" className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="fontPrimary">Primary Font</Label>
                      <RadioGroup 
                        value={themeSettings.fontPrimary}
                        onValueChange={(value) => setThemeSettings({...themeSettings, fontPrimary: value})}
                        className="grid grid-cols-2 gap-4"
                      >
                        <div>
                          <RadioGroupItem 
                            value="Nunito" 
                            id="font-nunito" 
                            className="peer sr-only" 
                          />
                          <Label
                            htmlFor="font-nunito"
                            className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                          >
                            <span style={{ fontFamily: 'Nunito' }} className="text-xl">Nunito</span>
                            <span className="text-sm text-muted-foreground">Sans-serif</span>
                          </Label>
                        </div>
                        
                        <div>
                          <RadioGroupItem 
                            value="Inter" 
                            id="font-inter" 
                            className="peer sr-only" 
                          />
                          <Label
                            htmlFor="font-inter"
                            className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                          >
                            <span style={{ fontFamily: 'Inter' }} className="text-xl">Inter</span>
                            <span className="text-sm text-muted-foreground">Sans-serif</span>
                          </Label>
                        </div>
                        
                        <div>
                          <RadioGroupItem 
                            value="Roboto" 
                            id="font-roboto" 
                            className="peer sr-only" 
                          />
                          <Label
                            htmlFor="font-roboto"
                            className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                          >
                            <span style={{ fontFamily: 'Roboto' }} className="text-xl">Roboto</span>
                            <span className="text-sm text-muted-foreground">Sans-serif</span>
                          </Label>
                        </div>
                        
                        <div>
                          <RadioGroupItem 
                            value="Merriweather" 
                            id="font-merriweather" 
                            className="peer sr-only" 
                          />
                          <Label
                            htmlFor="font-merriweather"
                            className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                          >
                            <span style={{ fontFamily: 'Merriweather' }} className="text-xl">Merriweather</span>
                            <span className="text-sm text-muted-foreground">Serif</span>
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label htmlFor="fontSize">Base Font Size: {themeSettings.fontSize}px</Label>
                        <span className="text-sm text-muted-foreground">{themeSettings.fontSize}px</span>
                      </div>
                      <Slider
                        id="fontSize"
                        defaultValue={[themeSettings.fontSize]}
                        min={12}
                        max={20}
                        step={1}
                        onValueChange={(value) => setThemeSettings({...themeSettings, fontSize: value[0]})}
                      />
                      <div className="grid grid-cols-3 text-xs text-muted-foreground">
                        <div>Small (12px)</div>
                        <div className="text-center">Medium (16px)</div>
                        <div className="text-right">Large (20px)</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="borderRadius">Border Radius: {themeSettings.borderRadius}px</Label>
                    <Slider
                      id="borderRadius"
                      defaultValue={[themeSettings.borderRadius]}
                      min={0}
                      max={12}
                      step={1}
                      onValueChange={(value) => setThemeSettings({...themeSettings, borderRadius: value[0]})}
                    />
                    <div className="grid grid-cols-3 text-xs text-muted-foreground">
                      <div>Square (0px)</div>
                      <div className="text-center">Medium (6px)</div>
                      <div className="text-right">Rounded (12px)</div>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="layout" className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Sidebar Position</Label>
                      <RadioGroup 
                        value={themeSettings.navbarPosition}
                        onValueChange={(value) => setThemeSettings({...themeSettings, navbarPosition: value})}
                        className="grid grid-cols-2 gap-4"
                      >
                        <div>
                          <RadioGroupItem 
                            value="left" 
                            id="sidebar-left" 
                            className="peer sr-only" 
                          />
                          <Label
                            htmlFor="sidebar-left"
                            className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                          >
                            <div className="flex h-20 w-full items-start">
                              <div className="w-1/4 h-full bg-slate-200 rounded"></div>
                              <div className="flex-1 h-full rounded ml-2">
                                <div className="h-4 w-full bg-slate-200 rounded mb-2"></div>
                                <div className="h-12 w-full bg-slate-200 rounded"></div>
                              </div>
                            </div>
                            <span className="text-sm mt-2">Left Sidebar</span>
                          </Label>
                        </div>
                        
                        <div>
                          <RadioGroupItem 
                            value="right" 
                            id="sidebar-right" 
                            className="peer sr-only" 
                          />
                          <Label
                            htmlFor="sidebar-right"
                            className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                          >
                            <div className="flex h-20 w-full items-start">
                              <div className="flex-1 h-full rounded mr-2">
                                <div className="h-4 w-full bg-slate-200 rounded mb-2"></div>
                                <div className="h-12 w-full bg-slate-200 rounded"></div>
                              </div>
                              <div className="w-1/4 h-full bg-slate-200 rounded"></div>
                            </div>
                            <span className="text-sm mt-2">Right Sidebar</span>
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="custom" className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="customCSS">Custom CSS</Label>
                      <Textarea
                        id="customCSS"
                        placeholder="/* Add your custom CSS here */\n.my-custom-class {\n  color: red;\n}"
                        className="min-h-[200px] font-mono text-sm"
                        value={themeSettings.customCSS}
                        onChange={(e) => setThemeSettings({...themeSettings, customCSS: e.target.value})}
                      />
                      <p className="text-sm text-muted-foreground">
                        Add custom CSS to override the default styles. These styles will be applied globally.
                      </p>
                    </div>
                    
                    <div className="p-4 border rounded-lg bg-yellow-50 space-y-2">
                      <p className="font-medium text-amber-800">Warning</p>
                      <p className="text-sm text-amber-800">
                        Custom CSS can break the application's styling. Use with caution and test thoroughly.
                      </p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
        
        {/* Preview Panel */}
        <div className="col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Preview</CardTitle>
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className={cn(
                      "px-3", 
                      previewMode === "light" && "bg-slate-100"
                    )}
                    onClick={() => setPreviewMode("light")}
                  >
                    Light
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className={cn(
                      "px-3", 
                      previewMode === "dark" && "bg-slate-900 text-white"
                    )}
                    onClick={() => setPreviewMode("dark")}
                  >
                    Dark
                  </Button>
                </div>
              </div>
              <CardDescription>
                See how your theme will look
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div 
                className="preview-container border rounded-lg overflow-hidden"
                style={previewStyles.container}
              >
                <div style={previewStyles.header}>
                  <h3 style={{ 
                    margin: "0 0 8px 0", 
                    fontSize: `${themeSettings.fontSize + 4}px`, 
                    fontWeight: "bold" 
                  }}>
                    {previewContent.title}
                  </h3>
                  <p style={{ margin: "0", fontSize: `${themeSettings.fontSize - 2}px` }}>
                    {previewContent.description}
                  </p>
                </div>
                
                <div style={{ padding: "16px" }}>
                  <div style={{ marginBottom: "16px", display: "flex", gap: "8px" }}>
                    <button style={previewStyles.button.primary}>
                      {previewContent.ctaText}
                    </button>
                    <button style={previewStyles.button.secondary}>
                      {previewContent.secondaryText}
                    </button>
                  </div>
                  
                  <div style={{ marginBottom: "16px" }}>
                    <div style={previewStyles.alert}>
                      <div style={{ 
                        display: "flex", 
                        alignItems: "flex-start", 
                        gap: "8px" 
                      }}>
                        <AlertTriangle size={18} />
                        <p style={{ margin: "0", fontSize: `${themeSettings.fontSize - 1}px` }}>
                          {previewContent.alertText}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <div style={previewStyles.success}>
                      <div style={{ 
                        display: "flex", 
                        alignItems: "flex-start", 
                        gap: "8px" 
                      }}>
                        <CheckCircle size={18} />
                        <p style={{ margin: "0", fontSize: `${themeSettings.fontSize - 1}px` }}>
                          {previewContent.successText}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center"
                onClick={() => setPreviewMode(previewMode === "light" ? "dark" : "light")}
              >
                <Eye className="mr-2 h-4 w-4" />
                Toggle {previewMode === "light" ? "Dark" : "Light"} Mode
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}