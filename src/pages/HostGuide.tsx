import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, UserCheck, Car, MapPin, Camera, FileSignature, CreditCard, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";

const HostGuide = () => {
  const navigate = useNavigate();

  const sections = [
    {
      icon: UserCheck,
      title: "1. Driver License Validation",
      text: "Verify that the guest's driver license is valid, not expired, and matches their name exactly. Do not release the vehicle if any information is unclear or inconsistent.",
    },
    {
      icon: Shield,
      title: "2. Identity Verification",
      text: "Request a selfie photo of the guest holding their driver license. The face and license must be clearly visible and match.",
    },
    {
      icon: Car,
      title: "3. Insurance Coverage",
      text: "Most personal auto insurance policies do not cover rentals. Obtain proper coverage from providers like ABI Insurance, Lula Insurance, GMI Insurance, Bonzah, or Tint. Coverage should include liability, physical damage, and third-party drivers.",
    },
    {
      icon: MapPin,
      title: "4. GPS Tracker",
      text: "Installing a GPS tracker is recommended to protect against theft or unauthorized use. Devices with remote engine disable options are preferred. Guests should be informed about tracking.",
    },
    {
      icon: Camera,
      title: "5. Vehicle Condition Documentation",
      text: "Before every rental, take at least 20 high-resolution photos documenting the vehicle's condition, including exterior, interior, odometer, fuel level, and existing damage.",
    },
    {
      icon: FileSignature,
      title: "6. Written Rental Agreement",
      text: "Use a written rental agreement signed electronically (e.g., DocuSign) before releasing the vehicle. Agreements should clearly define rental terms, responsibilities, and fees.",
    },
    {
      icon: CreditCard,
      title: "7. Accepting Payments",
      text: "DiRent does NOT process payments. If you choose to accept card payments, use independent third-party apps like Stripe, Square, or PayPal (business accounts). All fees, disputes, and compliance are between you and the provider.",
    },
  ];

  return (
    <>
      <SEO
        title="Host Recommendation Guide | DiRent"
        description="Best practices for renting out your personal vehicle on DiRent."
      />
      <Header />
      <main className="container mx-auto px-4 pt-20 sm:pt-24 pb-8 max-w-2xl">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </button>

        <h1 className="text-2xl font-bold mb-1">Host Recommendation Guide</h1>
        <p className="text-muted-foreground text-sm mb-4">
          Best Practices for Renting Out Your Personal Vehicle
        </p>

        {/* Disclaimer */}
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 mb-5 flex gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Disclaimer:</strong> DiRent is a listing and communication platform only. DiRent does not own, manage, insure, operate, or rent vehicles. DiRent does not process payments and is not responsible for any damage, theft, loss, accidents, injuries, or disputes. All rentals and payments are private agreements between Hosts and Guests.
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-4">
          {sections.map((section) => (
            <div key={section.title} className="rounded-lg border bg-card p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-md bg-primary/10 p-2 shrink-0">
                  <section.icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm mb-1">{section.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{section.text}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground text-center mt-6 italic">
          This guide is provided for informational purposes only and does not constitute legal, insurance, or financial advice.
        </p>

        <div className="text-center mt-6">
          <Button onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to DiRent
          </Button>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default HostGuide;
