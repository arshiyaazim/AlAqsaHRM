import ReportGenerator from "@/components/reports/report-generator";

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#2D3748]">Reports</h1>
        <p className="mt-1 text-sm text-gray-500">Generate and download various reports</p>
      </div>
      
      <ReportGenerator />
    </div>
  );
}
