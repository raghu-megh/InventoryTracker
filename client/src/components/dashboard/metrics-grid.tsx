import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Boxes, AlertTriangle, DollarSign, Users } from "lucide-react";

interface MetricsGridProps {
  metrics?: {
    totalItems: number;
    lowStockItems: number;
    todaySales: number;
    activeUsers: number;
  };
  isLoading?: boolean;
}

export default function MetricsGrid({ metrics, isLoading }: MetricsGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="border border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-16" />
                </div>
                <Skeleton className="h-12 w-12 rounded-lg" />
              </div>
              <div className="mt-4">
                <Skeleton className="h-4 w-24" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const metricsData = [
    {
      title: "Total Items",
      value: metrics?.totalItems || 0,
      change: "+5.2%",
      changeText: "from last week",
      icon: Boxes,
      iconColor: "bg-primary text-primary-foreground",
      positive: true,
    },
    {
      title: "Low Stock Items",
      value: metrics?.lowStockItems || 0,
      change: "+2",
      changeText: "since yesterday",
      icon: AlertTriangle,
      iconColor: "bg-danger text-danger-foreground",
      positive: false,
    },
    {
      title: "Today's Sales",
      value: `$${(metrics?.todaySales || 0).toLocaleString()}`,
      change: "+12.3%",
      changeText: "vs yesterday",
      icon: DollarSign,
      iconColor: "bg-success text-success-foreground",
      positive: true,
    },
    {
      title: "Active Users",
      value: metrics?.activeUsers || 0,
      change: "2 online now",
      changeText: "",
      icon: Users,
      iconColor: "bg-warning text-warning-foreground",
      positive: null,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {metricsData.map((metric, index) => {
        const Icon = metric.icon;
        
        return (
          <Card key={index} className="border border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">{metric.title}</p>
                  <p className={`text-2xl font-bold mt-1 ${
                    metric.title === "Low Stock Items" ? "text-danger" : "text-slate-800"
                  }`}>
                    {metric.value}
                  </p>
                </div>
                <div className={`w-12 h-12 ${metric.iconColor} rounded-lg flex items-center justify-center`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <span className={`text-sm font-medium ${
                  metric.positive === true
                    ? "text-success"
                    : metric.positive === false
                    ? "text-danger"
                    : "text-slate-500"
                }`}>
                  {metric.change}
                </span>
                {metric.changeText && (
                  <span className="text-slate-500 text-sm ml-1">{metric.changeText}</span>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
