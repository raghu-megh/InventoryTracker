import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, Shield, Zap } from "lucide-react";

export default function CloverSignIn() {
  const handleCloverSignIn = () => {
    // Redirect to Clover OAuth endpoint
    window.location.href = '/api/auth/clover';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-green-100 dark:bg-green-900 rounded-full w-fit">
            <Shield className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-2xl font-bold">
            Sign in with Clover
          </CardTitle>
          <CardDescription>
            Securely connect your Clover POS to MyRestaurantInventory
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <Zap className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium">Instant Setup</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Your restaurant and menu items sync automatically
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <Shield className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-medium">Secure OAuth</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Industry-standard authentication with PKCE protection
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <ExternalLink className="h-5 w-5 text-purple-600 mt-0.5" />
              <div>
                <h4 className="font-medium">Real-time Sync</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Orders and inventory updates happen automatically
                </p>
              </div>
            </div>
          </div>

          <Button 
            onClick={handleCloverSignIn}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
            size="lg"
          >
            <Shield className="h-5 w-5 mr-2" />
            Connect with Clover
          </Button>

          <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
            By connecting, you authorize MyRestaurantInventory to access your Clover POS data.
            Your data is encrypted and secure.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}