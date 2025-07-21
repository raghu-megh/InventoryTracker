import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link, useLocation } from "wouter";
import { 
  Menu,
  Boxes, 
  BarChart3, 
  Package, 
  Receipt, 
  AlertTriangle, 
  Users, 
  Settings,
  LogOut,
  Scale,
  ChefHat,
  CreditCard
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileNavProps {
  user: any;
  selectedRestaurant: string;
  onRestaurantChange: (restaurantId: string) => void;
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: BarChart3 },
  { name: 'Menu Items', href: '/menu-items', icon: Menu },
  { name: 'Recipes', href: '/recipes', icon: ChefHat },
  { name: 'Raw Materials', href: '/raw-materials', icon: Scale },
  { name: 'Purchasing', href: '/purchasing', icon: CreditCard },
  { name: 'Inventory', href: '/inventory', icon: Package },
  { name: 'User Management', href: '/users', icon: Users },
  { name: 'Webhook Settings', href: '/webhook-settings', icon: Settings },
];

export default function MobileNav({ user, selectedRestaurant, onRestaurantChange }: MobileNavProps) {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    window.location.href = '/api/logout';
  };

  return (
    <div className="lg:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden">
            <Menu className="h-6 w-6" />
            <span className="sr-only">Toggle navigation</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <div className="flex flex-col h-full bg-white">
            <SheetHeader className="flex items-center px-6 py-4 border-b border-slate-200">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <Boxes className="text-white text-sm" />
                </div>
                <SheetTitle className="text-lg font-semibold text-slate-800">MyInventory</SheetTitle>
              </div>
            </SheetHeader>

            <div className="flex-1 flex flex-col">
              {/* Restaurant Selection */}
              {user?.restaurants && user.restaurants.length > 0 && (
                <div className="px-6 py-4 border-b border-slate-200">
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 block">
                    Restaurant
                  </label>
                  <Select value={selectedRestaurant} onValueChange={onRestaurantChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select restaurant" />
                    </SelectTrigger>
                    <SelectContent>
                      {user.restaurants.map((restaurant: any) => (
                        <SelectItem key={restaurant.id} value={restaurant.id}>
                          {restaurant.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Navigation Menu */}
              <nav className="flex-1 px-4 py-6 space-y-1">
                {navigation.map((item) => {
                  const isActive = location === item.href;
                  const Icon = item.icon;
                  
                  return (
                    <Link key={item.name} href={item.href}>
                      <a
                        onClick={() => setOpen(false)}
                        className={cn(
                          "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                          isActive
                            ? "bg-primary text-white"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        )}
                      >
                        <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
                        {item.name}
                      </a>
                    </Link>
                  );
                })}
              </nav>

              {/* User Section */}
              <div className="px-6 py-4 border-t border-slate-200">
                <div className="flex items-center mb-3">
                  <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center mr-3">
                    <span className="text-xs font-medium text-slate-600">
                      {user?.firstName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user?.email}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {user?.email}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  size="sm"
                  className="w-full text-slate-600 border-slate-300 hover:bg-slate-50"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}