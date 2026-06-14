import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useGeolocation, type LocationData } from './useGeolocation';

// Mock successful geolocation position
const mockPosition = {
  coords: {
    latitude: 51.5074,
    longitude: -0.1278,
    accuracy: 1,
    altitude: null,
    altitudeAccuracy: null,
    heading: null,
    speed: null,
  },
  timestamp: Date.now(),
};

// Mock successful reverse geocode response
const mockGeocodeResponse = {
  address: {
    city: 'London',
  },
};

describe('useGeolocation', () => {
  it('should return isLoading false initially', () => {
    const { result } = renderHook(() => useGeolocation());
    expect(result.current.isLoading).toBe(false);
  });

  it('should successfully get location and city', async () => {
    // Arrange: Mock successful API calls
    (navigator.geolocation.getCurrentPosition as vi.Mock).mockImplementationOnce((success) => {
      success(mockPosition);
    });
    (fetch as vi.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockGeocodeResponse,
    });

    const { result } = renderHook(() => useGeolocation());

    let locationData: LocationData | undefined;
    // Act: Call the getLocation function
    await act(async () => {
      locationData = await result.current.getLocation();
    });

    // Assert
    expect(result.current.isLoading).toBe(false);
    expect(locationData).toEqual({
      coordinates: {
        lat: mockPosition.coords.latitude,
        lon: mockPosition.coords.longitude,
      },
      address: { city: 'London' },
    });
    expect(navigator.geolocation.getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${mockPosition.coords.latitude}&lon=${mockPosition.coords.longitude}`
    );
  });

  it('should handle geolocation permission denial', async () => {
    // Arrange: Mock geolocation failure
    const mockError = new Error('User denied geolocation prompt');
    (navigator.geolocation.getCurrentPosition as vi.Mock).mockImplementationOnce((_, error) => {
      if (error) error(mockError);
    });

    const { result } = renderHook(() => useGeolocation());

    // Act & Assert: Expect the promise to reject
    await expect(act(async () => {
      await result.current.getLocation();
    })).rejects.toThrow('User denied geolocation prompt');

    expect(result.current.isLoading).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('should handle reverse geocoding API failure gracefully', async () => {
    // Arrange: Mock successful geolocation but failed fetch
    (navigator.geolocation.getCurrentPosition as vi.Mock).mockImplementationOnce((success) => {
      success(mockPosition);
    });
    (fetch as vi.Mock).mockResolvedValueOnce({
      ok: false, // Simulate a server error
    });

    const { result } = renderHook(() => useGeolocation());

    let locationData: LocationData | undefined;
    // Act
    await act(async () => {
      locationData = await result.current.getLocation();
    });

    // Assert: Should return coordinates but city should be null
    expect(result.current.isLoading).toBe(false);
    expect(locationData).toEqual({
      coordinates: {
        lat: mockPosition.coords.latitude,
        lon: mockPosition.coords.longitude,
      },
      address: null,
    });
  });
});