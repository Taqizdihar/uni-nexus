import sharp from 'sharp';

const AVATAR_DIMENSION_PX = 512;
const AVATAR_WEBP_QUALITY = 82;

/**
 * Decodes an uploaded avatar image, auto-orients it from EXIF (before that metadata is
 * discarded), crops/resizes to a 512x512 square, and re-encodes as WEBP. Throws if the buffer
 * cannot be decoded as an image at all — callers should treat that as FILE_CONTENT_INVALID
 * (e.g. an executable renamed to `photo.jpg` that passed the extension/signature check but still
 * isn't a real image).
 */
export async function normalizeAvatarImage(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .rotate()
    .resize(AVATAR_DIMENSION_PX, AVATAR_DIMENSION_PX, { fit: 'cover', position: 'attention' })
    .webp({ quality: AVATAR_WEBP_QUALITY })
    .toBuffer();
}
