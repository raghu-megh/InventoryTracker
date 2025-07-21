export default function EULA() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
            End User License Agreement
          </h1>
          
          <div className="prose prose-lg dark:prose-invert max-w-none space-y-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Last updated: {new Date().toLocaleDateString()}
            </p>
            
            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                1. License Grant
              </h2>
              <p className="text-gray-700 dark:text-gray-300">
                MyRestaurantInventory grants you a limited, non-exclusive, non-transferable license to use our inventory management software ("Service") subject to the terms and conditions of this Agreement.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                2. Permitted Use
              </h2>
              <p className="text-gray-700 dark:text-gray-300">
                You may use the Service for:
              </p>
              <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300">
                <li>Managing restaurant inventory and raw materials</li>
                <li>Creating recipes and tracking ingredient usage</li>
                <li>Integrating with authorized POS systems (Clover)</li>
                <li>Generating reports and analytics for business operations</li>
                <li>Setting up alerts and notifications for inventory management</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                3. Restrictions
              </h2>
              <p className="text-gray-700 dark:text-gray-300">
                You may NOT:
              </p>
              <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300">
                <li>Reverse engineer, decompile, or disassemble the Service</li>
                <li>Use the Service for any illegal or unauthorized purpose</li>
                <li>Share your account credentials with unauthorized parties</li>
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Use the Service to compete with MyRestaurantInventory</li>
                <li>Extract or harvest data for commercial purposes without permission</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                4. Data Ownership and Security
              </h2>
              <p className="text-gray-700 dark:text-gray-300">
                You retain ownership of all data you input into the Service. We implement industry-standard security measures to protect your data, including encryption in transit and at rest. However, you acknowledge that no system is 100% secure.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                5. Subscription and Payment
              </h2>
              <p className="text-gray-700 dark:text-gray-300">
                Premium features require a valid subscription. Payments are processed securely through our payment partners. You are responsible for maintaining current payment information and paying all applicable fees.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                6. Third-Party Integrations
              </h2>
              <p className="text-gray-700 dark:text-gray-300">
                The Service integrates with third-party services including Clover POS, Azure Document Intelligence, and communication providers. Your use of these integrations is subject to their respective terms of service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                7. Limitation of Liability
              </h2>
              <p className="text-gray-700 dark:text-gray-300">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, MYRESTAURANTINVENTORY SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES ARISING FROM YOUR USE OF THE SERVICE.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                8. Termination
              </h2>
              <p className="text-gray-700 dark:text-gray-300">
                Either party may terminate this Agreement at any time. Upon termination, your access to the Service will cease, but you may export your data within 30 days of termination.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                9. Updates to Agreement
              </h2>
              <p className="text-gray-700 dark:text-gray-300">
                We may update this Agreement from time to time. Continued use of the Service after changes constitutes acceptance of the new terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                10. Contact Information
              </h2>
              <p className="text-gray-700 dark:text-gray-300">
                For questions about this Agreement, contact us at legal@myrestaurantinventory.com
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}