import {
  generateNextAnimalId,
  isAnimalIdUnique,
  parseAnimalIdNumber,
  formatAnimalId,
} from '../src/services/calculations/animalIdGenerator';
import { milkCalculationService } from '../src/services/calculations/milkCalculationService';
import { financialCalculationService } from '../src/services/calculations/financialCalculationService';
import { MilkRecord } from '../src/types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASSED: ${message}`);
}

console.log('--- RUNNING DAIRY FARM AUTOMATED TEST CASES ---\n');

// Test 1: Animal ID Generation
// Given: ['AN-001', 'AN-002', 'AN-009'] -> Expected: AN-010
const test1Animals = [{ animalId: 'AN-001' }, { animalId: 'AN-002' }, { animalId: 'AN-009' }];
const nextId1 = generateNextAnimalId(test1Animals);
assert(nextId1 === 'AN-010', `Test 1: Animal ID Generation expected AN-010, got ${nextId1}`);

// Test 2: Animal ID 3-digit rollover
// Given: ['AN-099'] -> Expected: AN-100
const test2Animals = [{ animalId: 'AN-099' }];
const nextId2 = generateNextAnimalId(test2Animals);
assert(nextId2 === 'AN-100', `Test 2: Animal ID 3-digit rollover expected AN-100, got ${nextId2}`);

// Test 3: Animal ID with gap
// Given: ['AN-001', 'AN-002', 'AN-100'] -> Expected: AN-101
const test3Animals = [{ animalId: 'AN-001' }, { animalId: 'AN-002' }, { animalId: 'AN-100' }];
const nextId3 = generateNextAnimalId(test3Animals);
assert(nextId3 === 'AN-101', `Test 3: Animal ID with gap expected AN-101, got ${nextId3}`);

// Test 3b: Specific User Example: Last is AN-025 -> next is AN-026
const test3bAnimals = [{ animalId: 'AN-025' }];
const nextId3b = generateNextAnimalId(test3bAnimals);
assert(nextId3b === 'AN-026', `Test 3b: Last AN-025 expected AN-026, got ${nextId3b}`);

// Test 4: Milk Daily Total
// Morning = 10, Evening = 8, Third = 2 -> Expected Total = 20
const sampleRecords: MilkRecord[] = [
  { id: '1', farmId: 'f1', animalId: 'a1', date: '2024-05-14', session: 'Morning', quantityLiters: 10, qualityStatus: 'Accepted' },
  { id: '2', farmId: 'f1', animalId: 'a1', date: '2024-05-14', session: 'Evening', quantityLiters: 8, qualityStatus: 'Accepted' },
  { id: '3', farmId: 'f1', animalId: 'a1', date: '2024-05-14', session: 'Third', quantityLiters: 2, qualityStatus: 'Accepted' },
];
const milkTotal = milkCalculationService.calculateDailyMilk(sampleRecords);
assert(milkTotal.total === 20, `Test 4: Milk Daily Total expected 20, got ${milkTotal.total}`);
assert(milkTotal.morning === 10 && milkTotal.evening === 8 && milkTotal.third === 2, 'Test 4b: Session breakdown matches');

// Test 5: Profit Calculation
// Revenue = 100,000, Expenses = 70,000 -> Expected Profit = 30,000
const pnl1 = financialCalculationService.calculateProfitAndLoss(
  [{ id: 'i1', farmId: 'f1', date: '2024-05-14', category: 'Milk Sales', amount: 100000, customerName: 'Nestle', paymentMethod: 'Cash', description: 'Milk' }],
  [{ id: 'e1', farmId: 'f1', date: '2024-05-14', category: 'Feed', amount: 70000, payee: 'Supplier', paymentMethod: 'Cash', description: 'Silage' }]
);
assert(pnl1.isProfit === true, 'Test 5: isProfit is true');
assert(pnl1.isLoss === false, 'Test 5: isLoss is false');
assert(pnl1.profitAmount === 30000, `Test 5: Expected profit 30000, got ${pnl1.profitAmount}`);
assert(pnl1.netProfitOrLoss === 30000, 'Test 5: netProfitOrLoss is 30000');

// Test 6: Loss Calculation
// Revenue = 100,000, Expenses = 120,000 -> Expected Loss = 20,000
const pnl2 = financialCalculationService.calculateProfitAndLoss(
  [{ id: 'i1', farmId: 'f1', date: '2024-05-14', category: 'Milk Sales', amount: 100000, customerName: 'Nestle', paymentMethod: 'Cash', description: 'Milk' }],
  [{ id: 'e1', farmId: 'f1', date: '2024-05-14', category: 'Feed', amount: 120000, payee: 'Supplier', paymentMethod: 'Cash', description: 'Silage' }]
);
assert(pnl2.isProfit === false, 'Test 6: isProfit is false');
assert(pnl2.isLoss === true, 'Test 6: isLoss is true');
assert(pnl2.lossAmount === 20000, `Test 6: Expected loss 20000, got ${pnl2.lossAmount}`);
assert(pnl2.netProfitOrLoss === -20000, 'Test 6: netProfitOrLoss is -20000');

// Test 7: Cost Per Liter
// Expenses = 50,000, Milk = 2,000 -> Expected Cost Per Liter = 25
const costPerLiter = financialCalculationService.calculateCostPerLiter(50000, 2000);
assert(costPerLiter === 25, `Test 7: Expected cost per liter 25, got ${costPerLiter}`);

// Test 8: Photo Validation Helper
function validateAnimalPhoto(file: { name: string; size: number; type: string }) {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Only JPG, PNG, and WEBP images are supported.' };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { valid: false, error: 'Photo size exceeds 5MB limit.' };
  }
  return { valid: true };
}

const jpgFile = { name: 'cow.jpg', size: 1024 * 500, type: 'image/jpeg' };
const txtFile = { name: 'notes.txt', size: 1024, type: 'text/plain' };
assert(validateAnimalPhoto(jpgFile).valid === true, 'Test 8a: Valid JPG accepted');
assert(validateAnimalPhoto(txtFile).valid === false, 'Test 8b: Invalid TXT rejected');

console.log('\n🌟 ALL 8 CORE TEST CASES VERIFIED SUCCESSFULLY!');
