import Header from "@/components/Header";
import SEO from "@/components/SEO";

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Terms of Service | DiRent"
        description="Read the terms and conditions for using DiRent's car rental marketplace."
        canonicalUrl="/terms"
      />
      <Header />

      <main className="container mx-auto px-4 py-24">
        <div className="mx-auto max-w-3xl">
          <h1 className="mb-8 text-4xl font-bold text-foreground">Terms of Service</h1>
          <p className="mb-6 text-muted-foreground">Last updated: December 2024</p>

          <div className="prose prose-invert max-w-none space-y-8">
            <section>
              <h2 className="mb-4 text-2xl font-semibold text-foreground">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground">
                By accessing or using DiRent, you agree to be bound by these Terms of Service. If you do not 
                agree to these terms, please do not use our platform. DiRent is a marketplace that connects 
                car owners with renters—we do not own or operate any vehicles listed on our platform.
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-foreground">2. Description of Service</h2>
              <p className="text-muted-foreground">
                DiRent provides a peer-to-peer car rental marketplace where car owners can list their vehicles 
                for rent and renters can browse and contact owners directly. We facilitate the connection but 
                are not a party to any rental agreement between owners and renters.
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-foreground">3. User Accounts</h2>
              <p className="mb-4 text-muted-foreground">To use certain features, you must create an account. You agree to:</p>
              <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                <li>Provide accurate and complete information</li>
                <li>Maintain the security of your account credentials</li>
                <li>Notify us immediately of any unauthorized access</li>
                <li>Be responsible for all activities under your account</li>
                <li>Be at least 18 years old to create an account</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-foreground">4. Car Owner Responsibilities</h2>
              <p className="mb-4 text-muted-foreground">If you list a vehicle on DiRent, you agree to:</p>
              <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                <li>Provide accurate information about your vehicle</li>
                <li>Maintain valid registration and insurance for your vehicle</li>
                <li>Ensure your vehicle is safe and roadworthy</li>
                <li>Respond promptly to renter inquiries</li>
                <li>Honor confirmed bookings and pricing</li>
                <li>Comply with all applicable laws and regulations</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-foreground">5. Renter Responsibilities</h2>
              <p className="mb-4 text-muted-foreground">If you rent a vehicle through DiRent, you agree to:</p>
              <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                <li>Possess a valid driver's license</li>
                <li>Treat the vehicle with care and respect</li>
                <li>Return the vehicle in the same condition as received</li>
                <li>Report any accidents or damage immediately</li>
                <li>Comply with all traffic laws and regulations</li>
                <li>Not sublease or transfer the vehicle to others</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-foreground">6. Fees and Payments</h2>
              <p className="text-muted-foreground">
                Car owners pay a monthly subscription fee of $4.99 per listed vehicle. All rental payments 
                and arrangements are made directly between car owners and renters. DiRent does not collect 
                commissions on rentals. We are not responsible for payment disputes between users.
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-foreground">7. Prohibited Activities</h2>
              <p className="mb-4 text-muted-foreground">You may not:</p>
              <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                <li>Use the platform for any illegal purpose</li>
                <li>Post false, misleading, or fraudulent content</li>
                <li>Harass, threaten, or abuse other users</li>
                <li>Attempt to circumvent our platform to avoid fees</li>
                <li>Scrape or collect user data without permission</li>
                <li>Interfere with the platform's security or functionality</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-foreground">8. Limitation of Liability</h2>
              <p className="text-muted-foreground">
                DiRent is a marketplace platform only. We are not responsible for the condition of vehicles, 
                the conduct of users, or any damages arising from rental transactions. Users engage in 
                rentals at their own risk. To the maximum extent permitted by law, DiRent shall not be 
                liable for any indirect, incidental, or consequential damages.
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-foreground">9. Indemnification</h2>
              <p className="text-muted-foreground">
                You agree to indemnify and hold harmless DiRent, its officers, directors, employees, and 
                agents from any claims, damages, or expenses arising from your use of the platform or 
                violation of these terms.
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-foreground">10. Termination</h2>
              <p className="text-muted-foreground">
                We may suspend or terminate your account at any time for violation of these terms or for 
                any other reason at our discretion. You may also delete your account at any time through 
                your account settings.
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-foreground">11. Changes to Terms</h2>
              <p className="text-muted-foreground">
                We may modify these Terms of Service at any time. Continued use of the platform after 
                changes constitutes acceptance of the new terms. We will notify users of significant 
                changes via email or platform notification.
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-foreground">12. Contact</h2>
              <p className="text-muted-foreground">
                For questions about these Terms of Service, please contact us at:
              </p>
              <p className="mt-4 text-muted-foreground">
                Email: <a href="mailto:legal@dirent.com" className="text-primary hover:underline">legal@dirent.com</a>
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TermsOfService;
