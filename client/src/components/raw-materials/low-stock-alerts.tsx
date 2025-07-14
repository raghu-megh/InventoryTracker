import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Package, ShoppingCart } from "lucide-react";

interface LowStockRawMaterialsAlertProps {
  materials: any[];
  isLoading: boolean;
}

export function LowStockRawMaterialsAlert({ materials, isLoading }: LowStockRawMaterialsAlertProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Low Stock Alerts
          </CardTitle>
          <CardDescription>Loading low stock materials...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (materials.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-green-500" />
            Low Stock Alerts
          </CardTitle>
          <CardDescription>All materials are well stocked</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8">
          <Package className="h-12 w-12 text-green-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No low stock items
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            All your raw materials are above minimum levels
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          Low Stock Alerts
        </CardTitle>
        <CardDescription>
          {materials.length} raw material{materials.length !== 1 ? 's' : ''} need reordering
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {materials.map((material) => {
            const currentStock = Number(material.currentStock);
            const minLevel = Number(material.minLevel);
            const stockPercentage = minLevel > 0 ? (currentStock / minLevel) * 100 : 0;
            
            return (
              <div
                key={material.id}
                className="flex items-center justify-between p-4 border rounded-lg bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
              >
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-full">
                    <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {material.name}
                      </h4>
                      {material.category?.name && (
                        <Badge variant="outline" className="text-xs">
                          {material.category.name}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <span>
                        Current: <strong>{currentStock.toFixed(3)} {material.baseUnit}</strong>
                      </span>
                      <span>
                        Min: <strong>{minLevel.toFixed(3)} {material.baseUnit}</strong>
                      </span>
                      <Badge 
                        variant="destructive" 
                        className="text-xs"
                      >
                        {stockPercentage.toFixed(0)}% of min level
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button size="sm" variant="outline" className="text-xs">
                    <ShoppingCart className="h-3 w-3 mr-1" />
                    Reorder
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}