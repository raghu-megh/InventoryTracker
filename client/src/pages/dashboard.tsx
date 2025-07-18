import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import MetricsGrid from "@/components/dashboard/metrics-grid";
import WebhookActivity from "@/components/dashboard/webhook-activity";
import LowStockAlerts from "@/components/dashboard/low-stock-alerts";
import InventoryTable from "@/components/inventory/inventory-table";

export default function Dashboard() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>("");

  // Set default restaurant when user data loads
  useEffect(() => {
    if (user?.restaurants?.length && !selectedRestaurant) {
      // Sort restaurants by creation date (assuming first added has earliest date)
      // If no creation date, use the first one in the array
      const sortedRestaurants = [...user.restaurants].sort((a, b) => {
        if (a.createdAt && b.createdAt) {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }
        return 0;
      });
      setSelectedRestaurant(sortedRestaurants[0].id);
    }
  }, [user, selectedRestaurant]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  // Fetch dashboard metrics
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["/api/restaurants", selectedRestaurant, "metrics"],
    enabled: !!selectedRestaurant,
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to load dashboard metrics",
        variant: "destructive",
      });
    },
  });

  // Fetch webhook events
  const { data: webhookEvents } = useQuery({
    queryKey: ["/api/restaurants", selectedRestaurant, "webhook-events"],
    enabled: !!selectedRestaurant,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch low stock items
  const { data: lowStockItems } = useQuery({
    queryKey: ["/api/restaurants", selectedRestaurant, "inventory", "low-stock"],
    enabled: !!selectedRestaurant,
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch inventory for table
  const { data: inventory } = useQuery({
    queryKey: ["/api/restaurants", selectedRestaurant, "inventory"],
    enabled: !!selectedRestaurant,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar 
        user={user} 
        selectedRestaurant={selectedRestaurant}
        onRestaurantChange={setSelectedRestaurant}
      />
      
      <div className="flex-1 flex flex-col lg:ml-64">
        <Header 
          title="Inventory Dashboard"
          subtitle="Real-time inventory tracking with Clover POS integration"
          webhookStatus="active"
          lastSync="2 min ago"
          user={user}
          selectedRestaurant={selectedRestaurant}
          onRestaurantChange={setSelectedRestaurant}
        />
        
        <main className="flex-1 p-4 sm:p-6">
          <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
            <MetricsGrid 
              metrics={metrics}
              isLoading={metricsLoading}
            />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <WebhookActivity 
                events={webhookEvents || []}
              />
              <LowStockAlerts 
                items={lowStockItems || []}
              />
            </div>
            
            <InventoryTable 
              items={inventory || []}
              selectedRestaurant={selectedRestaurant}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
