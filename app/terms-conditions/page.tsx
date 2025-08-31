'use client';

import Link from 'next/link';

export default function TermsConditionsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 via-black to-purple-900">
      {/* Header */}
      <header className="bg-black/40 backdrop-blur-md border-b border-purple-500/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-2xl font-bold text-white hover:text-purple-300 transition">
                DataDrip
              </Link>
              <span className="text-purple-300">Terms & Conditions</span>
            </div>
            <Link
              href="/register"
              className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition"
            >
              Back to Registration
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-black/40 rounded-2xl p-8 border border-purple-500/30">
          <h1 className="text-3xl font-bold text-white mb-6">Terms & Conditions</h1>
          <p className="text-gray-300 mb-6">Last updated: {new Date().toLocaleDateString()}</p>

          <div className="space-y-6 text-gray-300">
            <section>
              <h2 className="text-xl font-semibold text-white mb-3">1. Acceptance of Terms</h2>
              <p>
                By accessing and using DataDrip, you accept and agree to be bound by the terms and 
                provision of this agreement. If you do not agree to abide by the above, please do not use this service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">2. Description of Service</h2>
              <p>
                DataDrip is a data analytics and visualization platform that provides users with tools 
                to analyze, visualize, and manage their data. Our services include data processing, 
                reporting, and dashboard creation capabilities.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">3. User Accounts</h2>
              <p className="mb-3">When you create an account with us, you must provide accurate and complete information.</p>
              <p className="mb-3">You are responsible for:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Maintaining the security of your account</li>
                <li>All activities that occur under your account</li>
                <li>Notifying us immediately of any unauthorized use</li>
                <li>Ensuring your account information is up to date</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">4. Acceptable Use</h2>
              <p className="mb-3">You agree not to use the service to:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Violate any applicable laws or regulations</li>
                <li>Infringe upon the rights of others</li>
                <li>Upload malicious code or harmful content</li>
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Interfere with the proper functioning of the service</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">5. Data and Privacy</h2>
              <p>
                Your privacy is important to us. Please review our Privacy Policy, which also governs 
                your use of the service, to understand our practices regarding the collection and use 
                of your personal information.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">6. Intellectual Property</h2>
              <p>
                The service and its original content, features, and functionality are and will remain 
                the exclusive property of DataDrip and its licensors. The service is protected by 
                copyright, trademark, and other laws.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">7. Termination</h2>
              <p>
                We may terminate or suspend your account and bar access to the service immediately, 
                without prior notice or liability, under our sole discretion, for any reason whatsoever, 
                including without limitation if you breach the Terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">8. Limitation of Liability</h2>
              <p>
                In no event shall DataDrip, nor its directors, employees, partners, agents, suppliers, 
                or affiliates, be liable for any indirect, incidental, special, consequential, or punitive 
                damages, including without limitation, loss of profits, data, use, goodwill, or other 
                intangible losses.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">9. Disclaimers</h2>
              <p>
                The service is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis. DataDrip makes no 
                warranties, expressed or implied, and hereby disclaims all warranties, including without 
                limitation, implied warranties of merchantability and fitness for a particular purpose.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">10. Governing Law</h2>
              <p>
                These Terms shall be interpreted and governed by the laws of the jurisdiction in which 
                DataDrip operates, without regard to its conflict of law provisions.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">11. Changes to Terms</h2>
              <p>
                We reserve the right to modify or replace these Terms at any time. If a revision is 
                material, we will provide at least 30 days notice prior to any new terms taking effect.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">12. Contact Information</h2>
              <p>
                If you have any questions about these Terms & Conditions, please contact us at:{' '}
                <a href="mailto:legal@datadrip.com" className="text-purple-400 hover:text-purple-300">
                  legal@datadrip.com
                </a>
              </p>
            </section>
          </div>

          <div className="mt-8 pt-6 border-t border-purple-500/30">
            <Link
              href="/register"
              className="inline-flex items-center px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition"
            >
              ← Back to Registration
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
