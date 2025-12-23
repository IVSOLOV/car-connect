import React from "react";
import { useNavigate } from "react-router-dom";
import { Car, DollarSign, Users, MessageCircle, Check, ArrowRight } from "lucide-react";
import Header from "@/components/Header";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const BecomeHost = () => {
  const { user, role, upgradeToHost } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleBecomeHost = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }

    if (role === "host" || role === "admin") {
      navigate("/create-listing");
      return;
    }

    const { error } = await upgradeToHost();
    if (error) {
      toast({
        title: "Error",
        description: "Failed to upgrade to host. Please try again.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Welcome, Host!",
        description: "You can now list your cars for rent.",
      });
      navigate("/create-listing");
    }
  };

  const benefits = [
    {
      icon: DollarSign,
      title: "No Commission Fees",
      description: "Keep 100% of your rental income. Just pay a simple monthly subscription per car.",
    },
    {
      icon: Users,
      title: "Direct Communication",
      description: "Chat directly with renters. No middleman, no delays, no miscommunication.",
    },
    {
      icon: MessageCircle,
      title: "Simple Messaging",
      description: "Built-in messaging system keeps conversations organized by listing.",
    },
    {
      icon: Car,
      title: "Full Control",
      description: "Set your own prices, availability, and terms. Your car, your rules.",
    },
  ];

  const pricing = {
    price: "$4.99",
    period: "per car / month",
    features: [
      "Unlimited photos per listing",
      "Direct messaging with renters",
      "Listing analytics",
      "Featured placement options",
      "Priority support",
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title="List Your Car | DiRent - Earn Money Renting Your Car"
        description="List your car on DiRent for just $4.99/month. Keep 100% of your rental income with zero commission fees. Direct communication with renters."
        canonicalUrl="/become-host"
      />
      <Header />

      {/* Hero */}
      <section className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl mb-6">
              Rent Your Car,
              <span className="block text-gradient">Keep Your Earnings</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join DiRent and list your car with zero commission fees. 
              Unlike other platforms, we don't take a cut of your rentals.
            </p>
            <Button variant="hero" size="xl" onClick={handleBecomeHost}>
              {user ? "List Your Car" : "Get Started"}
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 border-y border-border bg-secondary/30">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-foreground text-center mb-12">
            Why Host on DiRent?
          </h2>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="text-center p-6 rounded-xl bg-card border border-border"
              >
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-primary mb-4">
                  <benefit.icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {benefit.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Simple, Transparent Pricing
              </h2>
              <p className="text-muted-foreground">
                No hidden fees. No commission on rentals.
              </p>
            </div>
            
            <div className="bg-card border border-border rounded-2xl p-8 shadow-card">
              <div className="text-center mb-6">
                <span className="text-5xl font-bold text-gradient">{pricing.price}</span>
                <p className="text-muted-foreground mt-2">{pricing.period}</p>
              </div>
              
              <ul className="space-y-3 mb-8">
                {pricing.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-primary flex-shrink-0" />
                    <span className="text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <Button variant="hero" className="w-full" onClick={handleBecomeHost}>
                {user ? "List Your Car" : "Sign Up to List"}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="py-16 border-t border-border">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-foreground text-center mb-8">
            DiRent vs. Other Platforms
          </h2>
          <div className="max-w-2xl mx-auto">
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="grid grid-cols-3 gap-4 p-4 border-b border-border bg-secondary/50">
                <div className="font-semibold text-foreground">Feature</div>
                <div className="font-semibold text-center text-primary">DiRent</div>
                <div className="font-semibold text-center text-muted-foreground">Others</div>
              </div>
              <div className="divide-y divide-border">
                {[
                  { feature: "Commission per rental", dirent: "0%", others: "15-30%" },
                  { feature: "Monthly fee per car", dirent: "$4.99", others: "Free*" },
                  { feature: "Direct owner contact", dirent: "Yes", others: "Limited" },
                  { feature: "Price control", dirent: "Full", others: "Platform sets" },
                  { feature: "Keep your earnings", dirent: "100%", others: "70-85%" },
                ].map((row, index) => (
                  <div key={index} className="grid grid-cols-3 gap-4 p-4">
                    <div className="text-muted-foreground">{row.feature}</div>
                    <div className="text-center text-primary font-medium">{row.dirent}</div>
                    <div className="text-center text-muted-foreground">{row.others}</div>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-sm text-muted-foreground text-center mt-4">
              * "Free" platforms take 15-30% of every rental
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-muted-foreground">
              © 2024 DiRent. All rights reserved.
            </p>
            <div className="flex gap-6">
              <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Terms of Service
              </a>
              <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default BecomeHost;
