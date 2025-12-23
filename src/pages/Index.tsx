import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import Header from "@/components/Header";
import SearchFilters, { SearchFiltersType } from "@/components/SearchFilters";
import CarCard from "@/components/CarCard";
import { Button } from "@/components/ui/button";
import { mockCars } from "@/data/cars";
import heroImage from "@/assets/hero-car.jpg";

const Index = () => {
  const [cars, setCars] = useState(mockCars);
  const navigate = useNavigate();

  const handleSearch = (filters: SearchFiltersType) => {
    let filtered = [...mockCars];

    if (filters.query) {
      const query = filters.query.toLowerCase();
      filtered = filtered.filter(
        (car) =>
          car.title.toLowerCase().includes(query) ||
          car.brand.toLowerCase().includes(query) ||
          car.model.toLowerCase().includes(query)
      );
    }

    if (filters.brand && filters.brand !== "all") {
      filtered = filtered.filter(
        (car) => car.brand.toLowerCase() === filters.brand.toLowerCase()
      );
    }

    if (filters.priceRange && filters.priceRange !== "all") {
      const [min, max] = filters.priceRange.split("-").map((v) => parseInt(v) || Infinity);
      filtered = filtered.filter((car) => car.price >= min && car.price <= max);
    }

    setCars(filtered);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
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
            <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl">
              Rent Directly From
              <span className="block text-gradient">Car Owners</span>
            </h1>
            <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground sm:text-xl">
              Skip the middleman. Connect directly with car owners and save on fees.
              No commissions, just simple car rentals.
            </p>

            <div className="mx-auto max-w-4xl">
              <SearchFilters onSearch={handleSearch} />
            </div>

            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button variant="hero" size="xl">
                Browse All Cars
              </Button>
              <Button variant="outline" size="xl" onClick={() => navigate("/become-host")}>
                List Your Car
              </Button>
            </div>
          </div>

          {/* Scroll Indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
            <ChevronDown className="h-8 w-8 text-muted-foreground" />
          </div>
        </div>
      </section>

      {/* Featured Listings */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-foreground sm:text-4xl">
              Featured Listings
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Explore our handpicked selection of premium vehicles from verified sellers
            </p>
          </div>

          {cars.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {cars.map((car, index) => (
                <CarCard key={car.id} car={car} index={index} />
              ))}
            </div>
          ) : (
            <div className="py-20 text-center">
              <p className="text-lg text-muted-foreground">
                No cars found matching your criteria
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setCars(mockCars)}
              >
                Clear Filters
              </Button>
            </div>
          )}

          {cars.length > 0 && (
            <div className="mt-12 text-center">
              <Button variant="outline" size="lg">
                Load More Listings
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
              <p className="text-4xl font-bold text-gradient">$4.99</p>
              <p className="mt-2 text-muted-foreground">Per Car / Month</p>
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

export default Index;
