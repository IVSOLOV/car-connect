import { useNavigate, Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import ListingCard from "@/components/ListingCard";
import ListingCardSkeleton from "@/components/ListingCardSkeleton";
import EmptyState from "@/components/EmptyState";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import heroImage from "@/assets/hero-car.jpg";
import type { Listing } from "@/types/listing";

const Index = () => {
  const navigate = useNavigate();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = async () => {
    try {
      const { data, error } = await supabase
        .from("listings" as any)
        .select("*")
        .eq("approval_status", "approved")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setListings((data as unknown as Listing[]) || []);
    } catch (error) {
      console.error("Error fetching listings:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title="DiRent - Direct Owner Car Rentals | Zero Commission"
        description="Rent cars directly from owners with zero commission fees. Skip the middleman and save on your next car rental. List your car for just $4.99/month."
        canonicalUrl="/"
      />
      <Header />

      {/* Hero Section */}
      <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden pt-24 sm:pt-20">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt="Luxury car"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/50 to-background" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-background/80" />
        </div>

        {/* Hero Content */}
        <div className="container relative z-10 mx-auto px-4 text-center">
          <div className="mx-auto max-w-4xl animate-fade-in">
            <h1 className="mb-6 mt-4 text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl">
              Rent Directly From
              <span className="block text-gradient">Car Owners</span>
            </h1>
            <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground sm:text-xl">
              Skip the middleman. Connect directly with car owners and save on fees.
              No commissions, no limitations on years, mileage, or titles — just simple car rentals.
            </p>


            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button variant="hero" size="xl" onClick={() => navigate("/dashboard")}>
                Browse All Cars
              </Button>
              <Button variant="outline" size="xl" onClick={() => navigate("/become-host")}>
                List Your Car
              </Button>
            </div>
            
            <div className="mt-6">
              <Link 
                to="/guest-guide" 
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                New to renting? Read our Renter's Guide →
              </Link>
            </div>

            {/* Scroll Indicator */}
            <div className="mt-12 flex flex-col items-center animate-bounce">
              <span className="text-sm text-foreground/70 mb-2">Scroll to explore</span>
              <div className="p-2 rounded-full bg-primary/20 border border-primary/30">
                <ChevronDown className="h-6 w-6 text-primary" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Listings */}
      <section className="py-6">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-foreground sm:text-4xl">
              Featured Listings
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Explore our handpicked selection of vehicles available for rent
            </p>
          </div>

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              <ListingCardSkeleton count={10} />
            </div>
          ) : listings.length === 0 ? (
            <div className="rounded-xl border border-border bg-card">
              <EmptyState
                variant="listings"
                actionLabel="List Your Car"
                onAction={() => navigate("/become-host")}
              />
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {listings.map((listing, index) => (
                <ListingCard key={listing.id} listing={listing} index={index} />
              ))}
            </div>
          )}

          {listings.length > 0 && (
            <div className="mt-12 text-center">
              <Button variant="outline" size="lg" onClick={() => navigate("/dashboard")}>
                Browse All Listings
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y border-border bg-secondary/30 py-16">
        <div className="container mx-auto px-4">
          <div className="grid gap-8 text-center sm:grid-cols-2 lg:grid-cols-4">
            <div className="animate-fade-in" style={{ animationDelay: "0ms" }}>
              <p className="text-4xl font-bold text-gradient">0%</p>
              <p className="mt-2 text-muted-foreground">Commission Fees</p>
            </div>
            <div className="animate-fade-in" style={{ animationDelay: "100ms" }}>
              <p className="text-4xl font-bold text-gradient">Direct</p>
              <p className="mt-2 text-muted-foreground">Owner Contact</p>
            </div>
            <div className="animate-fade-in" style={{ animationDelay: "200ms" }}>
              <div className="flex items-center justify-center gap-2">
                <span className="text-xl text-muted-foreground line-through">$14.99</span>
                <p className="text-4xl font-bold text-gradient">$4.99</p>
              </div>
              <p className="mt-2 text-muted-foreground">Per Car / Month</p>
              <p className="mt-1 text-sm text-primary font-medium">1 Month Free Trial</p>
            </div>
            <div className="animate-fade-in" style={{ animationDelay: "300ms" }}>
              <p className="text-4xl font-bold text-gradient">100%</p>
              <p className="mt-2 text-muted-foreground">Your Earnings</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-muted-foreground">
              © 2025 DiRent. All rights reserved.
            </p>
            <div className="flex gap-6">
              <Link to="/privacy" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Privacy Policy
              </Link>
              <Link to="/terms" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Terms of Service
              </Link>
              <Link 
                to="/write-to-support"
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Contact
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
