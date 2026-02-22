import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";

const TermsOfService = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title="Terms of Service | DiRent"
        description="Read the terms and conditions for using DiRent's car rental marketplace."
        canonicalUrl="/terms"
      />
      <Header />

      <main className="container mx-auto px-4 pt-36 sm:pt-24 pb-8">
        <div className="mx-auto max-w-3xl">
          <button
            onClick={() => navigate(-1)}
            className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </button>
          <h1 className="mb-8 text-4xl font-bold text-foreground">Terms of Service for DiRent</h1>
          <p className="mb-6 text-muted-foreground">Last updated: December 2025</p>

          <div className="prose prose-invert max-w-none space-y-8">
            <p className="text-muted-foreground">
              Welcome to DiRent ("we", "our", "us"). These Terms of Service ("Terms") govern your access to and use of the DiRent website and mobile application (the "Service").
            </p>
            <p className="text-muted-foreground">
              By accessing or using DiRent, you agree to be bound by these Terms. If you do not agree, do not use the Service.
            </p>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-foreground">1. Description of the Service</h2>
              <p className="text-muted-foreground mb-3">
                DiRent is an online marketplace that allows vehicle owners ("Hosts") to list vehicles and communicate directly with potential renters ("Guests").
              </p>
              <p className="text-muted-foreground mb-3">DiRent:</p>
              <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                <li>Provides vehicle listings and messaging tools</li>
                <li>Does not manage bookings</li>
                <li>Does not process rental payments between users</li>
                <li>Does not provide insurance</li>
                <li>Does not act as a rental agency</li>
              </ul>
              <p className="text-muted-foreground mt-3">
                All rental agreements, payments, insurance, and liabilities are handled directly between users.
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-foreground">2. Eligibility</h2>
              <p className="text-muted-foreground mb-3">
                You must be at least 18 years old to use DiRent.
              </p>
              <p className="text-muted-foreground mb-3">By using the Service, you represent that:</p>
              <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                <li>You are legally able to enter into agreements</li>
                <li>Any information you provide is accurate and truthful</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-foreground">3. User Accounts</h2>
              
              <h3 className="text-xl font-medium mb-3 text-foreground">3.1 Account Registration</h3>
              <p className="text-muted-foreground mb-3">
                To access certain features, you must create an account and provide accurate information.
              </p>
              <p className="text-muted-foreground mb-3">You are responsible for:</p>
              <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                <li>Maintaining account confidentiality</li>
                <li>All activity that occurs under your account</li>
              </ul>

              <h3 className="text-xl font-medium mb-3 mt-4 text-foreground">3.2 Account Types</h3>
              <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                <li><strong className="text-foreground">Guest:</strong> Can browse listings and message hosts</li>
                <li><strong className="text-foreground">Host:</strong> Can create listings and manage vehicles (subscription required)</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-foreground">4. Host Listings</h2>
              <p className="text-muted-foreground mb-3">Hosts are solely responsible for:</p>
              <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                <li>Accuracy of listing information</li>
                <li>Vehicle condition and legality</li>
                <li>Pricing and availability</li>
                <li>Compliance with local laws and regulations</li>
              </ul>
              <p className="text-muted-foreground mt-3">
                DiRent may remove or suspend listings at its discretion.
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-foreground">5. Subscriptions & Fees</h2>
              
              <h3 className="text-xl font-medium mb-3 text-foreground">5.1 Host Subscription</h3>
              <p className="text-muted-foreground mb-3">
                Hosts must maintain an active subscription to publish or activate listings.
              </p>
              <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                <li>Subscription fees are billed on a recurring basis</li>
                <li>Fees are charged per listed vehicle</li>
                <li>Failure to pay may result in listing deactivation</li>
              </ul>

              <h3 className="text-xl font-medium mb-3 mt-4 text-foreground">5.2 No Refunds</h3>
              <p className="text-muted-foreground">
                Subscription fees are non-refundable, unless required by law.
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-foreground">6. User Conduct</h2>
              <p className="text-muted-foreground mb-3">You agree not to:</p>
              <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                <li>Provide false or misleading information</li>
                <li>Use the Service for illegal activities</li>
                <li>Harass, abuse, or spam other users</li>
                <li>Circumvent the subscription system</li>
                <li>Attempt to access unauthorized parts of the platform</li>
              </ul>
              <p className="text-muted-foreground mt-3">
                Violation may result in account suspension or termination.
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-foreground">7. Messaging & Communication</h2>
              <p className="text-muted-foreground mb-3">
                All communication must remain respectful and lawful.
              </p>
              <p className="text-muted-foreground mb-3">DiRent reserves the right to:</p>
              <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                <li>Monitor messages for abuse prevention</li>
                <li>Remove content that violates these Terms</li>
              </ul>
              <p className="text-muted-foreground mt-3">
                DiRent is not responsible for communications between users.
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-foreground">8. No Insurance & No Guarantees</h2>
              <p className="text-muted-foreground mb-3">DiRent does not:</p>
              <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                <li>Provide vehicle insurance</li>
                <li>Verify driver licenses</li>
                <li>Inspect vehicles</li>
                <li>Guarantee vehicle availability, condition, or safety</li>
              </ul>
              <p className="text-muted-foreground mt-3">
                Users assume all risks related to vehicle rentals arranged through the platform.
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-foreground">9. Limitation of Liability</h2>
              <p className="text-muted-foreground mb-3">To the maximum extent permitted by law:</p>
              <p className="text-muted-foreground mb-3">DiRent shall not be liable for:</p>
              <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                <li>Accidents, injuries, or damages</li>
                <li>Loss or theft of vehicles</li>
                <li>Disputes between users</li>
                <li>Financial losses resulting from rentals</li>
              </ul>
              <p className="text-foreground font-medium mt-3">
                Use of the Service is at your own risk.
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-foreground">10. Indemnification</h2>
              <p className="text-muted-foreground mb-3">
                You agree to indemnify and hold harmless DiRent from any claims, damages, losses, or expenses arising from:
              </p>
              <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                <li>Your use of the Service</li>
                <li>Your interactions with other users</li>
                <li>Any violation of these Terms</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-foreground">11. Termination</h2>
              <p className="text-muted-foreground mb-3">
                DiRent may suspend or terminate your account at any time, with or without notice, for violation of these Terms.
              </p>
              <p className="text-muted-foreground">
                You may stop using the Service at any time.
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-foreground">12. Intellectual Property</h2>
              <p className="text-muted-foreground mb-3">
                All content, branding, logos, and platform design are the property of DiRent.
              </p>
              <p className="text-muted-foreground">
                You may not copy, modify, or distribute any part of the Service without permission.
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-foreground">13. Changes to the Terms</h2>
              <p className="text-muted-foreground mb-3">
                We may update these Terms at any time.
              </p>
              <p className="text-muted-foreground">
                Continued use of the Service after changes constitutes acceptance of the updated Terms.
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-foreground">14. Governing Law</h2>
              <p className="text-muted-foreground">
                These Terms are governed by the laws of the United States and the state where DiRent operates.
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-foreground">15. Contact Information</h2>
              <p className="text-muted-foreground mb-3">
                For questions regarding these Terms, please contact us through our support page.
              </p>
              <div className="text-muted-foreground">
                <p>Contact: <Link to="/write-to-support" className="text-primary hover:underline">Submit a Support Request</Link></p>
                <p>Company Name: DiRent</p>
                <p>Location: United States</p>
              </div>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TermsOfService;
