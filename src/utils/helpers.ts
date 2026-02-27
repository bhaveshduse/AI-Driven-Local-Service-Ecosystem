const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

/**
 * Constructs a full URL for a given backend path and optionally appends a cache-busting query parameter.
 * @param path The relative path from the backend (e.g., 'uploads/image.png').
 * @param version A version identifier (like a timestamp or date string) to append for cache busting.
 * @returns The full, absolute URL for the image.
 */
export const getImageUrl = (path: string | undefined | null, version?: string | number | Date): string => {
  if (!path) {
    return '';
  }

  // If the path is already a full URL, return it directly.
  if (path.startsWith('http')) {
    return path;
  }

  // Clean up the path to ensure it's a proper relative path by removing
  // backslashes and any leading slash.
  const cleanedPath = path.replace(/\\/g, '/').replace(/^\//, '');

  // Construct the full URL using the base URL from environment variables.
  let url = `${API_BASE_URL}/${cleanedPath}`;

  // If a version is provided, append it as a cache-busting query parameter.
  if (version) {
    url += `?v=${new Date(version).getTime()}`;
  }
  return url;
};