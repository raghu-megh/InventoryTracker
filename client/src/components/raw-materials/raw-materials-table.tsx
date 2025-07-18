import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Edit, Package, Scale } from "lucide-react";
import { getImperialDisplayUnit, metricToImperial } from "@/lib/unitConversion";

interface RawMaterialsTableProps {
  materials: any[];
  isLoading: boolean;
  restaurantId: string;
}

export function RawMaterialsTable({ materials, isLoading, restaurantId }: RawMaterialsTableProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Raw Materials</CardTitle>
          <CardDescription>Loading materials...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded animate-pulse" />
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
          <CardTitle>Raw Materials</CardTitle>
          <CardDescription>No raw materials found</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No raw materials yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Add your first raw material to start tracking ingredients
          </p>
        </CardContent>
      </Card>
    );
  }

  const getStockStatus = (material: any) => {
    const current = Number(material.currentStock);
    const min = Number(material.minLevel);
    
    if (current <= min) {
      return { status: 'low', color: 'destructive' as const, icon: AlertTriangle };
    } else if (current <= min * 1.5) {
      return { status: 'warning', color: 'secondary' as const, icon: AlertTriangle };
    }
    return { status: 'good', color: 'default' as const, icon: Package };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scale className="h-5 w-5" />
          Raw Materials
        </CardTitle>
        <CardDescription>
          All quantities displayed in imperial units for easy use
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Current Stock</TableHead>
                <TableHead>Min Level</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Cost/Unit</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {materials.map((material) => {
                const stockStatus = getStockStatus(material);
                const StatusIcon = stockStatus.icon;
                
                return (
                  <TableRow key={material.id}>
                    <TableCell className="font-medium">
                      <div>
                        <div className="font-semibold">{material.name}</div>
                        {material.sku && (
                          <div className="text-sm text-muted-foreground">SKU: {material.sku}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {material.category?.name ? (
                        <Badge variant="outline">{material.category.name}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-right font-medium">
                        {metricToImperial(Number(material.currentStock), material.baseUnit).toFixed(2)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-right">
                        {metricToImperial(Number(material.minLevel), material.baseUnit).toFixed(2)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono text-xs">
                        {getImperialDisplayUnit(material.baseUnit)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-right">
                        {material.costPerUnit ? `$${Number(material.costPerUnit).toFixed(2)}` : '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={stockStatus.color} className="flex items-center gap-1 w-fit">
                        <StatusIcon className="h-3 w-3" />
                        {stockStatus.status === 'low' ? 'Low Stock' : 
                         stockStatus.status === 'warning' ? 'Warning' : 'Good'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}