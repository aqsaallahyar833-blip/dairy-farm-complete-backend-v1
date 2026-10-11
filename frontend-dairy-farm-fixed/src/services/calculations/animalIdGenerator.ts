/**
 * Centralized Animal ID Generator and Validator
 * Strictly adheres to Dairy Farm Management System specifications:
 * - Automatically generates ascending numerical IDs: AN-001, AN-002, ..., AN-025, AN-026
 * - Reads all existing animals, finds highest numerical Animal ID, adds 1
 * - Formats with leading zeros (minimum 3 digits)
 * - Guarantees uniqueness and prevents manual tampering / regeneration
 */

export interface AnimalIdentifiable {
  id?: string;
  animalId: string;
}

/**
 * Extracts numerical portion from animalId strings like 'AN-001', 'AN-26', 'AN-100', 'HF-027', etc.
 */
export function parseAnimalIdNumber(animalId: string | undefined | null): number | null {
  if (!animalId || typeof animalId !== 'string') return null;
  const trimmed = animalId.trim().toUpperCase();
  
  // Primary match: AN-001, AN001, AN-25
  const anMatch = trimmed.match(/^AN-?(\d+)$/);
  if (anMatch) {
    return parseInt(anMatch[1], 10);
  }

  // Fallback: any trailing digits (e.g. HF-025)
  const generalMatch = trimmed.match(/(\d+)$/);
  if (generalMatch) {
    return parseInt(generalMatch[1], 10);
  }

  return null;
}

/**
 * Formats a number into the standard Animal ID: 'AN-' + 3+ digits (e.g. 1 -> 'AN-001', 26 -> 'AN-026', 100 -> 'AN-100')
 */
export function formatAnimalId(num: number, prefix: string = 'AN-'): string {
  const safeNum = Math.max(1, Math.floor(num));
  const padded = safeNum < 1000 ? String(safeNum).padStart(3, '0') : String(safeNum);
  return `${prefix}${padded}`;
}

/**
 * Checks if an Animal ID is already taken by any existing animal
 */
export function isAnimalIdUnique(
  candidateId: string,
  existingAnimals: AnimalIdentifiable[],
  excludeDbId?: string
): boolean {
  if (!candidateId || !candidateId.trim()) return false;
  const candidateNorm = candidateId.trim().toUpperCase();
  
  return !existingAnimals.some((a) => {
    if (excludeDbId && a.id && a.id === excludeDbId) return false;
    return a.animalId && a.animalId.trim().toUpperCase() === candidateNorm;
  });
}

/**
 * Generates the next sequential Animal ID from existing records:
 * 1. Reads all existing animal records
 * 2. Finds the highest numerical Animal ID
 * 3. Adds 1
 * 4. Formats with leading zeros (e.g. AN-026)
 * 5. Verifies uniqueness
 */
export function generateNextAnimalId(
  existingAnimals: AnimalIdentifiable[],
  prefix: string = 'AN-'
): string {
  if (!existingAnimals || existingAnimals.length === 0) {
    return formatAnimalId(1, prefix);
  }

  let maxNum = 0;

  for (const animal of existingAnimals) {
    if (!animal.animalId) continue;
    
    // Check specific AN- prefix first
    const trimmed = animal.animalId.trim().toUpperCase();
    const anMatch = trimmed.match(/^AN-?(\d+)$/);
    if (anMatch) {
      const val = parseInt(anMatch[1], 10);
      if (!isNaN(val) && val > maxNum) {
        maxNum = val;
      }
      continue;
    }

    // Secondary: if no AN- IDs exist yet, parse any existing numerical tag
    const anyMatch = trimmed.match(/(\d+)$/);
    if (anyMatch) {
      const val = parseInt(anyMatch[1], 10);
      if (!isNaN(val) && val > maxNum) {
        maxNum = val;
      }
    }
  }

  let candidateNum = maxNum + 1;
  let candidateId = formatAnimalId(candidateNum, prefix);

  // Safeguard: Ensure absolute uniqueness even with unusual manual gaps
  while (!isAnimalIdUnique(candidateId, existingAnimals)) {
    candidateNum++;
    candidateId = formatAnimalId(candidateNum, prefix);
  }

  return candidateId;
}

/**
 * Generates the next sequential 3-digit Ear Tag (starting from '001', '002', ..., '025', '026')
 */
export function generateNextAnimalTag(
  existingAnimals: Array<{ animalId?: string; earTag?: string }>,
  padLength: number = 3
): string {
  if (!existingAnimals || existingAnimals.length === 0) {
    return '1'.padStart(padLength, '0');
  }

  let maxTag = 0;

  for (const animal of existingAnimals) {
    const candidates = [animal.earTag, animal.animalId].filter(Boolean) as string[];
    for (const c of candidates) {
      const match = c.trim().match(/(\d+)$/);
      if (match) {
        const val = parseInt(match[1], 10);
        if (!isNaN(val) && val > maxTag) {
          maxTag = val;
        }
      }
    }
  }

  const nextTag = maxTag + 1;
  return String(nextTag).padStart(padLength, '0');
}
