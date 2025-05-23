import { useState, useEffect } from "react";
import { Switch, Route, useLocation, Redirect } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import MobileSidebar from "@/components/layout/mobile-sidebar";
import Dashboard from "@/pages/dashboard";
import EmployeeList from "@/pages/employees/index";
import AddEmployee from "@/pages/employees/add";
import EmployeeDetails from "@/pages/employees/[id]";
import EditEmployee from "@/pages/employees/edit/[id]";
import AttendanceList from "@/pages/attendance/index";
import RecordAttendance from "@/pages/attendance/record";
import ExpenditureList from "@/pages/expenditures/index";
import AddExpenditure from "@/pages/expenditures/add";
import EditExpenditure from "@/pages/expenditures/edit/[id]";
import IncomeList from "@/pages/incomes/index";
import AddIncome from "@/pages/incomes/add";
import EditIncome from "@/pages/incomes/edit/[id]";
import PayrollList from "@/pages/payroll/index";
import ProcessPayroll from "@/pages/payroll/process";
import ProjectsPage from "@/pages/projects/index";
import AddProjectPage from "@/pages/projects/add";
import EditProjectPage from "@/pages/projects/edit/[id]";
import Reports from "@/pages/reports/index";
import TemplateEditor from "@/pages/reports/template-editor";
import Settings from "@/pages/settings";
import AuthPage from "@/pages/auth-page";
import UsersPage from "@/pages/users";
import MobileAttendance from "@/pages/mobile-attendance";
import LocationTestPage from "@/pages/location-test";
import ShipDutyList from "@/pages/ship-duties/index";
import AddShipDuty from "@/pages/ship-duties/add";
import EditShipDuty from "@/pages/ship-duties/edit/[id]";
import BillList from "@/pages/bills/index";
import GenerateBill from "@/pages/bills/generate";
import { CompanyProvider } from "@/hooks/useCompanySettings";
import { AuthProvider } from "@/hooks/useAuth";
// Admin pages
import AdminDashboard from "@/pages/admin/dashboard";
import FieldConnections from "@/pages/admin/field-connections";
import ThemeEditor from "@/pages/admin/theme-editor";
import ExportData from "@/pages/admin/export-data";

// Simplified App component with direct routes
function App() {
  const [location] = useLocation();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  
  // Close mobile sidebar when location changes - this must be defined before conditionals
  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [location]);
  
  // App wrapped in providers
  return (
    <AuthProvider>
      <CompanyProvider>
        <AppContent 
          location={location} 
          isMobileSidebarOpen={isMobileSidebarOpen}
          setIsMobileSidebarOpen={setIsMobileSidebarOpen}
        />
        <Toaster />
      </CompanyProvider>
    </AuthProvider>
  );
}

// Content component to handle routing and layout
function AppContent({
  location,
  isMobileSidebarOpen,
  setIsMobileSidebarOpen
}: {
  location: string;
  isMobileSidebarOpen: boolean;
  setIsMobileSidebarOpen: (isOpen: boolean) => void;
}) {
  // Handle special routing for root path
  if (location === "/") {
    // Check if user is logged in
    const token = localStorage.getItem("token");
    if (!token) {
      return <Redirect to="/auth" />;
    } else {
      // User is authenticated, redirect to dashboard
      return <Redirect to="/dashboard" />;
    }
  }
  
  // Handle special routing for dashboard path to ensure all roles access it
  if (location === "/dashboard") {
    const token = localStorage.getItem("token");
    if (!token) {
      return <Redirect to="/auth" />;
    }
  }
  
  // Special routes without main layout
  const isAuthPage = location === "/auth";
  const isMobileAttendance = location === "/mobile-attendance";
  
  // Public Routes (no authentication or main layout)
  if (isAuthPage) {
    return <AuthPage />;
  }
  
  if (isMobileAttendance) {
    return (
      <>
        <style>{`
          /* Hide any non-application elements when in mobile attendance mode */
          #runtime-error-popup, .replit-ui-theme-root {
            display: none !important;
          }
          body {
            overflow: auto !important;
          }
        `}</style>
        <MobileAttendance />
      </>
    );
  }
  
  // Check authentication for protected routes
  const token = localStorage.getItem("token");
  if (!token && !isAuthPage) {
    // Redirect to auth page if no token
    window.location.href = "/auth";
    return null;
  }
  
  // Main App layout with sidebar
  return (
    <div className="flex h-screen overflow-hidden bg-[#F7FAFC]">
      <Sidebar />
      <MobileSidebar 
        isOpen={isMobileSidebarOpen} 
        onClose={() => setIsMobileSidebarOpen(false)} 
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMenuClick={() => setIsMobileSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto bg-[#F7FAFC] p-4 sm:p-6 lg:p-8">
          <Switch>
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/employees" component={EmployeeList} />
            <Route path="/employees/add" component={AddEmployee} />
            <Route path="/employees/:id" component={EmployeeDetails} />
            <Route path="/employees/edit/:id" component={EditEmployee} />
            <Route path="/attendance" component={AttendanceList} />
            <Route path="/attendance/record" component={RecordAttendance} />
            <Route path="/location-test" component={LocationTestPage} />
            <Route path="/projects" component={ProjectsPage} />
            <Route path="/projects/add" component={AddProjectPage} />
            <Route path="/projects/edit/:id" component={EditProjectPage} />
            <Route path="/ship-duties" component={ShipDutyList} />
            <Route path="/ship-duties/add" component={AddShipDuty} />
            <Route path="/ship-duties/edit/:id" component={EditShipDuty} />
            <Route path="/bills" component={BillList} />
            <Route path="/bills/generate" component={GenerateBill} />
            <Route path="/expenditures" component={ExpenditureList} />
            <Route path="/expenditures/add" component={AddExpenditure} />
            <Route path="/expenditures/edit/:id" component={EditExpenditure} />
            <Route path="/incomes" component={IncomeList} />
            <Route path="/incomes/add" component={AddIncome} />
            <Route path="/incomes/edit/:id" component={EditIncome} />
            <Route path="/payroll" component={PayrollList} />
            <Route path="/payroll/process" component={ProcessPayroll} />
            <Route path="/reports" component={Reports} />
            <Route path="/reports/templates" component={Reports} />
            <Route path="/reports/templates/create" component={TemplateEditor} />
            <Route path="/reports/templates/edit/:id" component={TemplateEditor} />
            <Route path="/settings" component={Settings} />
            <Route path="/users" component={UsersPage} />
            {/* Admin routes */}
            <Route path="/admin/dashboard" component={AdminDashboard} />
            <Route path="/admin/field-connections" component={FieldConnections} />
            <Route path="/admin/theme-editor" component={ThemeEditor} />
            <Route path="/admin/export-data" component={ExportData} />
            <Route component={NotFound} />
          </Switch>
        </main>
      </div>
    </div>
  );
}

export default App;
