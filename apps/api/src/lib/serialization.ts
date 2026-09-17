const privateKeys = new Set([
  'password_hash',
  'password',
  'current_password',
  'new_password',
  'token_hash',
  'access_token',
  'refresh_token',
  'object_key',
  'storage_key',
  'storage_path',
  'file_path',
]);

/** Prisma Decimal has a string toJSON; bigint IDs must also remain lossless strings. */
export function jsonReplacer(key: string, value: unknown): unknown {
  if (privateKeys.has(key)) return undefined;
  return typeof value === 'bigint' ? value.toString() : value;
}
