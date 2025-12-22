import { useState } from "react";
import { Search, MapPin, Calendar, Fuel } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SearchFiltersProps {
  onSearch: (filters: SearchFiltersType) => void;
}

export interface SearchFiltersType {
  query: string;
  brand: string;
  priceRange: string;
  year: string;
}

const SearchFilters = ({ onSearch }: SearchFiltersProps) => {
  const [filters, setFilters] = useState<SearchFiltersType>({
    query: "",
    brand: "",
    priceRange: "",
    year: "",
  });

  const handleSearch = () => {
    onSearch(filters);
  };

  const brands = ["BMW", "Porsche", "Mercedes-Benz", "Audi", "Tesla", "Lamborghini"];
  const priceRanges = [
    { value: "0-50000", label: "Under $50,000" },
    { value: "50000-100000", label: "$50,000 - $100,000" },
    { value: "100000-200000", label: "$100,000 - $200,000" },
    { value: "200000+", label: "$200,000+" },
  ];
  const years = ["2024", "2023", "2022", "2021", "2020"];

  return (
    <div className="rounded-2xl border border-border bg-card/50 p-6 backdrop-blur-sm shadow-card animate-fade-in">
      <div className="grid gap-4 md:grid-cols-5">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by make, model..."
            className="pl-10"
            value={filters.query}
            onChange={(e) => setFilters({ ...filters, query: e.target.value })}
          />
        </div>

        <Select
          value={filters.brand}
          onValueChange={(value) => setFilters({ ...filters, brand: value })}
        >
          <SelectTrigger className="h-11 border-border bg-secondary">
            <MapPin className="mr-2 h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder="Brand" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Brands</SelectItem>
            {brands.map((brand) => (
              <SelectItem key={brand} value={brand.toLowerCase()}>
                {brand}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.priceRange}
          onValueChange={(value) => setFilters({ ...filters, priceRange: value })}
        >
          <SelectTrigger className="h-11 border-border bg-secondary">
            <Fuel className="mr-2 h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder="Price" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any Price</SelectItem>
            {priceRanges.map((range) => (
              <SelectItem key={range.value} value={range.value}>
                {range.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button onClick={handleSearch} size="lg" className="h-11">
          <Search className="mr-2 h-4 w-4" />
          Search
        </Button>
      </div>
    </div>
  );
};

export default SearchFilters;
