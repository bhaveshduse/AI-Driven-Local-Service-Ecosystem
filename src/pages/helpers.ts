export const getImageUrl = (path: string | undefined | null): string => {
  if (!path) return '';
  // Handles both absolute URLs and paths from the backend uploads folder
  if (path.startsWith('http') || path.startsWith('blob:') || path.startsWith('data:') || path.startsWith('/')) return path.replace(/\\/g, '/');
  // Ensures a leading slash for relative paths
  return `/${path.replace(/\\/g, '/')}`;
};