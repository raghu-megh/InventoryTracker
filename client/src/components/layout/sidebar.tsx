import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link, useLocation } from "wouter";
import { 
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
  Menu
} from "lucide-react";
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
  { name: 'Inventory', href: '/inventory', icon: Package },
  { name: 'User Management', href: '/users', icon: Users },
  { name: 'Webhook Settings', href: '/webhook-settings', icon: Settings },
];

export default function Sidebar({ user, selectedRestaurant, onRestaurantChange }: SidebarProps) {
  const [location] = useLocation();

  const handleLogout = () => {
    window.location.href = '/api/logout';
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg border-r border-slate-200">
      {/* Logo & Brand */}
      <div className="flex items-center px-6 py-4 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Boxes className="text-white text-sm" />
          </div>
          <span className="text-lg font-semibold text-slate-800">CloverSync</span>
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
