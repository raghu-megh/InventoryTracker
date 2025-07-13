import { Badge } from "@/components/ui/badge";

interface HeaderProps {
  title: string;
  subtitle: string;
  webhookStatus?: "active" | "inactive" | "error";
  lastSync?: string;
}

export default function Header({ 
  title, 
  subtitle, 
  webhookStatus = "active", 
  lastSync = "Just now" 
}: HeaderProps) {
  const getStatusColor = () => {
    switch (webhookStatus) {
      case "active":
        return "bg-success-50 text-success-600";
      case "error":
        return "bg-danger-50 text-danger-600";
      default:
        return "bg-slate-100 text-slate-600";
    }
  };

  const getStatusText = () => {
    switch (webhookStatus) {
      case "active":
        return "Webhook Active";
      case "error":
        return "Webhook Error";
      default:
        return "Webhook Inactive";
    }
  };

  return (
    <header className="bg-white shadow-sm border-b border-slate-200">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-800">{title}</h1>
            <p className="text-sm text-slate-600 mt-1">{subtitle}</p>
          </div>
          
          {webhookStatus && (
            <div className="flex items-center space-x-3">
              {/* Webhook Status Indicator */}
              <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${getStatusColor()}`}>
                <div className={`w-2 h-2 rounded-full ${
                  webhookStatus === "active" ? "bg-success-500 animate-pulse" : 
                  webhookStatus === "error" ? "bg-danger-500" : "bg-slate-400"
                }`}></div>
                <span className="text-sm font-medium">{getStatusText()}</span>
              </div>
              
              {/* Last Sync */}
              <div className="text-right">
                <p className="text-xs text-slate-500">Last sync</p>
                <p className="text-sm font-medium text-slate-700">{lastSync}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
