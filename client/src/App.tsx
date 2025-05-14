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

function Router() {
  const [location] = useLocation();
  const isAuthPage = location === "/auth";
  const isMobileAttendance = location === "/mobile-attendance";

  // Special routes that don't need authentication
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

  // All other routes
  return (
    <Switch>
      <Route path="/" component={() => <Redirect to="/dashboard" />} />
      <ProtectedRoute path="/dashboard" component={Dashboard} />
      <ProtectedRoute path="/employees" component={EmployeeList} />
      <ProtectedRoute path="/employees/add" component={AddEmployee} />
      <ProtectedRoute path="/employees/:id" component={EmployeeDetails} />
      <ProtectedRoute path="/employees/edit/:id" component={EditEmployee} />
      <ProtectedRoute path="/attendance" component={AttendanceList} />
      <ProtectedRoute path="/attendance/record" component={RecordAttendance} />
      <ProtectedRoute path="/location-test" component={LocationTestPage} />
      <ProtectedRoute path="/projects" component={ProjectsPage} />
      <ProtectedRoute path="/projects/add" component={AddProjectPage} />
      <ProtectedRoute path="/projects/edit/:id" component={EditProjectPage} />
      <ProtectedRoute path="/ship-duties" component={ShipDutyList} />
      <ProtectedRoute path="/ship-duties/add" component={AddShipDuty} />
      <ProtectedRoute path="/ship-duties/edit/:id" component={EditShipDuty} />
      <ProtectedRoute path="/bills" component={BillList} />
      <ProtectedRoute path="/bills/generate" component={GenerateBill} />
      <ProtectedRoute path="/expenditures" component={ExpenditureList} />
      <ProtectedRoute path="/expenditures/add" component={AddExpenditure} />
      <ProtectedRoute path="/expenditures/edit/:id" component={EditExpenditure} />
      <ProtectedRoute path="/incomes" component={IncomeList} />
      <ProtectedRoute path="/incomes/add" component={AddIncome} />
      <ProtectedRoute path="/incomes/edit/:id" component={EditIncome} />
      <ProtectedRoute path="/payroll" component={PayrollList} />
      <ProtectedRoute path="/payroll/process" component={ProcessPayroll} />
      <ProtectedRoute path="/reports" component={Reports} />
      <ProtectedRoute path="/reports/templates" component={Reports} />
      <ProtectedRoute path="/reports/templates/create" component={TemplateEditor} />
      <ProtectedRoute path="/reports/templates/edit/:id" component={TemplateEditor} />
      <ProtectedRoute path="/settings" component={Settings} />
      <ProtectedRoute path="/users" component={UsersPage} />
      {/* Admin routes */}
      <ProtectedRoute path="/admin/dashboard" component={AdminDashboard} roles={["admin"]} />
      <ProtectedRoute path="/admin/field-connections" component={FieldConnections} roles={["admin"]} />
      <ProtectedRoute path="/admin/theme-editor" component={ThemeEditor} roles={["admin"]} />
      <ProtectedRoute path="/admin/export-data" component={ExportData} roles={["admin"]} />
      <Route component={NotFound} />
    </Switch>
  );
}

function MainLayout({ children }: { children: React.ReactNode }) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [location] = useLocation();
  
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

  // Special handling for root path
  if (location === "/") {
    return <Redirect to="/auth" />;
  }

  return (
    <CompanyProvider>
      <>
        {isAuthPage || isMobileAttendance ? (
          <main className="min-h-screen">
            <Router />
          </main>
        ) : (
          <MainLayout>
            <Router />
          </MainLayout>
        )}
        <Toaster />
      </>
    </CompanyProvider>
  );
}

export default App;
