import { useState, useEffect } from "react";
import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
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
import LoginPage from "@/pages/login";
import useAuth from "@/hooks/useAuth";

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
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
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [location] = useLocation();
  
  // Close mobile sidebar when location changes
  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [location]);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex h-screen overflow-hidden bg-[#F7FAFC]">
        {location !== "/login" && <Sidebar />}
        {location !== "/login" && (
          <MobileSidebar 
            isOpen={isMobileSidebarOpen} 
            onClose={() => setIsMobileSidebarOpen(false)} 
          />
        )}
        
        <div className="flex-1 flex flex-col overflow-hidden">
          {location !== "/login" && <Header onMenuClick={() => setIsMobileSidebarOpen(true)} />}
          <main className={`flex-1 overflow-y-auto ${location !== "/login" ? "bg-[#F7FAFC] p-4 sm:p-6 lg:p-8" : ""}`}>
            <Router />
          </main>
        </div>
      </div>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
