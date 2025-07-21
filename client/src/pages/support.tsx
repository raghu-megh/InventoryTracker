import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Mail, 
  MessageCircle, 
  Phone, 
  FileText, 
  Video, 
  Clock,
  HelpCircle,
  Zap,
  Settings,
  Database,
  Smartphone,
  AlertTriangle,
  CheckCircle
} from "lucide-react";

export default function Support() {
  const contactMethods = [
    {
      icon: <Mail className="h-8 w-8 text-blue-600" />,
      title: "Email Support",
      description: "Get help via email within 24 hours",
      contact: "support@myrestaurantinventory.com",
      responseTime: "24 hours",
      availability: "24/7"
    },
    {
      icon: <MessageCircle className="h-8 w-8 text-green-600" />,
      title: "Live Chat",
      description: "Chat with our support team in real-time",
      contact: "Available in app",
      responseTime: "5 minutes",
      availability: "Mon-Fri 9AM-6PM EST"
    },
    {
      icon: <Phone className="h-8 w-8 text-purple-600" />,
      title: "Phone Support",
      description: "Speak directly with our technical team",
      contact: "1-800-RESTAURANT",
      responseTime: "Immediate",
      availability: "Mon-Fri 9AM-6PM EST"
    }
  ];

  const quickHelp = [
    {
      icon: <Zap className="h-6 w-6 text-yellow-600" />,
      title: "Getting Started",
      description: "Set up your restaurant and connect Clover POS",
      articles: 5,
      popular: true
    },
    {
      icon: <Settings className="h-6 w-6 text-blue-600" />,
      title: "Clover Integration",
      description: "Configure webhooks and sync your menu items",
      articles: 8,
      popular: true
    },
    {
      icon: <Database className="h-6 w-6 text-green-600" />,
      title: "Inventory Management",
      description: "Track raw materials and recipe ingredients",
      articles: 12,
      popular: false
    },
    {
      icon: <Smartphone className="h-6 w-6 text-purple-600" />,
      title: "Mobile Usage",
      description: "Use the app on tablets and smartphones",
      articles: 4,
      popular: false
    },
    {
      icon: <AlertTriangle className="h-6 w-6 text-orange-600" />,
      title: "Troubleshooting",
      description: "Common issues and their solutions",
      articles: 15,
      popular: true
    },
    {
      icon: <FileText className="h-6 w-6 text-gray-600" />,
      title: "Reporting & Analytics",
      description: "Generate reports and understand analytics",
      articles: 7,
      popular: false
    }
  ];

  const faqs = [
    {
      question: "How do I connect my Clover POS system?",
      answer: "Go to Settings > Clover Integration and follow the step-by-step setup guide. You'll need your Clover Merchant ID and webhook configuration."
    },
    {
      question: "Can I track multiple restaurant locations?",
      answer: "Yes! MyRestaurantInventory supports multi-location management. Add each location with its own Clover integration and manage them from a single dashboard."
    },
    {
      question: "How does recipe-based inventory deduction work?",
      answer: "When you create recipes and link them to menu items, every sale automatically deducts the exact ingredient amounts from your raw materials inventory in real-time."
    },
    {
      question: "What happens if I run out of ingredients?",
      answer: "Our smart alert system will notify you via email and SMS when items drop below minimum thresholds, helping you prevent stockouts before they happen."
    },
    {
      question: "How accurate is the AI receipt scanning?",
      answer: "Our Azure AI-powered receipt scanning is highly accurate for most receipts. All extracted data is fully editable, so you can review and correct any items before saving."
    },
    {
      question: "Can I export my data?",
      answer: "Yes, you can export inventory reports, purchase history, and analytics data in CSV format. Contact support for bulk data exports."
    },
    {
      question: "Is my restaurant data secure?",
      answer: "Absolutely. We use enterprise-grade encryption, secure cloud infrastructure, and follow industry best practices to protect your business data."
    },
    {
      question: "What's included in the Premium subscription?",
      answer: "Premium includes advanced analytics, demand forecasting, cost optimization recommendations, supplier performance tracking, and priority support."
    }
  ];

  const resources = [
    {
      icon: <Video className="h-6 w-6 text-red-600" />,
      title: "Video Tutorials",
      description: "Step-by-step video guides for all features",
      link: "#"
    },
    {
      icon: <FileText className="h-6 w-6 text-blue-600" />,
      title: "User Guide",
      description: "Comprehensive documentation and setup guides",
      link: "#"
    },
    {
      icon: <MessageCircle className="h-6 w-6 text-green-600" />,
      title: "Community Forum",
      description: "Connect with other restaurant owners and share tips",
      link: "#"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            How can we help you?
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
            Get the support you need to make the most of MyRestaurantInventory
          </p>
        </div>

        {/* Contact Methods */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 text-center">
            Contact Support
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {contactMethods.map((method, index) => (
              <Card key={index} className="text-center">
                <CardHeader>
                  <div className="mx-auto mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-full w-fit">
                    {method.icon}
                  </div>
                  <CardTitle className="text-xl">{method.title}</CardTitle>
                  <CardDescription>{method.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {method.contact}
                    </p>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Response:</span>
                      <span className="font-medium">{method.responseTime}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Available:</span>
                      <span className="font-medium">{method.availability}</span>
                    </div>
                    <Button className="w-full mt-4">
                      Contact Now
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Quick Help */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 text-center">
            Quick Help Topics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quickHelp.map((topic, index) => (
              <Card key={index} className="cursor-pointer hover:shadow-lg transition-all duration-300">
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg w-fit">
                      {topic.icon}
                    </div>
                    {topic.popular && (
                      <Badge variant="secondary" className="text-xs">
                        Popular
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-lg">{topic.title}</CardTitle>
                  <CardDescription>{topic.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {topic.articles} articles
                    </span>
                    <Button variant="outline" size="sm">
                      View Articles
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 text-center">
            Frequently Asked Questions
          </h2>
          <div className="max-w-4xl mx-auto space-y-6">
            {faqs.map((faq, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-start space-x-3">
                    <HelpCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span>{faq.question}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    {faq.answer}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Additional Resources */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 text-center">
            Additional Resources
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {resources.map((resource, index) => (
              <Card key={index} className="text-center cursor-pointer hover:shadow-lg transition-all duration-300">
                <CardHeader>
                  <div className="mx-auto mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-full w-fit">
                    {resource.icon}
                  </div>
                  <CardTitle className="text-xl">{resource.title}</CardTitle>
                  <CardDescription>{resource.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full">
                    Access Resource
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Status Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              All Systems Operational
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Our services are running smoothly. Check our status page for real-time updates.
          </p>
          <Button variant="outline">
            View Status Page
          </Button>
        </div>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
            <div className="flex space-x-6 text-sm">
              <a href="/eula" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors">
                End User License Agreement
              </a>
              <a href="/privacy-policy" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors">
                Privacy Policy
              </a>
              <a href="/" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors">
                Back to App
              </a>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              © 2025 MyRestaurantInventory. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}