import { useState, useCallback } from 'react';

export interface NominatimAddress {
  road?: string;
  house_number?: string;
  suburb?: string;
  city?: string;
  town?: string;
  village?: string;
  county?: string;
  state?: string;
  postcode?: string;
  country?: string;
  country_code?: string;
}

export interface LocationData {
  coordinates: { lat: number; lon: number };
  address: NominatimAddress | null;
}

/**
 * A custom hook to handle geolocation and reverse geocoding.
 * @returns {object} An object containing the loading state and a function to get the location.
 * - `isLoading`: A boolean indicating if the location is being fetched.
 * - `getLocation`: An async function that retrieves the user's coordinates and city.
 */
export const useGeolocation = () => {
  const [isLoading, setIsLoading] = useState(false);

  const getLocation = useCallback(async (): Promise<LocationData> => {
    setIsLoading(true);

    try {
      if (!navigator.geolocation) {
        throw new Error("Geolocation is not supported by your browser.");
      }

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
      });

      const { latitude, longitude } = position.coords;
      const coordinates = { lat: latitude, lon: longitude };

      const reverseGeocodeUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`;
      
      const response = await fetch(reverseGeocodeUrl, {
        headers: { 'User-Agent': 'Swayam-App/1.0' } // Nominatim requires a User-Agent
      });
      if (!response.ok) {
        return { coordinates, address: null };
      }

      const data = await response.json();
      
      return { coordinates, address: data.address || null };

    } finally {
      setIsLoading(false);
    }
  }, []);

  return { isLoading, getLocation };
};