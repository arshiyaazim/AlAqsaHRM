import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type DayData = {
  day: string;
  shortDay: string;
  percentage: number;
};

interface AttendanceChartProps {
  data: {
    present: number;
    absent: number;
    late: number;
    weeklyData: DayData[];
  };
}

export default function AttendanceChart({ data }: AttendanceChartProps) {
  const [selectedProject, setSelectedProject] = useState<string>("all");

  return (
    <Card>
      <CardHeader className="px-4 py-5 border-b border-gray-200 sm:px-6 flex flex-row justify-between items-center">
        <CardTitle className="text-lg leading-6 font-medium text-[#2D3748]">
          Today's Attendance Overview
        </CardTitle>
        <div className="flex space-x-3">
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="h-9 w-[140px]">
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              <SelectItem value="project-a">Project A</SelectItem>
              <SelectItem value="project-b">Project B</SelectItem>
              <SelectItem value="project-c">Project C</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:px-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-[#48BB78] mr-2"></div>
            <span className="text-sm text-gray-600">Present ({data.present}%)</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-[#E53E3E] mr-2"></div>
            <span className="text-sm text-gray-600">Absent ({data.absent}%)</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-[#ED8936] mr-2"></div>
            <span className="text-sm text-gray-600">Late ({data.late}%)</span>
          </div>
        </div>
        
        {/* Chart Visualization */}
        <div className="h-64 flex items-end space-x-2">
          {data.weeklyData.map((dayData, index) => (
            <div key={index} className="flex-1 flex flex-col items-center">
              <div 
                className="w-full bg-[#48BB78] rounded-t-md" 
                style={{ height: `${dayData.percentage}%` }}
              ></div>
              <span className="text-xs mt-1">{dayData.shortDay}</span>
            </div>
          ))}
        </div>
        
        <div className="mt-4">
          <button className="text-[#2C5282] text-sm font-medium hover:text-[#2C5282]/90">
            View Full Report →
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
