import { petDisplayName } from '@uni-nexus/shared';
import type { SyntheticEvent } from 'react';
import { assetUrl } from './api';
import uniInuIdle from '../assets/pets/Uni-Inu/Idle/Uni-Inu.avif';
import azzyIdle from '../assets/pets/Azzy/Idle/Azzy.avif';
import cipherIdle from '../assets/pets/Cipher/Idle/Cipher.avif';
import craftyCatIdle from '../assets/pets/Crafty Cat/Idle/Crafty Cat.avif';
import dessyIdle from '../assets/pets/Dessy/Idle/Dessy.avif';

export type PetImageData = {
  builtin_key: string | null;
  code: string | null;
  name?: string | null;
  image_storage_provider?: string | null;
  image_url?: string | null;
};

export const PET_BUILTIN_ASSETS: Readonly<Record<string, string>> = {
  UNI_INU: uniInuIdle,
  AZZY: azzyIdle,
  CIPHER: cipherIdle,
  CRAFTY_CAT: craftyCatIdle,
  DESSY: dessyIdle,
};

export function displayPetName(pet: PetImageData & { display_name?: string | null }) {
  return pet.display_name?.trim() || petDisplayName(pet);
}

export function bundledPetImage(pet: PetImageData): string | undefined {
  return pet.builtin_key ? PET_BUILTIN_ASSETS[pet.builtin_key] : undefined;
}

export function resolvePetImage(pet: PetImageData): string | undefined {
  if (pet.image_url) return /^https?:\/\//i.test(pet.image_url) ? pet.image_url : assetUrl(pet.image_url);
  return bundledPetImage(pet);
}

export function handlePetImageError(event: SyntheticEvent<HTMLImageElement>, pet: PetImageData) {
  const fallback = bundledPetImage(pet);
  if (fallback && event.currentTarget.dataset.bundledFallback !== 'true') {
    event.currentTarget.dataset.bundledFallback = 'true';
    event.currentTarget.src = fallback;
    return;
  }
  event.currentTarget.style.display = 'none';
}
