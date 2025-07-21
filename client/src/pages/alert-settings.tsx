import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Bell, Mail, MessageSquare, TestTube } from "lucide-react";

const alertSettingsSchema = z.object({
  alertEmail: z.string().email().optional().or(z.literal("")),
  alertPhone: z.string().optional(),
  enableEmailAlerts: z.boolean(),
  enableSmsAlerts: z.boolean(),
});

type AlertSettingsForm = z.infer<typeof alertSettingsSchema>;

export default function AlertSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedRestaurant, setSelectedRestaurant] = useState<string | null>(null);

  const { data: restaurants } = useQuery({
    queryKey: ["/api/auth/user/restaurants"],
    enabled: !!user,
  });

  const { data: restaurant, isLoading } = useQuery({
    queryKey: ["/api/restaurants", selectedRestaurant],
    enabled: !!selectedRestaurant,
  });

  const form = useForm<AlertSettingsForm>({
    resolver: zodResolver(alertSettingsSchema),
    defaultValues: {
      alertEmail: "",
      alertPhone: "",
      enableEmailAlerts: true,
      enableSmsAlerts: false,
    },
  });

  // Update form when restaurant data loads
  React.useEffect(() => {
    if (restaurant) {
      form.reset({
        alertEmail: restaurant.alertEmail || "",
        alertPhone: restaurant.alertPhone || "",
        enableEmailAlerts: restaurant.enableEmailAlerts ?? true,
        enableSmsAlerts: restaurant.enableSmsAlerts ?? false,
      });
    }
  }, [restaurant, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: AlertSettingsForm) => {
      await apiRequest(`/api/restaurants/${selectedRestaurant}/alert-settings`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Settings Updated",
        description: "Alert settings have been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants", selectedRestaurant] });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update alert settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const testAlertMutation = useMutation({
    mutationFn: async (type: 'email' | 'sms' | 'both') => {
      await apiRequest(`/api/alerts/test/${selectedRestaurant}`, {
        method: "POST",
        body: JSON.stringify({ type }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Test Alert Sent",
        description: "Check your email and/or phone for the test alert.",
      });
    },
    onError: () => {
      toast({
        title: "Test Failed",
        description: "Failed to send test alert. Please check your settings.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AlertSettingsForm) => {
    updateMutation.mutate(data);
  };

  const handleTestAlert = (type: 'email' | 'sms' | 'both') => {
    if (!selectedRestaurant) return;
    testAlertMutation.mutate(type);
  };

  // Auto-select first restaurant if user has restaurants
  React.useEffect(() => {
    if (restaurants && restaurants.length > 0 && !selectedRestaurant) {
      setSelectedRestaurant(restaurants[0].id);
    }
  }, [restaurants, selectedRestaurant]);

  if (!user) {
    return <div>Please sign in to access alert settings.</div>;
  }

  if (!restaurants || restaurants.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            No Restaurants Found
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            You need to set up a restaurant before configuring alerts.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-2">
        <Bell className="h-6 w-6 text-blue-600" />
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Alert Settings
        </h1>
      </div>

      {restaurants.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Restaurant</CardTitle>
          </CardHeader>
          <CardContent>
            <select
              className="w-full p-2 border rounded-md"
              value={selectedRestaurant || ""}
              onChange={(e) => setSelectedRestaurant(e.target.value)}
            >
              {restaurants.map((restaurant: any) => (
                <option key={restaurant.id} value={restaurant.id}>
                  {restaurant.name} - {restaurant.location}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>
      )}

      {selectedRestaurant && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="h-5 w-5" />
                <span>Alert Configuration</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="enableEmailAlerts"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base flex items-center space-x-2">
                            <Mail className="h-4 w-4" />
                            <span>Email Alerts</span>
                          </FormLabel>
                          <div className="text-sm text-muted-foreground">
                            Send low stock alerts via email
                          </div>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {form.watch("enableEmailAlerts") && (
                    <FormField
                      control={form.control}
                      name="alertEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Alert Email Address</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="alerts@yourrestaurant.com"
                              type="email"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="enableSmsAlerts"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base flex items-center space-x-2">
                            <MessageSquare className="h-4 w-4" />
                            <span>SMS Alerts</span>
                          </FormLabel>
                          <div className="text-sm text-muted-foreground">
                            Send critical alerts via text message
                          </div>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {form.watch("enableSmsAlerts") && (
                    <FormField
                      control={form.control}
                      name="alertPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="+1234567890"
                              type="tel"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <Button
                    type="submit"
                    disabled={updateMutation.isPending}
                    className="w-full"
                  >
                    {updateMutation.isPending ? "Saving..." : "Save Settings"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TestTube className="h-5 w-5" />
                <span>Test Alerts</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Test your alert configuration to ensure notifications are working properly.
              </p>

              <div className="space-y-2">
                <Button
                  onClick={() => handleTestAlert('email')}
                  disabled={testAlertMutation.isPending || !form.watch("enableEmailAlerts")}
                  variant="outline"
                  className="w-full"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Test Email Alert
                </Button>

                <Button
                  onClick={() => handleTestAlert('sms')}
                  disabled={testAlertMutation.isPending || !form.watch("enableSmsAlerts")}
                  variant="outline"
                  className="w-full"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Test SMS Alert
                </Button>

                <Button
                  onClick={() => handleTestAlert('both')}
                  disabled={testAlertMutation.isPending || (!form.watch("enableEmailAlerts") && !form.watch("enableSmsAlerts"))}
                  variant="default"
                  className="w-full"
                >
                  <Bell className="h-4 w-4 mr-2" />
                  Test Both Alerts
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>How Alert System Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                Immediate Alerts
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                High-priority raw materials trigger instant alerts when stock drops below minimum threshold during sales.
              </p>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">
                Daily Summaries
              </h3>
              <p className="text-sm text-green-800 dark:text-green-200">
                Morning digest of all low-stock items for better planning and inventory management.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}