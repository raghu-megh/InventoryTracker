import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Package } from "lucide-react";

interface InventoryItem {
  id: string;
  name: string;
  currentStock: string;
  minLevel: string;
  unit: string;
}

interface LowStockAlertsProps {
  items: InventoryItem[];
}

export default function LowStockAlerts({ items }: LowStockAlertsProps) {
  const getStockLevel = (currentStock: string, minLevel: string) => {
    const current = parseFloat(currentStock);
    const min = parseFloat(minLevel);
    
    if (current <= min * 0.5) {
      return 'critical';
    }
    return 'low';
  };

  const getStockLevelColor = (level: string) => {
    return level === 'critical' 
      ? 'bg-danger-50 border-danger-200' 
      : 'bg-warning-50 border-warning-200';
  };

  const getStockLevelText = (level: string) => {
    return level === 'critical' ? 'Critical' : 'Low';
  };

  const getStockLevelTextColor = (level: string) => {
    return level === 'critical' ? 'text-danger' : 'text-warning';
  };

  return (
    <Card className="border border-slate-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-slate-800">
            Low Stock Alerts
          </CardTitle>
          <Button variant="outline" size="sm">
            Manage All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-center py-8">
            <Package className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No low stock items</p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.slice(0, 4).map((item) => {
              const stockLevel = getStockLevel(item.currentStock, item.minLevel);
              
              return (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${getStockLevelColor(stockLevel)}`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      stockLevel === 'critical' ? 'bg-danger-100' : 'bg-warning-100'
                    }`}>
                      <AlertTriangle className={`h-5 w-5 ${
                        stockLevel === 'critical' ? 'text-danger' : 'text-warning'
                      }`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{item.name}</p>
                      <p className="text-xs text-slate-600">
                        Only {item.currentStock} {item.unit} remaining
                      </p>
                    </div>
                  </div>
                  <span className={`font-semibold text-sm ${getStockLevelTextColor(stockLevel)}`}>
                    {getStockLevelText(stockLevel)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
