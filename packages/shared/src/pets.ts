export const BUILTIN_PET_LABELS: Readonly<Record<string, string>> = {
  UNI_INU: 'Uni-Inu',
  AZZY: 'Azzy',
  CIPHER: 'Cipher',
  CRAFTY_CAT: 'Crafty Cat',
  DESSY: 'Dessy',
};

export type PetIdentity = { code: string; name?: string | null };

export function petDisplayName(pet: PetIdentity): string {
  if (pet.name?.trim()) return pet.name.trim();
  const builtIn = BUILTIN_PET_LABELS[pet.code];
  if (builtIn) return builtIn;
  const readable = pet.code
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
  return readable || 'Pet';
}
