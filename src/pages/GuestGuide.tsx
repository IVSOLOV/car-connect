import React from "react";
import { Link } from "react-router-dom";
import Footer from "@/components/Footer";
import { 
  FileText, 
  Shield, 
  MessageCircle, 
  Car, 
  Camera, 
  CreditCard, 
  MapPin, 
  FileSignature,
  CheckCircle,
  AlertTriangle,
  Phone,
  ArrowRight
} from "lucide-react";
import Header from "@/components/Header";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";

const GuestGuide = () => {
  const steps = [
    {
      icon: Car,
      title: "Browse Listings",
      description: "Search for vehicles by location, type, and price. View photos and read descriptions to find your perfect rental.",
    },
    {
      icon: MessageCircle,
      title: "Message the Owner",
      description: "Contact the owner directly to ask questions, confirm availability, and discuss rental terms.",
    },
    {
      icon: FileSignature,
      title: "Agree on Terms",
      description: "Discuss pricing, pickup/drop-off times, mileage limits, and any special requirements with the owner.",
    },
    {
      icon: CreditCard,
      title: "Arrange Payment",
      description: "Pay the owner directly using your preferred method (Stripe, PayPal, Venmo, etc.).",
    },
  ];

  const tips = [
    {
      icon: Camera,
      title: "Document Everything",
      description: "Take photos of the vehicle before and after your rental, including any existing damage, mileage, and fuel level.",
    },
    {
      icon: Shield,
      title: "Verify Insurance",
      description: "Confirm what insurance coverage is included or required. Consider rental insurance if needed.",
    },
    {
      icon: FileSignature,
      title: "Get It in Writing",
      description: "Request a rental agreement that outlines all terms, including pickup/return times, mileage, and fees.",
    },
    {
      icon: Phone,
      title: "Keep Communication",
      description: "Save all messages and agreements with the owner. Keep a record of all conversations.",
    },
    {
      icon: MapPin,
      title: "Know the Vehicle",
      description: "Ask for a walkthrough of the car's features, any quirks, and emergency procedures.",
    },
    {
      icon: CreditCard,
      title: "Understand Costs",
      description: "Clarify all costs upfront: daily rate, deposit, cleaning fee, extra mileage, and fuel policy.",
    },
  ];

  const doAndDonts = {
    dos: [
      "Verify the owner's identity and vehicle ownership",
      "Read all rental terms before agreeing",
      "Inspect the vehicle thoroughly before driving",
      "Take timestamped photos at pickup and return",
      "Report any issues immediately to the owner",
      "Return the vehicle on time and in the same condition",
    ],
    donts: [
      "Never pay in cash without a receipt",
      "Don't skip the pre-rental inspection",
      "Avoid rentals without clear terms",
      "Don't ignore dashboard warning lights",
      "Never exceed agreed-upon mileage without discussing",
      "Don't make unauthorized modifications to the vehicle",
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title="Renter's Guide | DiRent - Tips for Renting a Car"
        description="Learn how to rent a car safely on DiRent. Tips for renters, what to look for, and how to have a great rental experience."
        canonicalUrl="/guest-guide"
      />
      <Header />

      {/* Hero */}
      <section className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-primary mb-6">
              <FileText className="h-7 w-7 text-primary-foreground" />
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl mb-6">
              Renter's Guide
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Everything you need to know about renting a car directly from an owner on DiRent. 
              Follow these tips for a safe and smooth rental experience.
            </p>
            <Link to="/dashboard">
              <Button variant="hero" size="xl">
                Browse Available Cars
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 border-y border-border bg-secondary/30">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-foreground text-center mb-12">
            How Renting Works
          </h2>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 max-w-5xl mx-auto">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                <div className="text-center p-6 rounded-xl bg-card border border-border h-full">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                      {index + 1}
                    </span>
                  </div>
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-primary mb-4 mt-2">
                    <step.icon className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {step.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tips for Renters */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-2xl font-bold text-foreground mb-3">
                Tips for a Great Rental Experience
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Follow these recommendations to ensure a smooth and safe rental.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {tips.map((tip, index) => (
                <div key={index} className="flex gap-3 p-4 rounded-lg bg-card border border-border">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <tip.icon className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground text-sm mb-1">{tip.title}</h4>
                    <p className="text-xs text-muted-foreground">{tip.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Do's and Don'ts */}
      <section className="py-16 border-y border-border bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-foreground text-center mb-10">
              Do's and Don'ts
            </h2>
            
            <div className="grid gap-8 md:grid-cols-2">
              {/* Do's */}
              <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">Do</h3>
                </div>
                <ul className="space-y-3">
                  {doAndDonts.dos.map((item, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Don'ts */}
              <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">Don't</h3>
                </div>
                <ul className="space-y-3">
                  {doAndDonts.donts.map((item, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Ready to Find Your Ride?
            </h2>
            <p className="text-muted-foreground mb-8">
              Browse available cars from owners in your area. No commissions, just direct rentals.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/dashboard">
                <Button variant="hero" size="xl">
                  Browse Cars
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link to="/become-host">
                <Button variant="outline" size="xl">
                  Want to List Your Car?
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default GuestGuide;
