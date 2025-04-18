import { createContext, ReactNode, useContext, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CompanySettings } from "@shared/schema";

// Default company settings
const defaultCompanySettings: CompanySettings = {
  companyName: "HR & Payroll Management",
  companyTagline: "Manage your workforce efficiently",
  primaryColor: "#2C5282",
};

type CompanyContextType = {
  settings: CompanySettings;
  isLoading: boolean;
  error: Error | null;
  updateCompanySettings: (settings: CompanySettings) => Promise<void>;
};

export const CompanyContext = createContext<CompanyContextType | null>(null);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();

  // Query to fetch company settings
  const {
    data: settings,
    error,
    isLoading,
  } = useQuery<CompanySettings>({
    queryKey: ["/api/settings/company"],
    queryFn: getQueryFn(),
    staleTime: 1000 * 60 * 60, // 1 hour
    onError: () => {
      // If there's an error, we'll fall back to default settings
      // No need to show an error toast as this might be a first-time setup
    },
  });

  // Mutation to update company settings
  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: CompanySettings) => {
      const res = await apiRequest("POST", "/api/settings/company", newSettings);
      if (!res.ok) {
        throw new Error("Failed to update company settings");
      }
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Settings updated",
        description: "Company settings have been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/settings/company"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Function to update company settings
  const updateCompanySettings = async (newSettings: CompanySettings) => {
    await updateSettingsMutation.mutateAsync(newSettings);
  };

  // Get effective settings (from API or defaults)
  const effectiveSettings = settings || defaultCompanySettings;

  // Update document title with company name
  useEffect(() => {
    if (effectiveSettings.companyName) {
      document.title = effectiveSettings.companyName;
    }
  }, [effectiveSettings.companyName]);

  return (
    <CompanyContext.Provider
      value={{
        settings: effectiveSettings,
        isLoading,
        error,
        updateCompanySettings,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error("useCompany must be used within a CompanyProvider");
  }
  return context;
}