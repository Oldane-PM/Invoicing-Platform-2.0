import * as React from "react";
import { Card } from "../components/ui/card";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  icon: LucideIcon;
  accentColor: "purple" | "yellow" | "green" | "blue" | "red";
  onClick?: () => void;
}

const accentStyles = {
  purple: "bg-purple-100 text-purple-600",
  yellow: "bg-yellow-100 text-yellow-600",
  green: "bg-green-100 text-green-600",
  blue: "bg-blue-100 text-blue-600",
  red: "bg-red-100 text-red-600",
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
      className="p-6 cursor-pointer transition-all hover:shadow-lg hover:-translate-y-0.5 border border-gray-200 rounded-[14px] bg-white relative"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="text-sm text-gray-600">{title}</div>
        <div className={`w-9 h-9 rounded-full flex items-center justify-center ${accentStyles[accentColor]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="space-y-1">
        <div className="text-3xl font-semibold text-gray-900">{value}</div>
        {subtitle && <div className="text-sm text-gray-500">{subtitle}</div>}
        {trend && (
          <div className={`text-sm font-medium ${trend.isPositive ? "text-green-600" : "text-red-600"}`}>
            {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}% vs last month
          </div>
        )}
      </div>
    </Card>
  );
}