import { AppError } from '../errors/AppError';
import type { StoragePolicy } from './storage.types';

/** Forbidden regardless of policy — these can carry active/executable content. */
const NEVER_ALLOWED_EXTENSIONS = new Set([
  '.exe', '.bat', '.cmd', '.ps1', '.js', '.mjs', '.cjs', '.html', '.htm', '.svg', '.sh', '.msi', '.com', '.scr', '.vbs',
]);
const NEVER_ALLOWED_MIME_TYPES = new Set(['text/html', 'image/svg+xml', 'application/javascript', 'text/javascript']);

function extname(fileName: string): string {
  const match = /\.[^./\\]+$/.exec(fileName);
  return match ? match[0].toLowerCase() : '';
}

/** Magic-byte signature checks for formats where extension/MIME alone is easy to fake. */
function matchesImageSignature(buffer: Buffer, extension: string): boolean {
  if (buffer.length < 12) return false;
  switch (extension) {
    case '.jpg':
    case '.jpeg':
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    case '.png':
      return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    case '.webp':
      return buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
    default:
      return true; // No known signature for this extension (e.g. STL/3MF) — skip signature check.
  }
}

function matchesPdfSignature(buffer: Buffer): boolean {
  return buffer.subarray(0, 5).toString('ascii') === '%PDF-';
}

function matchesZipSignature(buffer: Buffer): boolean {
  // DOCX/XLSX/PPTX are ZIP containers; PK\x05\x06 covers an empty archive.
  const sig = buffer.subarray(0, 4);
  return sig.equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])) || sig.equals(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
}

export interface ValidateFileInput {
  originalName: string;
  mimeType: string | null | undefined;
  sizeBytes: number;
  /** First bytes of the file, used for signature checks. Pass the whole buffer for small files. */
  headBuffer: Buffer;
}

/**
 * Validates an uploaded file against a server-controlled policy: extension, declared MIME, size,
 * and (where practical) a magic-byte signature check so a renamed executable can't pass as an
 * image or PDF just because its extension and Content-Type header look right.
 */
export function validateAgainstPolicy(policy: StoragePolicy, input: ValidateFileInput): { extension: string } {
  const extension = extname(input.originalName);
  if (!extension) {
    throw new AppError(400, 'FILE_TYPE_NOT_ALLOWED', 'File harus memiliki ekstensi yang valid.');
  }
  if (NEVER_ALLOWED_EXTENSIONS.has(extension) || (input.mimeType && NEVER_ALLOWED_MIME_TYPES.has(input.mimeType))) {
    throw new AppError(415, 'FILE_TYPE_NOT_ALLOWED', 'Jenis file ini tidak diizinkan.');
  }
  if (!policy.allowedExtensions.includes(extension)) {
    throw new AppError(415, 'FILE_TYPE_NOT_ALLOWED', `Ekstensi file tidak didukung. Gunakan: ${policy.allowedExtensions.join(', ')}.`);
  }
  if (policy.allowedMimeTypes.length && input.mimeType && !policy.allowedMimeTypes.includes(input.mimeType)) {
    throw new AppError(415, 'FILE_TYPE_NOT_ALLOWED', 'Tipe MIME file tidak sesuai dengan ekstensinya.');
  }
  if (input.sizeBytes <= 0) {
    throw new AppError(400, 'FILE_REQUIRED', 'File kosong tidak dapat diunggah.');
  }
  if (input.sizeBytes > policy.maxSizeBytes) {
    throw new AppError(413, 'FILE_TOO_LARGE', `Ukuran file melebihi batas maksimum ${Math.floor(policy.maxSizeBytes / (1024 * 1024))} MB.`);
  }

  if (policy.contentValidation === 'image' && !matchesImageSignature(input.headBuffer, extension)) {
    throw new AppError(400, 'FILE_CONTENT_INVALID', 'Berkas bukan gambar yang valid atau rusak.');
  }
  if (policy.contentValidation === 'pdf' && !matchesPdfSignature(input.headBuffer)) {
    throw new AppError(400, 'FILE_CONTENT_INVALID', 'Berkas bukan PDF yang valid.');
  }
  // .3mf is a ZIP container (it's a 3D Manufacturing Format package), so the same signature applies.
  if (['.docx', '.xlsx', '.pptx', '.zip', '.3mf'].includes(extension) && !matchesZipSignature(input.headBuffer)) {
    throw new AppError(400, 'FILE_CONTENT_INVALID', 'Berkas rusak atau bukan format yang didukung.');
  }

  return { extension };
}

/** Basename-only, control-character-stripped, header-safe display name for Content-Disposition. */
export function sanitizeOriginalName(name: string): string {
  const base = name.split(/[\\/]/).pop() || 'file';
  // eslint-disable-next-line no-control-regex
  return base.replace(/[\x00-\x1f\x7f"]/g, '_').replace(/[<>:*?|]/g, '_').trim() || 'file';
}
