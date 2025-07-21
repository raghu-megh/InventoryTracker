export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
            Privacy Policy
          </h1>
          
          <div className="prose prose-lg dark:prose-invert max-w-none space-y-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Last updated: {new Date().toLocaleDateString()}
            </p>
            
            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                1. Information We Collect
              </h2>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Account Information
              </h3>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                When you create an account, we collect your email address, name, and profile information from your authentication provider (Google, Apple).
              </p>
              
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Business Data
              </h3>
              <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 mb-4">
                <li>Restaurant information and locations</li>
                <li>Inventory data including raw materials and stock levels</li>
                <li>Recipe information and ingredient lists</li>
                <li>Sales data from POS integrations</li>
                <li>Purchase records and supplier information</li>
                <li>Usage analytics and performance metrics</li>
              </ul>

              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Technical Information
              </h3>
              <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300">
                <li>IP address and browser information</li>
                <li>Device type and operating system</li>
                <li>Usage patterns and feature interactions</li>
                <li>Error logs and performance data</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                2. How We Use Your Information
              </h2>
              <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300">
                <li><strong>Service Delivery:</strong> Provide inventory management, analytics, and reporting features</li>
                <li><strong>Integration:</strong> Connect with Clover POS and other authorized third-party services</li>
                <li><strong>Analytics:</strong> Generate business intelligence and optimization recommendations</li>
                <li><strong>Alerts:</strong> Send notifications about low stock and critical inventory levels</li>
                <li><strong>Support:</strong> Provide customer service and technical assistance</li>
                <li><strong>Improvement:</strong> Enhance our services and develop new features</li>
                <li><strong>Security:</strong> Protect against fraud and unauthorized access</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                3. Information Sharing
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                We do not sell your personal information. We may share information in these limited circumstances:
              </p>
              <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300">
                <li><strong>Service Providers:</strong> With trusted partners who help us operate our service (cloud hosting, payment processing, analytics)</li>
                <li><strong>POS Integration:</strong> With Clover and other authorized POS systems you choose to connect</li>
                <li><strong>Legal Requirements:</strong> When required by law or to protect our rights and users</li>
                <li><strong>Business Transfer:</strong> In connection with a merger, acquisition, or sale of assets</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                4. Third-Party Services
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Our service integrates with several third-party providers:
              </p>
              <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300">
                <li><strong>Clover POS:</strong> For real-time sales and inventory synchronization</li>
                <li><strong>Azure Document Intelligence:</strong> For AI-powered receipt processing</li>
                <li><strong>Mailchimp:</strong> For email notifications and alerts</li>
                <li><strong>Twilio:</strong> For SMS alerts and notifications</li>
                <li><strong>Firebase:</strong> For authentication and user management</li>
              </ul>
              <p className="text-gray-700 dark:text-gray-300">
                Each service has its own privacy policy governing how they handle your data.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                5. Data Security
              </h2>
              <p className="text-gray-700 dark:text-gray-300">
                We implement industry-standard security measures including:
              </p>
              <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300">
                <li>Encryption in transit (HTTPS/TLS)</li>
                <li>Encryption at rest for sensitive data</li>
                <li>Regular security audits and monitoring</li>
                <li>Access controls and authentication</li>
                <li>Secure cloud infrastructure (Neon Database, Replit)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                6. Data Retention
              </h2>
              <p className="text-gray-700 dark:text-gray-300">
                We retain your data for as long as your account is active or as needed to provide services. You may request data deletion, though we may retain certain information for legal or business purposes.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                7. Your Rights
              </h2>
              <p className="text-gray-700 dark:text-gray-300">
                Depending on your location, you may have rights to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300">
                <li>Access your personal information</li>
                <li>Correct inaccurate data</li>
                <li>Delete your account and data</li>
                <li>Export your data</li>
                <li>Opt out of certain communications</li>
                <li>Object to certain processing</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                8. Cookies and Tracking
              </h2>
              <p className="text-gray-700 dark:text-gray-300">
                We use cookies and similar technologies to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300">
                <li>Keep you logged in</li>
                <li>Remember your preferences</li>
                <li>Analyze usage patterns</li>
                <li>Improve performance</li>
              </ul>
              <p className="text-gray-700 dark:text-gray-300">
                You can control cookies through your browser settings.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                9. Children's Privacy
              </h2>
              <p className="text-gray-700 dark:text-gray-300">
                Our service is intended for business use and not directed to children under 13. We do not knowingly collect personal information from children.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                10. International Transfers
              </h2>
              <p className="text-gray-700 dark:text-gray-300">
                Your data may be processed in countries other than your own. We ensure appropriate safeguards are in place for international transfers.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                11. Updates to This Policy
              </h2>
              <p className="text-gray-700 dark:text-gray-300">
                We may update this Privacy Policy periodically. We will notify you of significant changes via email or through the service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                12. Contact Us
              </h2>
              <p className="text-gray-700 dark:text-gray-300">
                For privacy-related questions or requests, contact us at:
              </p>
              <ul className="list-none text-gray-700 dark:text-gray-300">
                <li>Email: privacy@myrestaurantinventory.com</li>
                <li>Address: MyRestaurantInventory Privacy Team</li>
              </ul>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}