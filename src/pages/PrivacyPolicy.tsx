import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO 
        title="Privacy Policy | DiRent"
        description="DiRent's Privacy Policy - Learn how we collect, use, and protect your personal information."
        canonicalUrl="/privacy"
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
          <h1 className="text-4xl font-bold mb-8 text-foreground">Privacy Policy for DiRent</h1>
          
          <p className="text-muted-foreground mb-6">Last updated: December 29, 2025</p>
          
          <div className="prose prose-invert max-w-none space-y-8">
            <p className="text-muted-foreground">
              DiRent ("we", "our", "us") respects your privacy and is committed to protecting your personal information. 
              This Privacy Policy explains how we collect, use, store, and protect information when you use the DiRent 
              website and mobile application (the "Service").
            </p>
            
            <p className="text-muted-foreground">
              By using DiRent, you agree to the collection and use of information in accordance with this Privacy Policy.
            </p>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">1. Information We Collect</h2>
              
              <h3 className="text-xl font-medium mb-3 text-foreground">1.1 Information You Provide</h3>
              <p className="text-muted-foreground mb-3">
                We may collect the following personal information when you create an account or use the Service:
              </p>
              <ul className="list-disc pl-6 mb-4 text-muted-foreground space-y-1">
                <li>Full name</li>
                <li>Email address</li>
                <li>Password (stored in encrypted form)</li>
                <li>Location (city and state)</li>
                <li>Vehicle information (for hosts), including:
                  <ul className="list-disc pl-6 mt-1 space-y-1">
                    <li>Make, model, year</li>
                    <li>Photos uploaded by you</li>
                    <li>Pricing details</li>
                  </ul>
                </li>
                <li>Messages sent through the in-app messaging system</li>
              </ul>

              <h3 className="text-xl font-medium mb-3 text-foreground">1.2 Automatically Collected Information</h3>
              <p className="text-muted-foreground mb-3">When you use DiRent, we may automatically collect:</p>
              <ul className="list-disc pl-6 mb-4 text-muted-foreground space-y-1">
                <li>IP address</li>
                <li>Device type and browser information</li>
                <li>Log data (pages visited, actions taken)</li>
                <li>Date and time of access</li>
              </ul>
              <p className="text-muted-foreground">This data is used for security, analytics, and service improvement.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">2. How We Use Your Information</h2>
              <p className="text-muted-foreground mb-3">We use your information to:</p>
              <ul className="list-disc pl-6 mb-4 text-muted-foreground space-y-1">
                <li>Create and manage user accounts</li>
                <li>Display vehicle listings</li>
                <li>Enable communication between guests and hosts</li>
                <li>Process host subscriptions and payments</li>
                <li>Provide customer support</li>
                <li>Improve platform performance and user experience</li>
                <li>Enforce our Terms of Service and platform rules</li>
              </ul>
              <p className="text-foreground font-medium">We do not sell or rent your personal data to third parties.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">3. Payments</h2>
              <p className="text-muted-foreground mb-3">
                Payments for host subscriptions are processed by third-party payment providers (such as Stripe). 
                DiRent does not store your full payment card information.
              </p>
              <p className="text-muted-foreground">Payment providers handle your data according to their own privacy policies.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">4. Messaging & Communication</h2>
              <p className="text-muted-foreground mb-3">Messages exchanged between users are stored within the platform to:</p>
              <ul className="list-disc pl-6 mb-4 text-muted-foreground space-y-1">
                <li>Enable communication between guests and hosts</li>
                <li>Prevent fraud and abuse</li>
                <li>Comply with legal requirements</li>
              </ul>
              <p className="text-muted-foreground">Phone numbers and email addresses are not shown publicly.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">5. Data Sharing</h2>
              <p className="text-muted-foreground mb-3">We may share limited information only in the following cases:</p>
              <ul className="list-disc pl-6 mb-4 text-muted-foreground space-y-1">
                <li>With service providers that help operate the platform (hosting, analytics, payments)</li>
                <li>If required by law or legal process</li>
                <li>To protect the rights, safety, and security of DiRent and its users</li>
              </ul>
              <p className="text-foreground font-medium">We never share personal data for advertising purposes.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">6. Data Retention</h2>
              <p className="text-muted-foreground mb-3">We retain personal information only as long as necessary to:</p>
              <ul className="list-disc pl-6 mb-4 text-muted-foreground space-y-1">
                <li>Provide the Service</li>
                <li>Meet legal and accounting obligations</li>
                <li>Resolve disputes and enforce agreements</li>
              </ul>
              <p className="text-muted-foreground">You may request account deletion at any time.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">7. Your Rights</h2>
              <p className="text-muted-foreground mb-3">Depending on your location, you may have the right to:</p>
              <ul className="list-disc pl-6 mb-4 text-muted-foreground space-y-1">
                <li>Access your personal data</li>
                <li>Correct inaccurate information</li>
                <li>Request deletion of your data</li>
                <li>Withdraw consent where applicable</li>
              </ul>
              <p className="text-muted-foreground">You can exercise these rights by contacting us.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">8. Data Security</h2>
              <p className="text-muted-foreground mb-3">
                We take reasonable technical and organizational measures to protect your data, including:
              </p>
              <ul className="list-disc pl-6 mb-4 text-muted-foreground space-y-1">
                <li>Encrypted passwords</li>
                <li>Secure servers</li>
                <li>Restricted access to personal information</li>
              </ul>
              <p className="text-muted-foreground">
                However, no system is 100% secure, and we cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">9. Children's Privacy</h2>
              <p className="text-muted-foreground">
                DiRent is not intended for users under the age of 18. We do not knowingly collect personal data from children.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">10. Third-Party Links</h2>
              <p className="text-muted-foreground">
                The Service may contain links to third-party websites. We are not responsible for the privacy practices of those websites.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">11. Changes to This Policy</h2>
              <p className="text-muted-foreground">
                We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated "Last updated" date.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">12. Contact Us</h2>
              <p className="text-muted-foreground mb-3">
                If you have any questions about this Privacy Policy or your data, please contact us through our support page.
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

export default PrivacyPolicy;
