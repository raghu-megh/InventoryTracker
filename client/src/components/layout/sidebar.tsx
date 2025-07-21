import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link, useLocation } from "wouter";
import { 
  BarChart3, 
  Package, 
  Receipt, 
  AlertTriangle, 
  Users, 
  Settings,
  LogOut,
  Scale,
  ChefHat,
  Menu,
  CreditCard
} from "lucide-react";
import { AppIcon } from "@/components/ui/app-icon";
import { cn } from "@/lib/utils";

interface SidebarProps {
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
];

export default function Sidebar({ user, selectedRestaurant, onRestaurantChange }: SidebarProps) {
  const [location] = useLocation();

  const handleLogout = () => {
    window.location.href = '/api/logout';
  };

  return (
    <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:w-64 lg:flex lg:flex-col bg-white shadow-lg border-r border-slate-200">
      {/* Logo & Brand */}
      <div className="flex items-center px-6 py-4 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <AppIcon size={32} className="shrink-0" />
          <span className="text-lg font-semibold text-slate-800">MyInventory</span>
        </div>
      </div>

      {/* Restaurant Selector */}
      <div className="px-4 py-4 border-b border-slate-200">
        <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
          Restaurant
        </label>
        <Select value={selectedRestaurant} onValueChange={onRestaurantChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select restaurant" />
          </SelectTrigger>
          <SelectContent>
            {user?.restaurants?.map((restaurant: any) => (
              <SelectItem key={restaurant.id} value={restaurant.id}>
                {restaurant.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Navigation Menu */}
      <nav className="px-4 py-4 space-y-1">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href;
          
          return (
            <Link key={item.name} href={item.href}>
              <div
                className={cn(
                  "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer",
                  isActive
                    ? "text-primary bg-primary/10"
                    : "text-slate-700 hover:bg-slate-100"
                )}
              >
                <Icon className="w-5 h-5 mr-3" />
                {item.name}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Advanced Settings Link */}
      <div className="px-4 py-2 border-t border-slate-200">
        <Link href="/settings">
          <div
            className={cn(
              "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer",
              location === "/settings"
                ? "text-primary bg-primary/10"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            )}
          >
            <Settings className="w-4 h-4 mr-3" />
            Advanced Settings
          </div>
        </Link>
      </div>

      {/* User Profile */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-slate-300 rounded-full flex items-center justify-center">
            {user?.profileImageUrl ? (
              <img
                src={user.profileImageUrl}
                alt={`${user.firstName || ''} ${user.lastName || ''}`.trim()}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <Users className="text-slate-600 text-xs" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-700 truncate">
              {`${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'User'}
            </p>
            <p className="text-xs text-slate-500 truncate">
              {user?.restaurants?.find((r: any) => r.id === selectedRestaurant)?.role || 'User'}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-slate-400 hover:text-slate-600"
          >
            <LogOut className="text-sm" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
