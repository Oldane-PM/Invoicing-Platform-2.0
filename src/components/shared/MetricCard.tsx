import { Card } from "../ui/card";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value?: number;
    isPositive?: boolean;
    displayValue?: string;
  };
  icon: LucideIcon;
  accentColor: "purple" | "yellow" | "green" | "blue" | "red";
  onClick?: () => void;
}

const accentStyles = {
  purple: "bg-purple-50 text-purple-600",
  yellow: "bg-yellow-50 text-yellow-600",
  green: "bg-green-50 text-green-600",
  blue: "bg-blue-50 text-blue-600",
  red: "bg-red-50 text-red-600",
};

const badgeAccentStyles = {
  purple: "bg-purple-100 text-purple-700",
  yellow: "bg-yellow-100 text-yellow-700",
  green: "bg-green-100 text-green-700",
  blue: "bg-blue-100 text-blue-700",
  red: "bg-red-100 text-red-700",
};

export function MetricCard({
  title,
  value,
  subtitle,
  trend,
  icon: Icon,
  accentColor,
  onClick,
}: MetricCardProps) {
  return (
    <Card
      className="p-5 md:p-6 cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 border border-[#EAEAEA] rounded-2xl bg-white relative"
      onClick={onClick}
    >
      <div className="flex gap-4">
        <div className="flex flex-col items-center gap-3">
          <div className={`w-12 h-12 rounded-[14px] flex items-center justify-center ${accentStyles[accentColor]}`}>
            <Icon className="w-6 h-6" strokeWidth={2} />
          </div>
          {trend && (
            <div className={`text-xs font-semibold px-2 py-0.5 rounded-md flex items-center gap-1 ${trend.displayValue === "0%" ? "bg-gray-100 text-gray-600" : badgeAccentStyles[accentColor]}`}>
              {trend.displayValue === "0%" ? "—" : trend.isPositive ? "↑" : "↓"} {trend.displayValue || `${Math.abs(trend.value || 0)}%`}
            </div>
          )}
        </div>
        
        <div className="flex flex-col justify-between py-0.5">
          <div className="text-[13px] font-medium text-gray-500">{title}</div>
          <div className="text-3xl font-bold text-gray-900 leading-none">{value}</div>
          {subtitle && <div className="text-sm text-gray-500">{subtitle}</div>}
        </div>
      </div>
    </Card>
  );
}
