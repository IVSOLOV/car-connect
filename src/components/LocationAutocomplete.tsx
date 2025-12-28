import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { MapPin, Loader2 } from 'lucide-react';

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
        body: { input, types: '(cities)' },
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

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
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

      {showDropdown && (predictions.length > 0 || error) && (
        <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-auto">
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
