import { Animal, AnimalStatus } from '../../types';

export interface AnimalAgeResult {
  years: number;
  months: number;
  days: number;
  totalMonths: number;
  display: string;
}

export interface HerdStatusCounts {
  totalActive: number;
  totalAllTime: number;
  lactating: number;
  dry: number;
  pregnant: number;
  open: number;
  heifers: number;
  calves: number;
  bulls: number;
  sick: number;
  quarantine: number;
  sold: number;
  dead: number;
}

export const animalCalculationService = {
  /**
   * Calculates animal age from Date of Birth to current/reference date
   */
  calculateAge(dateOfBirth: string, referenceDate: string = '2024-05-14'): AnimalAgeResult {
    if (!dateOfBirth) {
      return { years: 0, months: 0, days: 0, totalMonths: 0, display: 'Unknown' };
    }

    const birth = new Date(dateOfBirth);
    const now = new Date(referenceDate);

    if (isNaN(birth.getTime()) || isNaN(now.getTime())) {
      return { years: 0, months: 0, days: 0, totalMonths: 0, display: 'Unknown' };
    }

    let years = now.getFullYear() - birth.getFullYear();
    let months = now.getMonth() - birth.getMonth();
    let days = now.getDate() - birth.getDate();

    if (days < 0) {
      months -= 1;
      const prevMonthLastDay = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
      days += prevMonthLastDay;
    }

    if (months < 0) {
      years -= 1;
      months += 12;
    }

    const totalMonths = Math.max(0, years * 12 + months);

    let display = '';
    if (years > 0) {
      display = `${years}y ${months}m`;
    } else if (months > 0) {
      display = `${months}m ${days}d`;
    } else {
      display = `${Math.max(0, days)}d`;
    }

    return {
      years: Math.max(0, years),
      months: Math.max(0, months),
      days: Math.max(0, days),
      totalMonths,
      display,
    };
  },

  /**
   * Aggregates herd status counts:
   * Only active animals (excluding Sold and Dead) count towards total active herd!
   */
  calculateHerdStatusCounts(animals: Animal[]): HerdStatusCounts {
    let lactating = 0;
    let dry = 0;
    let pregnant = 0;
    let open = 0;
    let heifers = 0;
    let calves = 0;
    let bulls = 0;
    let sick = 0;
    let quarantine = 0;
    let sold = 0;
    let dead = 0;

    for (const a of animals) {
      switch (a.status) {
        case 'Lactating':
          lactating++;
          break;
        case 'Dry':
          dry++;
          break;
        case 'Pregnant':
          pregnant++;
          break;
        case 'Open':
          open++;
          break;
        case 'Heifer':
          heifers++;
          break;
        case 'Calf':
          calves++;
          break;
        case 'Sick':
          sick++;
          break;
        case 'Quarantine':
          quarantine++;
          break;
        case 'Sold':
          sold++;
          break;
        case 'Dead':
          dead++;
          break;
      }

      if (a.sex === 'Male' && a.status !== 'Calf' && a.status !== 'Sold' && a.status !== 'Dead') {
        bulls++;
      }
    }

    const totalActive = animals.filter(
      (a) => a.status !== 'Sold' && a.status !== 'Dead'
    ).length;

    return {
      totalActive,
      totalAllTime: animals.length,
      lactating,
      dry,
      pregnant,
      open,
      heifers,
      calves,
      bulls,
      sick,
      quarantine,
      sold,
      dead,
    };
  },
};
