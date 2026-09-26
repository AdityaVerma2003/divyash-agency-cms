import { v2 as cloudinary } from "cloudinary";

const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;

if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key:    CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure:     true,
  });
}

export const isCloudinaryConfigured = () =>
  !!(CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET);

/**
 * Upload a buffer to Cloudinary and return the secure URL.
 * Falls back to a local path URL if Cloudinary is not configured (dev mode).
 */
export async function uploadToCloudinary(
  buffer: Buffer,
  options: { folder?: string; public_id?: string; resource_type?: "image" | "raw" | "auto" } = {}
): Promise<string> {
  if (!isCloudinaryConfigured()) {
    throw new Error("Cloudinary not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.");
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder:        options.folder ?? "divyash-agency",
        public_id:     options.public_id,
        resource_type: options.resource_type ?? "image",
        overwrite:     true,
        format:         "webp",
        transformation: [{ width: 1200, height: 630, crop: "limit", quality: "auto:good" }],
      },
      (err, result) => {
        if (err || !result) return reject(err ?? new Error("Cloudinary upload returned no result"));
        resolve(result.secure_url);
      }
    );
    uploadStream.end(buffer);
  });
}

/**
 * Delete an asset from Cloudinary by its public_id (extracted from URL).
 * Safe to call even if the asset doesn't exist.
 */
export async function deleteFromCloudinary(publicIdOrUrl: string): Promise<void> {
  if (!isCloudinaryConfigured()) return;

  // If a full URL is passed, extract the public_id (everything after /upload/v.../  minus extension)
  let publicId = publicIdOrUrl;
  const uploadIdx = publicIdOrUrl.indexOf("/upload/");
  if (uploadIdx !== -1) {
    publicId = publicIdOrUrl
      .slice(uploadIdx + 8)
      .replace(/^v\d+\//, "") // strip version segment
      .replace(/\.[^.]+$/, ""); // strip extension
  }

  try {
    await cloudinary.uploader.destroy(publicId, { invalidate: true });
  } catch {
    // Non-fatal: old asset may not exist; don't crash the handler
  }
}
