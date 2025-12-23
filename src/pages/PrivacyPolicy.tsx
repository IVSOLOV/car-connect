import Header from "@/components/Header";
import SEO from "@/components/SEO";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Privacy Policy | DiRent"
        description="Learn how DiRent collects, uses, and protects your personal information."
        canonicalUrl="/privacy"
      />
      <Header />

      <main className="container mx-auto px-4 py-24">
        <div className="mx-auto max-w-3xl">
          <h1 className="mb-8 text-4xl font-bold text-foreground">Privacy Policy</h1>
          <p className="mb-6 text-muted-foreground">Last updated: December 2024</p>

          <div className="prose prose-invert max-w-none space-y-8">
            <section>
              <h2 className="mb-4 text-2xl font-semibold text-foreground">1. Introduction</h2>
              <p className="text-muted-foreground">
                Welcome to DiRent. We respect your privacy and are committed to protecting your personal data. 
                This privacy policy explains how we collect, use, and safeguard your information when you use our 
                car rental marketplace platform.
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-foreground">2. Information We Collect</h2>
              <p className="mb-4 text-muted-foreground">We collect the following types of information:</p>
              <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                <li><strong className="text-foreground">Account Information:</strong> Name, email address, phone number, and profile photo when you create an account.</li>
                <li><strong className="text-foreground">Listing Information:</strong> Vehicle details, photos, pricing, and availability that car owners provide.</li>
                <li><strong className="text-foreground">Communication Data:</strong> Messages exchanged between renters and car owners through our platform.</li>
                <li><strong className="text-foreground">Usage Data:</strong> Information about how you interact with our platform, including pages visited and features used.</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-foreground">3. How We Use Your Information</h2>
              <p className="mb-4 text-muted-foreground">We use your information to:</p>
              <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                <li>Provide and maintain our car rental marketplace services</li>
                <li>Facilitate communication between car owners and renters</li>
                <li>Process transactions and send related information</li>
                <li>Send promotional communications (with your consent)</li>
                <li>Improve our platform and develop new features</li>
                <li>Ensure the security and integrity of our services</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-foreground">4. Information Sharing</h2>
              <p className="text-muted-foreground">
                We do not sell your personal information. We may share your information with:
              </p>
              <ul className="mt-4 list-disc space-y-2 pl-6 text-muted-foreground">
                <li><strong className="text-foreground">Other Users:</strong> Car owners and renters can see relevant profile information to facilitate rentals.</li>
                <li><strong className="text-foreground">Service Providers:</strong> Third parties that help us operate our platform (hosting, analytics, etc.).</li>
                <li><strong className="text-foreground">Legal Requirements:</strong> When required by law or to protect our rights and safety.</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-foreground">5. Data Security</h2>
              <p className="text-muted-foreground">
                We implement appropriate security measures to protect your personal information against unauthorized 
                access, alteration, disclosure, or destruction. This includes encryption, secure servers, and 
                regular security assessments.
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-foreground">6. Your Rights</h2>
              <p className="mb-4 text-muted-foreground">You have the right to:</p>
              <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                <li>Access and receive a copy of your personal data</li>
                <li>Correct inaccurate or incomplete information</li>
                <li>Delete your account and associated data</li>
                <li>Opt out of marketing communications</li>
                <li>Object to certain processing of your data</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-foreground">7. Cookies</h2>
              <p className="text-muted-foreground">
                We use cookies and similar technologies to improve your experience, analyze usage patterns, 
                and personalize content. You can control cookie preferences through your browser settings.
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-foreground">8. Contact Us</h2>
              <p className="text-muted-foreground">
                If you have questions about this Privacy Policy or our data practices, please contact us at:
              </p>
              <p className="mt-4 text-muted-foreground">
                Email: <a href="mailto:privacy@dirent.com" className="text-primary hover:underline">privacy@dirent.com</a>
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-foreground">9. Changes to This Policy</h2>
              <p className="text-muted-foreground">
                We may update this Privacy Policy from time to time. We will notify you of any changes by 
                posting the new Privacy Policy on this page and updating the "Last updated" date.
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PrivacyPolicy;
