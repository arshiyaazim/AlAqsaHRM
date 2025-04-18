import React, { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Company settings interface
export interface CompanySettings {
  companyName: string;
  companyTagline: string;
  primaryColor: string;
  logoUrl?: string;
}

// Default company settings
const defaultSettings: CompanySettings = {
  companyName: "HR & Payroll Management",
  companyTagline: "Manage your workforce efficiently",
  primaryColor: "#2C5282"
};

// Create context
type CompanyContextType = {
  settings: CompanySettings;
  isLoading: boolean;
  updateSettings: (settings: Partial<CompanySettings>) => Promise<void>;
};

const CompanyContext = createContext<CompanyContextType | null>(null);

// Create provider
export function CompanyProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [settings, setSettings] = useState<CompanySettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch company settings
  const { data, isLoading: queryLoading } = useQuery({
    queryKey: ["company-settings"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/settings/company");
        if (!response.ok) {
          throw new Error("Failed to fetch company settings");
        }
        return await response.json();
      } catch (error) {
        console.error("Error fetching company settings:", error);
        return defaultSettings;
      }
    },
  });

  // Update settings when data is fetched
  useEffect(() => {
    if (data) {
      setSettings(data);
    }
    setIsLoading(queryLoading);
  }, [data, queryLoading]);

  // Update settings
  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: Partial<CompanySettings>) => {
      const response = await apiRequest("POST", "/api/settings/company", {
        ...settings,
        ...newSettings
      });
      if (!response.ok) {
        throw new Error("Failed to update company settings");
      }
      return await response.json();
    },
    onSuccess: (data) => {
      setSettings(data);
      toast({
        title: "Settings updated",
        description: "Company settings have been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["company-settings"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateSettings = async (newSettings: Partial<CompanySettings>) => {
    await updateSettingsMutation.mutateAsync(newSettings);
  };

  // Apply settings to document
  useEffect(() => {
    if (settings.companyName) {
      document.title = settings.companyName;
    }
  }, [settings.companyName]);

  return (
    <CompanyContext.Provider value={{ settings, isLoading, updateSettings }}>
      {children}
    </CompanyContext.Provider>
  );
}

// Create hook
export function useCompanySettings() {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error("useCompanySettings must be used within a CompanyProvider");
  }
  return context;
}