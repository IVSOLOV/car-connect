import { useState, useEffect } from "react";
import { Search, SlidersHorizontal, X, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import Header from "@/components/Header";
import SEO from "@/components/SEO";
import ListingCard from "@/components/ListingCard";
import ListingCardSkeleton from "@/components/ListingCardSkeleton";
import EmptyState from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import type { Listing } from "@/types/listing";
import { VehicleTypeFilter, type VehicleType } from "@/components/VehicleTypeSelector";

interface Booking {
  listing_id: string;
  start_date: string;
  end_date: string;
}

const CAR_MAKES = [
  "Acura", "Audi", "BMW", "Buick", "Cadillac", "Chevrolet", "Chrysler",
  "Dodge", "Ford", "GMC", "Honda", "Hyundai", "Infiniti", "Jaguar",
  "Jeep", "Kia", "Lexus", "Lincoln", "Mazda", "Mercedes-Benz",
  "Nissan", "Porsche", "Ram", "Subaru", "Tesla", "Toyota", "Volkswagen", "Volvo"
];

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];

const PRICE_RANGES = [
  { value: "0-50", label: "Under $50/day" },
  { value: "50-100", label: "$50 - $100/day" },
  { value: "100-200", label: "$100 - $200/day" },
  { value: "200+", label: "$200+/day" },
];

const Dashboard = () => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredListings, setFilteredListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMake, setSelectedMake] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [selectedPriceRange, setSelectedPriceRange] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedVehicleType, setSelectedVehicleType] = useState<VehicleType | "">("");
  const [selectedFuelType, setSelectedFuelType] = useState<string>("");
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 15 }, (_, i) => (currentYear - i).toString());

  useEffect(() => {
    fetchListings();
    fetchAllBookings();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [listings, bookings, searchQuery, selectedMake, selectedState, selectedPriceRange, selectedYear, selectedVehicleType, selectedFuelType, startDate, endDate]);

  const fetchListings = async () => {
    try {
      const { data, error } = await supabase
        .from("listings" as any)
        .select("*")
        .neq("approval_status", "deactivated")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setListings((data as unknown as Listing[]) || []);
    } catch (error) {
      console.error("Error fetching listings:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllBookings = async () => {
    try {
      const { data, error } = await supabase
        .from("listing_bookings" as any)
        .select("listing_id, start_date, end_date");

      if (error) throw error;
      setBookings((data as unknown as Booking[]) || []);
    } catch (error) {
      console.error("Error fetching bookings:", error);
    }
  };

  // Check if a listing has any booking that overlaps with selected date range
  const isListingAvailable = (listingId: string): boolean => {
    if (!startDate || !endDate) return true;

    const listingBookings = bookings.filter((b) => b.listing_id === listingId);
    
    for (const booking of listingBookings) {
      const bookingStart = new Date(booking.start_date);
      const bookingEnd = new Date(booking.end_date);
      
      // Check for overlap: ranges overlap if one starts before the other ends
      if (startDate <= bookingEnd && endDate >= bookingStart) {
        return false;
      }
    }
    
    return true;
  };

  const applyFilters = () => {
    let results = [...listings];

    // Date availability filter - exclude booked cars
    if (startDate && endDate) {
      results = results.filter((listing) => isListingAvailable(listing.id));
    }

    // Search query filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      results = results.filter(
        (listing) =>
          listing.make.toLowerCase().includes(query) ||
          listing.model.toLowerCase().includes(query) ||
          listing.city.toLowerCase().includes(query)
      );
    }

    // Make filter
    if (selectedMake) {
      results = results.filter((listing) => listing.make === selectedMake);
    }

    // State filter
    if (selectedState) {
      results = results.filter((listing) => listing.state === selectedState);
    }

    // Year filter
    if (selectedYear) {
      results = results.filter((listing) => listing.year.toString() === selectedYear);
    }

    // Vehicle type filter
    if (selectedVehicleType) {
      results = results.filter((listing) => listing.vehicle_type === selectedVehicleType);
    }

    // Fuel type filter
    if (selectedFuelType) {
      results = results.filter((listing) => listing.fuel_type === selectedFuelType);
    }

    // Price range filter
    if (selectedPriceRange) {
      results = results.filter((listing) => {
        const price = listing.daily_price;
        switch (selectedPriceRange) {
          case "0-50":
            return price < 50;
          case "50-100":
            return price >= 50 && price < 100;
          case "100-200":
            return price >= 100 && price < 200;
          case "200+":
            return price >= 200;
          default:
            return true;
        }
      });
    }

    setFilteredListings(results);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedMake("");
    setSelectedState("");
    setSelectedPriceRange("");
    setSelectedYear("");
    setSelectedVehicleType("");
    setSelectedFuelType("");
    setStartDate(undefined);
    setEndDate(undefined);
  };

  const hasActiveFilters = searchQuery || selectedMake || selectedState || selectedPriceRange || selectedYear || selectedVehicleType || selectedFuelType || startDate || endDate;

  const handleMakeChange = (value: string) => setSelectedMake(value === "all" ? "" : value);
  const handleStateChange = (value: string) => setSelectedState(value === "all" ? "" : value);
  const handleYearChange = (value: string) => setSelectedYear(value === "all" ? "" : value);
  const handlePriceChange = (value: string) => setSelectedPriceRange(value === "all" ? "" : value);

  const FilterControls = () => (
    <div className="space-y-4">
      {/* Vehicle Type Filter */}
      <div className="space-y-2">
        <Label>Vehicle Type</Label>
        <VehicleTypeFilter value={selectedVehicleType} onChange={setSelectedVehicleType} />
      </div>

      {/* Fuel Type Filter */}
      <div className="space-y-2">
        <Label>Fuel Type</Label>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedFuelType === "" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedFuelType("")}
            className="text-xs"
          >
            All
          </Button>
          <Button
            variant={selectedFuelType === "gas" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedFuelType("gas")}
            className="text-xs"
          >
            Gas
          </Button>
          <Button
            variant={selectedFuelType === "diesel" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedFuelType("diesel")}
            className="text-xs"
          >
            Diesel
          </Button>
          <Button
            variant={selectedFuelType === "hybrid" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedFuelType("hybrid")}
            className="text-xs"
          >
            Hybrid
          </Button>
          <Button
            variant={selectedFuelType === "electric" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedFuelType("electric")}
            className="text-xs"
          >
            Electric
          </Button>
          <Button
            variant={selectedFuelType === "other" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedFuelType("other")}
            className="text-xs"
          >
            Other
          </Button>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="space-y-2">
        <Label>Pickup Date</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !startDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {startDate ? format(startDate, "MMM d, yyyy") : "Select date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={startDate}
              onSelect={setStartDate}
              initialFocus
              className="pointer-events-auto"
              disabled={(date) => date < new Date()}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <Label>Return Date</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !endDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {endDate ? format(endDate, "MMM d, yyyy") : "Select date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={endDate}
              onSelect={setEndDate}
              initialFocus
              className="pointer-events-auto"
              disabled={(date) => (startDate ? date < startDate : date < new Date())}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <Label>Make</Label>
        <Select value={selectedMake || "all"} onValueChange={handleMakeChange}>
          <SelectTrigger>
            <SelectValue placeholder="All Makes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Makes</SelectItem>
            {CAR_MAKES.map((make) => (
              <SelectItem key={make} value={make}>
                {make}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>State</Label>
        <Select value={selectedState || "all"} onValueChange={handleStateChange}>
          <SelectTrigger>
            <SelectValue placeholder="All States" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All States</SelectItem>
            {US_STATES.map((state) => (
              <SelectItem key={state} value={state}>
                {state}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Year</Label>
        <Select value={selectedYear || "all"} onValueChange={handleYearChange}>
          <SelectTrigger>
            <SelectValue placeholder="All Years" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Years</SelectItem>
            {years.map((year) => (
              <SelectItem key={year} value={year}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Price Range</Label>
        <Select value={selectedPriceRange || "all"} onValueChange={handlePriceChange}>
          <SelectTrigger>
            <SelectValue placeholder="Any Price" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any Price</SelectItem>
            {PRICE_RANGES.map((range) => (
              <SelectItem key={range.value} value={range.value}>
                {range.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {hasActiveFilters && (
        <Button variant="outline" className="w-full" onClick={clearFilters}>
          <X className="mr-2 h-4 w-4" />
          Clear Filters
        </Button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Browse Cars | DiRent"
        description="Browse all available cars for rent. Filter by make, model, location, and price."
      />
      <Header />

      <main className="container mx-auto px-3 sm:px-4 pt-20 sm:pt-24 pb-8 sm:pb-12">
        {/* Page Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1 sm:mb-2">Browse Cars</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Find the perfect car for your next trip
          </p>
        </div>

        {/* Search and Mobile Filter Button */}
        <div className="flex gap-2 sm:gap-3 mb-4 sm:mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 sm:h-5 sm:w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search make, model, city..."
              className="pl-9 sm:pl-10 text-sm sm:text-base h-10 sm:h-11"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Mobile Filters */}
          <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="lg:hidden shrink-0 h-10 sm:h-11 px-3">
                <SlidersHorizontal className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Filters</span>
                {hasActiveFilters && (
                  <span className="ml-1 sm:ml-2 h-4 w-4 sm:h-5 sm:w-5 rounded-full bg-primary text-primary-foreground text-[10px] sm:text-xs flex items-center justify-center">
                    !
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[85vw] max-w-80 overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
              </SheetHeader>
              <div className="mt-6">
                <FilterControls />
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <div className="flex gap-6 sm:gap-8">
          {/* Desktop Sidebar Filters */}
          <aside className="hidden lg:block w-64 shrink-0">
            <div className="sticky top-24 rounded-xl border border-border bg-card p-5">
              <h2 className="font-semibold text-foreground mb-4">Filters</h2>
              <FilterControls />
            </div>
          </aside>

          {/* Results */}
          <div className="flex-1">
            {/* Results count */}
            <div className="mb-3 sm:mb-4 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs sm:text-sm text-muted-foreground">
                {loading ? "Loading..." : `${filteredListings.length} cars available`}
                {startDate && endDate && (
                  <span className="block sm:inline sm:ml-1">
                    for {format(startDate, "MMM d")} - {format(endDate, "MMM d")}
                  </span>
                )}
              </p>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="hidden lg:flex text-xs h-8"
                >
                  <X className="mr-1 h-3 w-3" />
                  Clear filters
                </Button>
              )}
            </div>

            {loading ? (
              <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
                <ListingCardSkeleton count={6} />
              </div>
            ) : filteredListings.length === 0 ? (
              <div className="rounded-xl border border-border bg-card">
                <EmptyState
                  variant={hasActiveFilters ? "search" : "listings"}
                  actionLabel={hasActiveFilters ? "Clear Filters" : undefined}
                  onAction={hasActiveFilters ? clearFilters : undefined}
                />
              </div>
            ) : (
              <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
                {filteredListings.map((listing, index) => (
                  <ListingCard 
                    key={listing.id} 
                    listing={listing} 
                    index={index}
                    startDate={startDate ? format(startDate, "yyyy-MM-dd") : undefined}
                    endDate={endDate ? format(endDate, "yyyy-MM-dd") : undefined}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
