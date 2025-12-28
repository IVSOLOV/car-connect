import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, Loader2, Navigation } from 'lucide-react';
import { toast } from 'sonner';

interface LocationPrediction {
  placeId: string;
  description: string;
  city: string;
  state: string;
}

interface LocationAutocompleteProps {
  onLocationSelect: (city: string, state: string) => void;
  initialCity?: string;
  initialState?: string;
  placeholder?: string;
}

// Common US cities for fallback autocomplete
const usCities = [
  { city: "New York", state: "New York" },
  { city: "Los Angeles", state: "California" },
  { city: "Chicago", state: "Illinois" },
  { city: "Houston", state: "Texas" },
  { city: "Phoenix", state: "Arizona" },
  { city: "Philadelphia", state: "Pennsylvania" },
  { city: "San Antonio", state: "Texas" },
  { city: "San Diego", state: "California" },
  { city: "Dallas", state: "Texas" },
  { city: "San Jose", state: "California" },
  { city: "Austin", state: "Texas" },
  { city: "Jacksonville", state: "Florida" },
  { city: "Fort Worth", state: "Texas" },
  { city: "Columbus", state: "Ohio" },
  { city: "Charlotte", state: "North Carolina" },
  { city: "San Francisco", state: "California" },
  { city: "Indianapolis", state: "Indiana" },
  { city: "Seattle", state: "Washington" },
  { city: "Denver", state: "Colorado" },
  { city: "Washington", state: "District of Columbia" },
  { city: "Boston", state: "Massachusetts" },
  { city: "Nashville", state: "Tennessee" },
  { city: "El Paso", state: "Texas" },
  { city: "Portland", state: "Oregon" },
  { city: "Las Vegas", state: "Nevada" },
  { city: "Detroit", state: "Michigan" },
  { city: "Memphis", state: "Tennessee" },
  { city: "Louisville", state: "Kentucky" },
  { city: "Baltimore", state: "Maryland" },
  { city: "Milwaukee", state: "Wisconsin" },
  { city: "Albuquerque", state: "New Mexico" },
  { city: "Tucson", state: "Arizona" },
  { city: "Fresno", state: "California" },
  { city: "Sacramento", state: "California" },
  { city: "Mesa", state: "Arizona" },
  { city: "Kansas City", state: "Missouri" },
  { city: "Atlanta", state: "Georgia" },
  { city: "Miami", state: "Florida" },
  { city: "Colorado Springs", state: "Colorado" },
  { city: "Raleigh", state: "North Carolina" },
  { city: "Omaha", state: "Nebraska" },
  { city: "Long Beach", state: "California" },
  { city: "Virginia Beach", state: "Virginia" },
  { city: "Oakland", state: "California" },
  { city: "Minneapolis", state: "Minnesota" },
  { city: "Tampa", state: "Florida" },
  { city: "Tulsa", state: "Oklahoma" },
  { city: "Arlington", state: "Texas" },
  { city: "New Orleans", state: "Louisiana" },
  { city: "Wichita", state: "Kansas" },
  { city: "Cleveland", state: "Ohio" },
  { city: "Bakersfield", state: "California" },
  { city: "Aurora", state: "Colorado" },
  { city: "Anaheim", state: "California" },
  { city: "Honolulu", state: "Hawaii" },
  { city: "Santa Ana", state: "California" },
  { city: "Riverside", state: "California" },
  { city: "Corpus Christi", state: "Texas" },
  { city: "Lexington", state: "Kentucky" },
  { city: "Stockton", state: "California" },
  { city: "St. Louis", state: "Missouri" },
  { city: "Saint Paul", state: "Minnesota" },
  { city: "Henderson", state: "Nevada" },
  { city: "Pittsburgh", state: "Pennsylvania" },
  { city: "Cincinnati", state: "Ohio" },
  { city: "Anchorage", state: "Alaska" },
  { city: "Greensboro", state: "North Carolina" },
  { city: "Plano", state: "Texas" },
  { city: "Newark", state: "New Jersey" },
  { city: "Lincoln", state: "Nebraska" },
  { city: "Orlando", state: "Florida" },
  { city: "Irvine", state: "California" },
  { city: "Toledo", state: "Ohio" },
  { city: "Jersey City", state: "New Jersey" },
  { city: "Chula Vista", state: "California" },
  { city: "Durham", state: "North Carolina" },
  { city: "Fort Wayne", state: "Indiana" },
  { city: "St. Petersburg", state: "Florida" },
  { city: "Laredo", state: "Texas" },
  { city: "Buffalo", state: "New York" },
  { city: "Madison", state: "Wisconsin" },
  { city: "Lubbock", state: "Texas" },
  { city: "Chandler", state: "Arizona" },
  { city: "Scottsdale", state: "Arizona" },
  { city: "Glendale", state: "Arizona" },
  { city: "Reno", state: "Nevada" },
  { city: "Norfolk", state: "Virginia" },
  { city: "Winston-Salem", state: "North Carolina" },
  { city: "North Las Vegas", state: "Nevada" },
  { city: "Irving", state: "Texas" },
  { city: "Chesapeake", state: "Virginia" },
  { city: "Gilbert", state: "Arizona" },
  { city: "Hialeah", state: "Florida" },
  { city: "Garland", state: "Texas" },
  { city: "Fremont", state: "California" },
  { city: "Baton Rouge", state: "Louisiana" },
  { city: "Richmond", state: "Virginia" },
  { city: "Boise", state: "Idaho" },
  { city: "San Bernardino", state: "California" },
  { city: "Stone Harbor", state: "New Jersey" },
  { city: "Atlantic City", state: "New Jersey" },
  { city: "Cape May", state: "New Jersey" },
  { city: "Wildwood", state: "New Jersey" },
  { city: "Ocean City", state: "New Jersey" },
  { city: "Avalon", state: "New Jersey" },
  { city: "Sea Isle City", state: "New Jersey" },
];

const usStates = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut",
  "Delaware", "District of Columbia", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa",
  "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan",
  "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
  "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio",
  "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia",
  "Wisconsin", "Wyoming"
];

export function LocationAutocomplete({
  onLocationSelect,
  initialCity = '',
  initialState = '',
  placeholder = 'Start typing a city...',
}: LocationAutocompleteProps) {
  const [inputValue, setInputValue] = useState(
    initialCity && initialState ? `${initialCity}, ${initialState}` : ''
  );
  const [predictions, setPredictions] = useState<LocationPrediction[]>([]);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Update input when initial values change
  useEffect(() => {
    if (initialCity && initialState) {
      setInputValue(`${initialCity}, ${initialState}`);
    }
  }, [initialCity, initialState]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filterCities = (input: string): LocationPrediction[] => {
    if (input.length < 2) return [];
    
    const lowerInput = input.toLowerCase();
    const filtered = usCities
      .filter(item => 
        item.city.toLowerCase().includes(lowerInput) ||
        item.state.toLowerCase().includes(lowerInput)
      )
      .slice(0, 5)
      .map((item, index) => ({
        placeId: `local-${index}`,
        description: `${item.city}, ${item.state}`,
        city: item.city,
        state: item.state,
      }));
    
    return filtered;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setShowDropdown(true);
    
    // Use local filtering
    const filtered = filterCities(value);
    setPredictions(filtered);
  };

  const handleSelect = (prediction: LocationPrediction) => {
    setInputValue(`${prediction.city}, ${prediction.state}`);
    onLocationSelect(prediction.city, prediction.state);
    setPredictions([]);
    setShowDropdown(false);
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setIsGettingLocation(true);
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`
          );
          const data = await response.json();
          if (data.address) {
            const city = data.address.city || data.address.town || data.address.village || "";
            const stateAbbr = data.address.state;
            
            if (city && stateAbbr && usStates.includes(stateAbbr)) {
              setInputValue(`${city}, ${stateAbbr}`);
              onLocationSelect(city, stateAbbr);
              toast.success("Location detected!");
            } else if (city) {
              setInputValue(city);
              toast.info("City detected. Please select your state.");
            } else {
              toast.error("Could not determine your city. Please enter manually.");
            }
          }
        } catch (error) {
          console.error('Reverse geocoding error:', error);
          toast.error("Could not get location details. Please enter manually.");
        } finally {
          setIsGettingLocation(false);
        }
      },
      (error) => {
        setIsGettingLocation(false);
        if (error.code === error.PERMISSION_DENIED) {
          toast.error("Location access denied. Please enable location access or enter your city manually.");
        } else {
          toast.error("Could not get your location. Please enter manually.");
        }
      },
      { timeout: 10000 }
    );
  };

  return (
    <div ref={wrapperRef} className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={inputValue}
            onChange={handleInputChange}
            onFocus={() => predictions.length > 0 && setShowDropdown(true)}
            placeholder={placeholder}
            className="pl-10"
          />
        </div>
        <Button 
          type="button" 
          variant="outline" 
          onClick={handleGetLocation}
          disabled={isGettingLocation}
          className="shrink-0"
        >
          {isGettingLocation ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Navigation className="h-4 w-4 mr-2" />
          )}
          {isGettingLocation ? "Getting..." : "My Location"}
        </Button>
      </div>

      {showDropdown && predictions.length > 0 && (
        <div className="absolute z-50 w-full max-w-md mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-auto">
          {predictions.map((prediction) => (
            <button
              key={prediction.placeId}
              type="button"
              onClick={() => handleSelect(prediction)}
              className="w-full px-4 py-3 text-left hover:bg-accent transition-colors flex items-center gap-2"
            >
              <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm">{prediction.description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
