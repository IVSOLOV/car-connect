import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, Loader2, Navigation } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentPosition } from '@/lib/geolocation';

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
  const [isLoading, setIsLoading] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (initialCity && initialState) {
      setInputValue(`${initialCity}, ${initialState}`);
    }
  }, [initialCity, initialState]);

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
    try {
      const { data, error } = await supabase.functions.invoke('google-places', {
        body: { input },
      });

      if (error) {
        console.error('Error fetching places:', error);
        return;
      }

      if (data?.predictions) {
        setPredictions(data.predictions);
        setShowDropdown(true);
      }
    } catch (error) {
      console.error('Error fetching places:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setShowDropdown(true);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      fetchPredictions(value.trim());
    }, 300);
  };

  const handleSelect = (prediction: LocationPrediction) => {
    setInputValue(`${prediction.city}, ${prediction.state}`);
    onLocationSelect(prediction.city, prediction.state);
    setPredictions([]);
    setShowDropdown(false);
  };

  const applyDetectedLocation = (city: string, state: string, message: string) => {
    if (city && state && usStates.includes(state)) {
      setInputValue(`${city}, ${state}`);
      onLocationSelect(city, state);
      toast.success(message);
      return true;
    }

    if (city) {
      setInputValue(city);
      toast.info('City detected. Please type to select your full location.');
      return true;
    }

    return false;
  };

  const resolveLocation = async (payload?: { latitude: number; longitude: number }) => {
    const { data, error } = await supabase.functions.invoke('resolve-location', {
      body: payload ?? {},
    });

    if (error) {
      throw error;
    }

    return data as { city?: string; state?: string; source?: 'gps' | 'ip' };
  };

  const handleGetLocation = async () => {
    setIsGettingLocation(true);

    try {
      const position = await getCurrentPosition();
      const data = await resolveLocation(position);

      if (!applyDetectedLocation(data.city || '', data.state || '', 'Location detected!')) {
        toast.error('Could not determine location. Please type your city.');
      }
    } catch (error) {
      console.error('Geolocation error:', error);

      try {
        const data = await resolveLocation();
        const fallbackMessage = data.source === 'ip'
          ? 'Using approximate location from your network.'
          : 'Location detected!';

        if (!applyDetectedLocation(data.city || '', data.state || '', fallbackMessage)) {
          toast.error('Could not detect your location. Please type your city manually.');
        }
      } catch (fallbackError) {
        console.error('Location fallback error:', fallbackError);
        toast.error('Could not detect your location. Please type your city manually.');
      }
    } finally {
      setIsGettingLocation(false);
    }
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
          {isGettingLocation ? 'Getting...' : 'My Location'}
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
