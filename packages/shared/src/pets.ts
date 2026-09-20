export const BUILTIN_PET_LABELS: Readonly<Record<string, string>> = {
  UNI_INU: 'Uni-Inu',
  AZZY: 'Azzy',
  CIPHER: 'Cipher',
  CRAFTY_CAT: 'Crafty Cat',
  DESSY: 'Dessy',
};

export type PetIdentity = { builtin_key?: string | null; code?: string | null; name?: string | null };

export function petDisplayName(pet: PetIdentity): string {
  if (pet.name?.trim()) return pet.name.trim();
  const builtIn = pet.builtin_key ? BUILTIN_PET_LABELS[pet.builtin_key] : undefined;
  if (builtIn) return builtIn;
  const readable = (pet.code ?? '')
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
  return readable || 'Pet';
}
