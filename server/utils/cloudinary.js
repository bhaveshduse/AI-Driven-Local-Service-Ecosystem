import { v2 as cloudinary } from 'cloudinary';

// Folders
const SWAYAM_AVATARS = 'swayam/avatars';
const SWAYAM_SERVICES = 'swayam/services';
const SWAYAM_VENDORS = 'swayam/vendors';
const SWAYAM_PAYMENTS = 'swayam/payments';
const SWAYAM_IDENTITY = 'swayam/identity';

// Signed URLs expire 24 hours after generation.
const PRIVATE_URL_TTL_SECONDS = 24 * 60 * 60;

try {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
} catch (error) {
  console.warn('[cloudinary] Config incomplete. Uploads will fail until CLOUDINARY_* env vars are set.', error);
}

/**
 * Uploads an in-memory buffer to Cloudinary.
 * @param {Buffer} buffer - File bytes from multer memoryStorage.
 * @param {{ folder?: string, isPrivate?: boolean }} options
 * @returns {Promise<{ publicId: string, stored: string }>}
 *   publicId - full Cloudinary public id (folder + name).
 *   stored   - value to persist: private assets store "public_id.ext" (signed at read time),
 *              public assets store the absolute secure_url.
 */
export function uploadBuffer(buffer, { folder, isPrivate = false } = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      folder,
      resource_type: 'image',
      ...(isPrivate ? { type: 'private' } : {}),
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
      max_bytes: 5 * 1024 * 1024,
    };
    cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(error);
      if (!result) return reject(new Error('Cloudinary upload returned no result.'));
      const stored = isPrivate ? `${result.public_id}.${result.format}` : result.secure_url;
      resolve({ publicId: result.public_id, stored });
    }).end(buffer);
  });
}

/**
 * Extracts the public id from a stored value.
 * Handles absolute secure_urls and private "public_id.ext" values.
 */
export function publicIdFromStored(stored) {
  if (!stored) return null;
  if (stored.startsWith('http')) {
    // e.g. https://res.cloudinary.com/<cloud>/image/upload/v1234567890/swayam/services/abc.jpg
    const match = stored.match(/\/image\/upload\/v\d+\/(.+)\.(jpg|jpeg|png|webp|gif)$/i);
    return match ? match[1] : null;
  }
  // private value: "swayam/payments/abc123.jpg"
  const idx = stored.lastIndexOf('.');
  return idx > 0 ? stored.slice(0, idx) : stored;
}

/**
 * Deletes an asset by its stored value (secure_url or public_id.ext).
 */
export async function deleteAssetByStored(stored) {
  const publicId = publicIdFromStored(stored);
  if (!publicId) return;
  await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
}

/**
 * Generates a time-limited signed URL for a private asset stored as "public_id.ext".
 */
export function signPrivateAsset(stored, ttlSeconds = PRIVATE_URL_TTL_SECONDS) {
  if (!stored) return null;
  if (stored.startsWith('http')) return stored;
  const idx = stored.lastIndexOf('.');
  const publicId = idx > 0 ? stored.slice(0, idx) : stored;
  const format = idx > 0 ? stored.slice(idx + 1) : 'jpg';
  const expires_at = Math.floor(Date.now() / 1000) + ttlSeconds;
  return cloudinary.utils.private_download_url(publicId, format, {
    resource_type: 'image',
    type: 'private',
    expires_at,
  });
}

export { SWAYAM_AVATARS, SWAYAM_SERVICES, SWAYAM_VENDORS, SWAYAM_PAYMENTS, SWAYAM_IDENTITY };
