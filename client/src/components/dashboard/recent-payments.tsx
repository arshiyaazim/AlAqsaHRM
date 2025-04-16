import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Employee, Payment, Payroll } from "@shared/schema";

type PaymentWithDetails = {
  payment: Payment;
  payroll: Payroll;
  employee: Employee;
};

export default function RecentPayments() {
  const { data: payments, isLoading } = useQuery({
    queryKey: ["/api/payments"],
    select: (data: Payment[]) => {
      // In a real app, we'd fetch related data, but for now we'll just show what we have
      return data.slice(0, 4);
    },
  });

  const { data: payrolls, isLoading: isLoadingPayrolls } = useQuery({
    queryKey: ["/api/payroll"],
  });

  const { data: employees, isLoading: isLoadingEmployees } = useQuery({
    queryKey: ["/api/employees"],
  });

  // Combine data for display
  const paymentData: PaymentWithDetails[] = payments && payrolls && employees
    ? payments.map(payment => {
        const payroll = payrolls.find(p => p.id === payment.payrollId);
        const employee = payroll ? employees.find(e => e.id === payroll.employeeId) : undefined;
        return {
          payment,
          payroll: payroll!,
          employee: employee!
        };
      }).filter(item => item.payroll && item.employee)
    : [];

  return (
    <Card>
      <CardHeader className="px-4 py-5 border-b border-gray-200 sm:px-6 flex flex-row justify-between items-center">
        <CardTitle className="text-lg leading-6 font-medium text-[#2D3748]">
          Recent Payments
        </CardTitle>
        <button className="text-sm font-medium text-[#2C5282] hover:text-[#2C5282]/90">
          View All
        </button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          {/* Desktop Table */}
          <table className="min-w-full divide-y divide-gray-200 hidden md:table">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading || isLoadingPayrolls || isLoadingEmployees ? (
                // Loading state
                Array(4).fill(0).map((_, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="ml-4">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-3 w-16 mt-1" />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Skeleton className="h-4 w-16" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Skeleton className="h-5 w-20 rounded-full" />
                    </td>
                  </tr>
                ))
              ) : paymentData.length > 0 ? (
                paymentData.map((item, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={`https://ui-avatars.com/api/?name=${item.employee.firstName}+${item.employee.lastName}&background=random`} alt={`${item.employee.firstName} ${item.employee.lastName}`} />
                          <AvatarFallback>{`${item.employee.firstName[0]}${item.employee.lastName[0]}`}</AvatarFallback>
                        </Avatar>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-[#2D3748]">{`${item.employee.firstName} ${item.employee.lastName}`}</div>
                          <div className="text-sm text-gray-500">ID: {item.employee.employeeId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatDate(item.payment.date)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatCurrency(item.payment.amount)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        {item.payment.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">No recent payments found</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Mobile Card View */}
          <div className="block md:hidden divide-y divide-gray-200">
            {isLoading || isLoadingPayrolls || isLoadingEmployees ? (
              // Loading state
              Array(4).fill(0).map((_, index) => (
                <div key={index} className="py-4 px-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="ml-4">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-16 mt-1" />
                      </div>
                    </div>
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-xs text-gray-500">Date</div>
                      <Skeleton className="h-4 w-20 mt-1" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Amount</div>
                      <Skeleton className="h-4 w-16 mt-1" />
                    </div>
                  </div>
                </div>
              ))
            ) : paymentData.length > 0 ? (
              paymentData.map((item, index) => (
                <div key={index} className="py-4 px-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={`https://ui-avatars.com/api/?name=${item.employee.firstName}+${item.employee.lastName}&background=random`} alt={`${item.employee.firstName} ${item.employee.lastName}`} />
                        <AvatarFallback>{`${item.employee.firstName[0]}${item.employee.lastName[0]}`}</AvatarFallback>
                      </Avatar>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-[#2D3748]">{`${item.employee.firstName} ${item.employee.lastName}`}</div>
                        <div className="text-sm text-gray-500">ID: {item.employee.employeeId}</div>
                      </div>
                    </div>
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      {item.payment.status}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-xs text-gray-500">Date</div>
                      <div className="text-sm text-gray-900">{formatDate(item.payment.date)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Amount</div>
                      <div className="text-sm font-medium text-gray-900">{formatCurrency(item.payment.amount)}</div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-4 px-4 text-center text-sm text-gray-500">No recent payments found</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
