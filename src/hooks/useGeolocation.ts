import { useState, useCallback } from 'react';

interface LocationData {
  coordinates: { lat: number; lng: number };
  city: string | null;
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
      const coordinates = { lat: latitude, lng: longitude };

      const reverseGeocodeUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`;
      
      const response = await fetch(reverseGeocodeUrl);
      if (!response.ok) {
        return { coordinates, city: null };
      }

      const data = await response.json();
      const city = data.address?.city || data.address?.town || data.address?.village || null;
      
      return { coordinates, city };

    } finally {
      setIsLoading(false);
    }
  }, []);

  return { isLoading, getLocation };
};