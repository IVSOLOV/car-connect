import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
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

const usStates = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut",
  "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa",
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
  const [isLoading, setIsLoading] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

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

  const fetchPredictions = async (input: string) => {
    if (input.length < 2) {
      setPredictions([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('google-places', {
        body: { input },
      });

      if (fnError) {
        console.error('Edge function error:', fnError);
        setError('Failed to fetch locations');
        setPredictions([]);
        return;
      }

      if (data.error) {
        console.error('API error:', data.error);
        setError(data.error);
        setPredictions([]);
        return;
      }

      setPredictions(data.predictions || []);
    } catch (err) {
      console.error('Error fetching predictions:', err);
      setError('Failed to fetch locations');
      setPredictions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setShowDropdown(true);

    // Debounce API calls
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      fetchPredictions(value);
    }, 300);
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
          {isLoading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
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

      {showDropdown && (predictions.length > 0 || error) && (
        <div className="absolute z-50 w-full max-w-md mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-auto">
          {error ? (
            <div className="px-4 py-3 text-sm text-destructive">{error}</div>
          ) : (
            predictions.map((prediction) => (
              <button
                key={prediction.placeId}
                type="button"
                onClick={() => handleSelect(prediction)}
                className="w-full px-4 py-3 text-left hover:bg-accent transition-colors flex items-center gap-2"
              >
                <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm">{prediction.description}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
