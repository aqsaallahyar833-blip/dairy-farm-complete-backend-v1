export * from './animalIdGenerator';
export * from './milkCalculationService';
export * from './financialCalculationService';
export * from './animalCalculationService';
export * from './inventoryCalculationService';
export * from './healthCalculationService';

import { generateNextAnimalId, isAnimalIdUnique, parseAnimalIdNumber, formatAnimalId } from './animalIdGenerator';
import { milkCalculationService } from './milkCalculationService';
import { financialCalculationService } from './financialCalculationService';
import { animalCalculationService } from './animalCalculationService';
import { inventoryCalculationService } from './inventoryCalculationService';
import { healthCalculationService } from './healthCalculationService';

export const calculationService = {
  animalId: {
    generateNext: generateNextAnimalId,
    isUnique: isAnimalIdUnique,
    parseNumber: parseAnimalIdNumber,
    format: formatAnimalId,
  },
  milk: milkCalculationService,
  finance: financialCalculationService,
  animal: animalCalculationService,
  inventory: inventoryCalculationService,
  health: healthCalculationService,
};

export default calculationService;
