import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, MapPin } from 'lucide-react';
import { useDebounce } from '../hooks/useDebounce';

export interface NominatimSuggestion {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address: {
    road?: string;
    city?: string;
    town?:string;
    village?: string;
    postcode?: string;
    country?: string;
  };
}

interface AddressAutocompleteProps {
  value: string;
  onValueChange: (value: string) => void;
  onAddressSelect: (address: NominatimSuggestion) => void;
}

export const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({ value, onValueChange, onAddressSelect }) => {
  const [suggestions, setSuggestions] = useState<NominatimSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const debouncedSearchTerm = useDebounce(value, 300);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }
    setIsLoading(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5`;
      const response = await fetch(url, { headers: { 'User-Agent': 'Swayam-App/1.0' } });
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data);
      }
    } catch (error) {
      console.error("Failed to fetch address suggestions:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSuggestions(debouncedSearchTerm);
  }, [debouncedSearchTerm, fetchSuggestions]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (suggestion: NominatimSuggestion) => {
    onValueChange(suggestion.display_name);
    onAddressSelect(suggestion);
    setSuggestions([]);
    setIsFocused(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      <textarea
        id="address-input"
        placeholder="Enter the full service address or a nearby landmark..."
        required
        rows={3}
        value={value}
        onChange={e => onValueChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        className="w-full p-3 border rounded-lg"
        autoComplete="off"
      />
      {isLoading && <Loader2 className="absolute right-3 top-3 h-5 w-5 text-gray-400 animate-spin" />}

      {isFocused && suggestions.length > 0 && (
        <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-lg mt-1 max-h-60 overflow-y-auto shadow-lg">
          {suggestions.map((suggestion) => (
            <li
              key={suggestion.place_id}
              onClick={() => handleSelect(suggestion)}
              className="p-3 hover:bg-blue-50 cursor-pointer flex items-start"
            >
              <MapPin className="h-5 w-5 text-gray-400 mr-3 mt-1 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-800">{suggestion.address.road || suggestion.display_name.split(',')[0]}</p>
                <p className="text-xs text-gray-500">{suggestion.display_name}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};