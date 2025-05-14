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
import { ProtectedRoute } from "@/lib/protected-route";
import useAuth from "@/hooks/useAuth";
// Admin pages
import AdminDashboard from "@/pages/admin/dashboard";
import FieldConnections from "@/pages/admin/field-connections";
import ThemeEditor from "@/pages/admin/theme-editor";
import ExportData from "@/pages/admin/export-data";

function AppRoutes() {
  const [location] = useLocation();
  const { isAuthenticated } = useAuth();
  const isAuthPage = location === "/auth";
  const isMobileAttendance = location === "/mobile-attendance";

  // Root path redirect
  if (location === "/" && !isAuthenticated) {
    return <Redirect to="/auth" />;
  }

  if (location === "/" && isAuthenticated) {
    return <Redirect to="/dashboard" />;
  }

  // Public routes (no authentication required)
  if (isAuthPage) {
    return (
      <Switch>
        <Route path="/auth" component={AuthPage} />
        <Route path="*">
          <div>Page not found</div>
        </Route>
      </Switch>
    );
  }

  // Mobile attendance route
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
        <Switch>
          <Route path="/mobile-attendance" component={MobileAttendance} />
          <Route path="*">
            <div>Page not found</div>
          </Route>
        </Switch>
      </>
    );
  }

  // Protected routes (authentication required)
  return (
    <Switch>
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/employees" exact component={EmployeeList} />
      <Route path="/employees/add" component={AddEmployee} />
      <Route path="/employees/:id" component={EmployeeDetails} />
      <Route path="/employees/edit/:id" component={EditEmployee} />
      <Route path="/attendance" exact component={AttendanceList} />
      <Route path="/attendance/record" component={RecordAttendance} />
      <Route path="/location-test" component={LocationTestPage} />
      <Route path="/projects" exact component={ProjectsPage} />
      <Route path="/projects/add" component={AddProjectPage} />
      <Route path="/projects/edit/:id" component={EditProjectPage} />
      <Route path="/ship-duties" exact component={ShipDutyList} />
      <Route path="/ship-duties/add" component={AddShipDuty} />
      <Route path="/ship-duties/edit/:id" component={EditShipDuty} />
      <Route path="/bills" exact component={BillList} />
      <Route path="/bills/generate" component={GenerateBill} />
      <Route path="/expenditures" exact component={ExpenditureList} />
      <Route path="/expenditures/add" component={AddExpenditure} />
      <Route path="/expenditures/edit/:id" component={EditExpenditure} />
      <Route path="/incomes" exact component={IncomeList} />
      <Route path="/incomes/add" component={AddIncome} />
      <Route path="/incomes/edit/:id" component={EditIncome} />
      <Route path="/payroll" exact component={PayrollList} />
      <Route path="/payroll/process" component={ProcessPayroll} />
      <Route path="/reports" exact component={Reports} />
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
  );
}

function MainLayout({ children }: { children: React.ReactNode }) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [location] = useLocation();
  const { isAuthenticated } = useAuth();
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated && location !== "/auth" && location !== "/mobile-attendance") {
      // Use window.location to do a hard redirect to /auth if not authenticated
      window.location.href = "/auth";
    }
  }, [isAuthenticated, location]);
  
  // Close mobile sidebar when location changes
  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [location]);

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
          {children}
        </main>
      </div>
    </div>
  );
}

function App() {
  const [location] = useLocation();
  const isAuthPage = location === "/auth";
  const isMobileAttendance = location === "/mobile-attendance";

  return (
    <CompanyProvider>
      <>
        {isAuthPage || isMobileAttendance ? (
          <main className="min-h-screen">
            <AppRoutes />
          </main>
        ) : (
          <MainLayout>
            <AppRoutes />
          </MainLayout>
        )}
        <Toaster />
      </>
    </CompanyProvider>
  );
}

export default App;
