import fetch from 'node-fetch';

/**
 * Geocodes an address string into latitude and longitude coordinates using Nominatim.
 * @param {string} addressString The address to geocode (e.g., "1600 Amphitheatre Parkway, Mountain View, CA").
 * @returns {Promise<[number, number] | null>} A promise that resolves to [longitude, latitude] or null if not found.
 */
export const geocodeAddress = async (addressString) => {
  if (!addressString) {
    return null;
  }

  try {
    // Using Nominatim, an open-source geocoder for OpenStreetMap data.
    const geocodeUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addressString)}&format=json&limit=1`;
    
    const response = await fetch(geocodeUrl, {
      // Nominatim requires a User-Agent header for its API policy.
      headers: { 'User-Agent': 'Swayam-App/1.0' }
    });

    if (!response.ok) {
      console.error(`[Geocoder] Nominatim API request failed with status: ${response.status}`);
      return null;
    }

    const data = await response.json();

    return (data && data.length > 0) ? [parseFloat(data[0].lon), parseFloat(data[0].lat)] : null;
  } catch (error) {
    console.error('[Geocoder] An error occurred during geocoding:', error);
    return null;
  }
};