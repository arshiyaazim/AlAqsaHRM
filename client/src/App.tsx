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
import Reports from "@/pages/reports/index";
import Settings from "@/pages/settings";
import AuthPage from "@/pages/auth-page";
import UsersPage from "@/pages/users";

function Router() {
  const [location] = useLocation();
  const isAuthPage = location === "/auth";

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

  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/employees" component={EmployeeList} />
      <Route path="/employees/add" component={AddEmployee} />
      <Route path="/employees/:id" component={EmployeeDetails} />
      <Route path="/employees/edit/:id" component={EditEmployee} />
      <Route path="/attendance" component={AttendanceList} />
      <Route path="/attendance/record" component={RecordAttendance} />
      <Route path="/expenditures" component={ExpenditureList} />
      <Route path="/expenditures/add" component={AddExpenditure} />
      <Route path="/expenditures/edit/:id" component={EditExpenditure} />
      <Route path="/incomes" component={IncomeList} />
      <Route path="/incomes/add" component={AddIncome} />
      <Route path="/incomes/edit/:id" component={EditIncome} />
      <Route path="/payroll" component={PayrollList} />
      <Route path="/payroll/process" component={ProcessPayroll} />
      <Route path="/reports" component={Reports} />
      <Route path="/settings" component={Settings} />
      <Route path="/users" component={UsersPage} />
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

  return (
    <>
      {isAuthPage ? (
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
  );
}

export default App;
