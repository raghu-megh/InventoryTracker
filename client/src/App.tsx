import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import CloverInstall from "@/pages/clover-install";
import Settings from "@/pages/settings";
import Home from "@/pages/home";
import Dashboard from "@/pages/dashboard";
import Inventory from "@/pages/inventory";
import RawMaterials from "@/pages/raw-materials";
import Recipes from "@/pages/recipes";
import Users from "@/pages/users";
import WebhookSettings from "@/pages/webhook-settings";
import MenuItems from "@/pages/menu-items";
import Purchasing from "@/pages/purchasing";
import EULA from "@/pages/eula";
import PrivacyPolicy from "@/pages/privacy-policy";
import { useAuth } from "@/hooks/useAuth";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-lg text-gray-600 dark:text-gray-300">Loading MyInventory...</div>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      {/* Public routes available to all users */}
      <Route path="/clover-install" component={CloverInstall} />
      <Route path="/eula" component={EULA} />
      <Route path="/privacy-policy" component={PrivacyPolicy} />
      
      {!isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={Home} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/inventory" component={Inventory} />
          <Route path="/raw-materials" component={RawMaterials} />
          <Route path="/recipes" component={Recipes} />
          <Route path="/users" component={Users} />
          <Route path="/settings" component={Settings} />
          <Route path="/webhook-settings" component={WebhookSettings} />
          <Route path="/menu-items" component={MenuItems} />
          <Route path="/purchasing" component={Purchasing} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
