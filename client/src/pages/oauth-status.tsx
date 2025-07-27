import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, Clock, ExternalLink, RefreshCw } from "lucide-react";

interface OAuthStatus {
  authenticated: boolean;
  cloverConnected: boolean;
  user: {
    id: string;
    email: string;
    merchantId: string;
    hasAccessToken: boolean;
  } | null;
  message: string;
  nextStep: string;
}

export default function OAuthStatusPage() {
  const { data: status, isLoading, refetch } = useQuery<OAuthStatus>({
    queryKey: ['/api/auth/clover/status'],
    refetchInterval: 2000, // Check every 2 seconds
  });

  const handleStartOAuth = () => {
    window.location.href = '/api/auth/clover';
  };

  const getStatusIcon = () => {
    if (isLoading) return <Clock className="h-6 w-6 text-yellow-500 animate-spin" />;
    if (status?.cloverConnected) return <CheckCircle className="h-6 w-6 text-green-500" />;
    if (status?.authenticated) return <Clock className="h-6 w-6 text-yellow-500" />;
    return <XCircle className="h-6 w-6 text-red-500" />;
  };

  const getStatusColor = () => {
    if (status?.cloverConnected) return "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950";
    if (status?.authenticated) return "border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950";
    return "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className={`w-full max-w-2xl ${getStatusColor()}`}>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 rounded-full w-fit">
            {getStatusIcon()}
          </div>
          <CardTitle className="text-2xl font-bold">
            Clover OAuth2 Status
          </CardTitle>
          <CardDescription>
            {status?.message || "Checking authentication status..."}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Status Details */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-3">
                {status?.authenticated ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <div>
                  <h4 className="font-medium">Authentication</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {status?.authenticated ? "Authenticated" : "Not authenticated"}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                {status?.cloverConnected ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : status?.authenticated ? (
                  <Clock className="h-5 w-5 text-yellow-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <div>
                  <h4 className="font-medium">Clover Connection</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {status?.cloverConnected ? "Connected" : "Not connected"}
                  </p>
                </div>
              </div>
            </div>

            {status?.user && (
              <Alert>
                <AlertDescription>
                  <strong>User Details:</strong><br />
                  Email: {status.user.email}<br />
                  Merchant ID: {status.user.merchantId}<br />
                  Access Token: {status.user.hasAccessToken ? "✓ Present" : "✗ Missing"}
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Next Steps */}
          <div className="space-y-4">
            <h3 className="font-semibold">Next Steps:</h3>
            <Alert>
              <AlertDescription>
                {status?.nextStep}
              </AlertDescription>
            </Alert>

            <div className="flex flex-col sm:flex-row gap-3">
              {!status?.authenticated ? (
                <Button 
                  onClick={handleStartOAuth}
                  className="bg-green-600 hover:bg-green-700 text-white flex-1"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Start OAuth2 Flow
                </Button>
              ) : !status?.cloverConnected ? (
                <Alert>
                  <AlertDescription>
                    You were redirected to Clover for authorization. If you haven't completed it yet, 
                    please finish the authorization process in your browser tab.
                  </AlertDescription>
                </Alert>
              ) : null}
              
              <Button 
                onClick={() => refetch()}
                variant="outline"
                className="flex-1"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Status
              </Button>
            </div>
          </div>

          {/* Flow Steps */}
          <div className="space-y-4">
            <h3 className="font-semibold">OAuth2 PKCE Flow Steps:</h3>
            <ol className="space-y-2 text-sm">
              <li className={`flex items-center space-x-2 ${status?.authenticated ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
                <span className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 flex items-center justify-center text-xs font-bold">1</span>
                <span>Generate PKCE parameters and redirect to Clover</span>
                {status?.authenticated && <CheckCircle className="h-4 w-4 text-green-600" />}
              </li>
              <li className={`flex items-center space-x-2 ${status?.authenticated ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
                <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold">2</span>
                <span>Merchant authorizes on Clover sandbox</span>
                {status?.authenticated && <CheckCircle className="h-4 w-4 text-green-600" />}
              </li>
              <li className={`flex items-center space-x-2 ${status?.cloverConnected ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
                <span className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400 flex items-center justify-center text-xs font-bold">3</span>
                <span>Receive authorization code and exchange for access token</span>
                {status?.cloverConnected && <CheckCircle className="h-4 w-4 text-green-600" />}
              </li>
              <li className={`flex items-center space-x-2 ${status?.cloverConnected ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
                <span className="w-6 h-6 rounded-full bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-400 flex items-center justify-center text-xs font-bold">4</span>
                <span>Ready to make Clover API calls</span>
                {status?.cloverConnected && <CheckCircle className="h-4 w-4 text-green-600" />}
              </li>
            </ol>
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Using OAuth2 PKCE flow with sandbox environment.
            Status updates automatically every 2 seconds.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}