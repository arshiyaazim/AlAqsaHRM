import { useState, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
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
import { CompanyProvider } from "@/hooks/useCompanySettings";
import { AuthProvider } from "@/hooks/useAuth";
import { RouteGuard } from "@/lib/protected-route";

function Router() {
  const [location] = useLocation();
  const isAuthPage = location === "/auth";
  const isMobileAttendance = location === "/mobile-attendance";

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

  return (
    <Switch>
      {/* Common routes for all authenticated users */}
      <Route path="/">
        <RouteGuard requiredRoles={["admin", "hr", "viewer"]}>
          <Dashboard />
        </RouteGuard>
      </Route>
      
      {/* Employee routes - accessible by all users */}
      <Route path="/employees">
        <RouteGuard requiredRoles={["admin", "hr", "viewer"]}>
          <EmployeeList />
        </RouteGuard>
      </Route>
      <Route path="/employees/add">
        <RouteGuard requiredRoles={["admin", "hr"]}>
          <AddEmployee />
        </RouteGuard>
      </Route>
      <Route path="/employees/:id">
        <RouteGuard requiredRoles={["admin", "hr", "viewer"]}>
          <EmployeeDetails />
        </RouteGuard>
      </Route>
      <Route path="/employees/edit/:id">
        <RouteGuard requiredRoles={["admin", "hr"]}>
          <EditEmployee />
        </RouteGuard>
      </Route>
      
      {/* Attendance routes */}
      <Route path="/attendance">
        <RouteGuard requiredRoles={["admin", "hr", "viewer"]}>
          <AttendanceList />
        </RouteGuard>
      </Route>
      <Route path="/attendance/record">
        <RouteGuard requiredRoles={["admin", "hr"]}>
          <RecordAttendance />
        </RouteGuard>
      </Route>
      
      {/* Projects routes */}
      <Route path="/projects">
        <RouteGuard requiredRoles={["admin", "hr", "viewer"]}>
          <ProjectsPage />
        </RouteGuard>
      </Route>
      <Route path="/projects/add">
        <RouteGuard requiredRoles={["admin", "hr"]}>
          <AddProjectPage />
        </RouteGuard>
      </Route>
      <Route path="/projects/edit/:id">
        <RouteGuard requiredRoles={["admin", "hr"]}>
          <EditProjectPage />
        </RouteGuard>
      </Route>
      
      {/* Expenditures routes */}
      <Route path="/expenditures">
        <RouteGuard requiredRoles={["admin", "hr", "viewer"]}>
          <ExpenditureList />
        </RouteGuard>
      </Route>
      <Route path="/expenditures/add">
        <RouteGuard requiredRoles={["admin", "hr"]}>
          <AddExpenditure />
        </RouteGuard>
      </Route>
      <Route path="/expenditures/edit/:id">
        <RouteGuard requiredRoles={["admin", "hr"]}>
          <EditExpenditure />
        </RouteGuard>
      </Route>
      
      {/* Incomes routes */}
      <Route path="/incomes">
        <RouteGuard requiredRoles={["admin", "hr", "viewer"]}>
          <IncomeList />
        </RouteGuard>
      </Route>
      <Route path="/incomes/add">
        <RouteGuard requiredRoles={["admin", "hr"]}>
          <AddIncome />
        </RouteGuard>
      </Route>
      <Route path="/incomes/edit/:id">
        <RouteGuard requiredRoles={["admin", "hr"]}>
          <EditIncome />
        </RouteGuard>
      </Route>
      
      {/* Payroll routes */}
      <Route path="/payroll">
        <RouteGuard requiredRoles={["admin", "hr", "viewer"]}>
          <PayrollList />
        </RouteGuard>
      </Route>
      <Route path="/payroll/process">
        <RouteGuard requiredRoles={["admin", "hr"]}>
          <ProcessPayroll />
        </RouteGuard>
      </Route>
      
      {/* Reports routes - all users can view reports */}
      <Route path="/reports">
        <RouteGuard requiredRoles={["admin", "hr", "viewer"]}>
          <Reports />
        </RouteGuard>
      </Route>
      <Route path="/reports/templates">
        <RouteGuard requiredRoles={["admin", "hr", "viewer"]}>
          <Reports />
        </RouteGuard>
      </Route>
      <Route path="/reports/templates/create">
        <RouteGuard requiredRoles={["admin", "hr"]}>
          <TemplateEditor />
        </RouteGuard>
      </Route>
      <Route path="/reports/templates/edit/:id">
        <RouteGuard requiredRoles={["admin", "hr"]}>
          <TemplateEditor />
        </RouteGuard>
      </Route>
      
      {/* Admin-only routes */}
      <Route path="/settings">
        <RouteGuard requiredRoles={["admin"]}>
          <Settings />
        </RouteGuard>
      </Route>
      <Route path="/users">
        <RouteGuard requiredRoles={["admin"]}>
          <UsersPage />
        </RouteGuard>
      </Route>
      
      {/* Fallback for not found routes */}
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

  return (
    <CompanyProvider>
      <AuthProvider>
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
      </AuthProvider>
    </CompanyProvider>
  );
}

export default App;
