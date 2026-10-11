import { Animal } from '../../types';
import { animalCalculationService } from '../calculations/animalCalculationService';

export interface AnimalViewModel extends Animal {
  displayAge: string;
  lactationDisplay: string;
  statusBadgeVariant: 'success' | 'warning' | 'info' | 'error' | 'neutral';
  /** Title-Case label for the animal's current status. */
  statusLabel: string;
}

export function calculateAge(dateOfBirth: string): string {
  return animalCalculationService.calculateAge(dateOfBirth).display;
}

export function getStatusBadgeVariant(status: Animal['status']): AnimalViewModel['statusBadgeVariant'] {
  switch (status) {
    case 'Lactating':
      return 'success';
    case 'Dry':
      return 'warning';
    case 'Pregnant':
      return 'info';
    case 'Sick':
    case 'Quarantine':
    case 'Dead':
      return 'error';
    case 'Active':
      return 'success';
    case 'Bull':
      return 'info';
    case 'Heifer':
    case 'Calf':
    case 'Open':
    case 'Sold':
    default:
      return 'neutral';
  }
}

/**
 * Renders a status for display only.
 *
 * The API returns the database enum UPPERCASE (the database is the source of
 * truth). This helper accepts either casing so a raw DB value can be shown
 * directly without a second translation layer.
 *
 * DB: 'LACTATING' -> Display: 'Lactating'
 */
export function getStatusLabel(status: string | null | undefined): string {
  const value = String(status || '').trim();
  if (!value) return '';

  // Already Title-Case (e.g. from the mock layer) - leave it alone.
  if (/^[A-Z][a-z]/.test(value)) return value;

  return value.charAt(0) + value.slice(1).toLowerCase();
}

/** Tailwind classes for a status chip, keyed on the database enum. */
export function getStatusColor(status: string | null | undefined): string {
  const map: Record<string, string> = {
    ACTIVE: 'bg-emerald-100 text-emerald-800',
    LACTATING: 'bg-blue-100 text-blue-800',
    DRY: 'bg-gray-100 text-gray-800',
    PREGNANT: 'bg-pink-100 text-pink-800',
    SICK: 'bg-red-100 text-red-800',
    QUARANTINE: 'bg-yellow-100 text-yellow-800',
    SOLD: 'bg-purple-100 text-purple-800',
    DEAD: 'bg-slate-800 text-white',
    CALF: 'bg-orange-100 text-orange-800',
    HEIFER: 'bg-indigo-100 text-indigo-800',
    BULL: 'bg-red-100 text-red-800',
  };

  return map[String(status || '').toUpperCase()] || 'bg-gray-100 text-gray-800';
}

export const animalAdapter = {
  toViewModel(animal: Animal): AnimalViewModel {
    return {
      ...animal,
      displayAge: calculateAge(animal.dateOfBirth),
      lactationDisplay: animal.lactationNumber ? `Lactation ${animal.lactationNumber}` : 'N/A',
      statusBadgeVariant: getStatusBadgeVariant(animal.status),
      statusLabel: getStatusLabel(animal.status),
    };
  },

  toViewModelList(animals: Animal[]): AnimalViewModel[] {
    return animals.map((a) => animalAdapter.toViewModel(a));
  },
};
