import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Boxes, Clock, Shield, BarChart3 } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Boxes className="text-white text-sm" />
              </div>
              <span className="text-xl font-semibold text-slate-800">CloverSync</span>
            </div>
            <Button 
              onClick={() => window.location.href = '/api/login'}
              className="bg-primary hover:bg-primary-600"
            >
              Sign In
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-5xl font-bold text-slate-800 mb-6">
              Multi-Tenant Inventory Tracking with{" "}
              <span className="text-primary">Clover POS Integration</span>
            </h1>
            <p className="text-xl text-slate-600 mb-8">
              Real-time inventory management across multiple restaurant locations. 
              Seamlessly sync with your Clover POS system for accurate stock tracking and automated updates.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                onClick={() => window.location.href = '/api/login'}
                className="bg-primary hover:bg-primary-600 text-lg px-8"
              >
                Get Started
              </Button>
              <Button variant="outline" size="lg" className="text-lg px-8">
                View Demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-800 mb-4">
              Everything you need for inventory management
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Built specifically for restaurants with multiple locations and Clover POS systems
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="border-0 shadow-lg">
              <CardHeader className="text-center pb-4">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Clock className="text-primary-600" />
                </div>
                <CardTitle className="text-lg">Real-Time Sync</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center">
                  Instant inventory updates when sales occur at your POS. Never miss a stock change again.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader className="text-center pb-4">
                <div className="w-12 h-12 bg-success-50 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Shield className="text-success-600" />
                </div>
                <CardTitle className="text-lg">Secure Webhooks</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center">
                  Encrypted webhook endpoints with signature verification for maximum security.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader className="text-center pb-4">
                <div className="w-12 h-12 bg-warning-50 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Boxes className="text-warning-600" />
                </div>
                <CardTitle className="text-lg">Multi-Location</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center">
                  Manage inventory across multiple restaurant locations with complete data isolation.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader className="text-center pb-4">
                <div className="w-12 h-12 bg-danger-50 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="text-danger-600" />
                </div>
                <CardTitle className="text-lg">Analytics & Reports</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center">
                  Comprehensive analytics and reporting to track inventory trends and performance.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to streamline your inventory management?
            </h2>
            <p className="text-primary-100 text-lg mb-8">
              Join restaurants already using CloverSync to manage their inventory across multiple locations.
            </p>
            <Button 
              size="lg" 
              variant="secondary"
              onClick={() => window.location.href = '/api/login'}
              className="text-lg px-8"
            >
              Start Free Trial
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-slate-800 text-white">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
              <Boxes className="text-white text-xs" />
            </div>
            <span className="font-semibold">CloverSync</span>
          </div>
          <p className="text-slate-400">
            © 2025 CloverSync. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
