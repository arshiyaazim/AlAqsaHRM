import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "N/A";
  
  try {
    const dateObj = typeof date === "string" ? parseISO(date) : date;
    return format(dateObj, "MMM dd, yyyy");
  } catch (error) {
    console.error("Error formatting date:", error);
    return "Invalid Date";
  }
}

export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return "$0.00";
  
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numAmount);
}

export function calculateTotal(
  basicAmount: string | number,
  conveyanceAllowance?: string | number,
  advancePayment?: string | number,
  fines?: string | number
): number {
  const basic = typeof basicAmount === "string" ? parseFloat(basicAmount) : basicAmount;
  const conveyance = conveyanceAllowance ? (typeof conveyanceAllowance === "string" ? parseFloat(conveyanceAllowance) : conveyanceAllowance) : 0;
  const advance = advancePayment ? (typeof advancePayment === "string" ? parseFloat(advancePayment) : advancePayment) : 0;
  const deductions = fines ? (typeof fines === "string" ? parseFloat(fines) : fines) : 0;
  
  return basic + conveyance - advance - deductions;
}

export function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case "present":
      return "bg-green-100 text-green-800";
    case "absent":
      return "bg-red-100 text-red-800";
    case "late":
      return "bg-orange-100 text-orange-800";
    case "completed":
      return "bg-green-100 text-green-800";
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

export function generateEmployeeId(): string {
  const prefix = "EMP-";
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}${randomNum}`;
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}
