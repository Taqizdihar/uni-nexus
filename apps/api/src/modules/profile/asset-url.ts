export function resolveAssetUrl(
  userId: bigint,
  asset?: { asset_type: string; object_key: string | null; storage_provider: string | null; public_url: string | null },
) {
  if (!asset) return null;
  if (asset.public_url) return asset.public_url;
  if (asset.storage_provider === 'LOCAL' && asset.object_key)
    return `/api/v1/profile/assets/${userId.toString()}/${asset.asset_type}`;
  return null;
}
