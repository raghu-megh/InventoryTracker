import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: "success" | "error" | "pending" | "warning";
  children?: React.ReactNode;
}

export default function StatusBadge({ status, children }: StatusBadgeProps) {
  const getStatusStyles = () => {
    switch (status) {
      case "success":
        return "bg-success-50 text-success-600 border-success-200";
      case "error":
        return "bg-danger-50 text-danger-600 border-danger-200";
      case "pending":
        return "bg-warning-50 text-warning-600 border-warning-200";
      case "warning":
        return "bg-warning-50 text-warning-600 border-warning-200";
      default:
        return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  const getStatusText = () => {
    if (children) return children;
    
    switch (status) {
      case "success":
        return "Success";
      case "error":
        return "Error";
      case "pending":
        return "Pending";
      case "warning":
        return "Warning";
      default:
        return "Unknown";
    }
  };

  return (
    <Badge
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
        getStatusStyles()
      )}
    >
      {getStatusText()}
    </Badge>
  );
}
