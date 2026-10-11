import { MilkRecord } from '../../../types';

// Deterministic seed generation for 14 days of historical milk records
// Base date: 2024-05-14
const dates = [
  '2024-05-01', '2024-05-02', '2024-05-03', '2024-05-04', '2024-05-05',
  '2024-05-06', '2024-05-07', '2024-05-08', '2024-05-09', '2024-05-10',
  '2024-05-11', '2024-05-12', '2024-05-13', '2024-05-14'
];

interface CowMilkConfig {
  animalId: string;
  tag: string;
  baseMorning: number;
  baseEvening: number;
  baseFat: number;
  baseSnf: number;
}

const lactatingCows: CowMilkConfig[] = [
  { animalId: 'animal-0001', tag: 'AN-001', baseMorning: 14.5, baseEvening: 14.2, baseFat: 3.8, baseSnf: 8.9 },
  { animalId: 'animal-0002', tag: 'AN-002', baseMorning: 13.8, baseEvening: 13.6, baseFat: 3.7, baseSnf: 8.8 },
  { animalId: 'animal-0003', tag: 'AN-003', baseMorning: 13.1, baseEvening: 13.0, baseFat: 3.9, baseSnf: 8.7 },
  { animalId: 'animal-0004', tag: 'AN-004', baseMorning: 12.7, baseEvening: 12.6, baseFat: 3.6, baseSnf: 8.6 },
  { animalId: 'animal-0005', tag: 'AN-005', baseMorning: 12.5, baseEvening: 12.3, baseFat: 3.8, baseSnf: 8.8 },
  { animalId: 'animal-0006', tag: 'AN-006', baseMorning: 10.2, baseEvening: 10.0, baseFat: 4.0, baseSnf: 8.9 },
  { animalId: 'animal-0007', tag: 'AN-007', baseMorning: 15.0, baseEvening: 14.8, baseFat: 3.9, baseSnf: 8.8 },
  { animalId: 'animal-0008', tag: 'AN-008', baseMorning: 11.2, baseEvening: 10.8, baseFat: 4.8, baseSnf: 9.1 },
  { animalId: 'animal-0009', tag: 'AN-009', baseMorning: 11.8, baseEvening: 11.7, baseFat: 3.7, baseSnf: 8.6 },
  { animalId: 'animal-0010', tag: 'AN-010', baseMorning: 14.2, baseEvening: 13.9, baseFat: 3.8, baseSnf: 8.7 },
  { animalId: 'animal-0011', tag: 'AN-011', baseMorning: 14.7, baseEvening: 14.5, baseFat: 3.9, baseSnf: 8.8 },
  { animalId: 'animal-0012', tag: 'AN-012', baseMorning: 13.5, baseEvening: 13.3, baseFat: 3.8, baseSnf: 8.7 },
  { animalId: 'animal-0013', tag: 'AN-013', baseMorning: 12.2, baseEvening: 12.0, baseFat: 3.7, baseSnf: 8.6 },
  { animalId: 'animal-0014', tag: 'AN-014', baseMorning: 10.0, baseEvening: 9.8, baseFat: 4.7, baseSnf: 9.0 },
  { animalId: 'animal-0015', tag: 'AN-015', baseMorning: 12.1, baseEvening: 11.9, baseFat: 3.8, baseSnf: 8.7 },
  { animalId: 'animal-0016', tag: 'AN-016', baseMorning: 11.0, baseEvening: 10.8, baseFat: 3.9, baseSnf: 8.8 },
];

export const mockMilkRecords: MilkRecord[] = [];

let recordCount = 1;

dates.forEach((date, dayIdx) => {
  lactatingCows.forEach((cow, cowIdx) => {
    // Deterministic slight day-to-day variance based on trigonometric hash
    const deltaM = Math.round(Math.sin((dayIdx * 3 + cowIdx) * 0.7) * 4) / 10;
    const deltaE = Math.round(Math.cos((dayIdx * 2 + cowIdx) * 0.5) * 4) / 10;

    let morningQty = Math.round((cow.baseMorning + deltaM) * 10) / 10;
    let eveningQty = Math.round((cow.baseEvening + deltaE) * 10) / 10;

    // Specific business condition: Flora (AN-013 / 013) milk dropped on 13th & 14th
    if ((cow.tag === 'AN-013' || cow.tag === '013' || cow.animalId === 'animal-0013') && dayIdx >= 12) {
      morningQty = 10.5;
      eveningQty = 10.5;
    }

    const idM = `milk-${String(recordCount++).padStart(6, '0')}`;
    mockMilkRecords.push({
      id: idM,
      animalId: cow.animalId,
      animalTag: cow.tag,
      animalName: undefined,
      farmId: 'farm-001',
      date,
      session: 'Morning',
      quantityLiters: morningQty,
      pricePerLiter: 150,
      totalAmount: Math.round(morningQty * 150),
      qualityStatus: 'Accepted',
      remarks: 'Regular milking',
    });

    const idE = `milk-${String(recordCount++).padStart(6, '0')}`;
    mockMilkRecords.push({
      id: idE,
      animalId: cow.animalId,
      animalTag: cow.tag,
      animalName: undefined,
      farmId: 'farm-001',
      date,
      session: 'Evening',
      quantityLiters: eveningQty,
      pricePerLiter: 150,
      totalAmount: Math.round(eveningQty * 150),
      qualityStatus: 'Accepted',
      remarks: 'Regular milking',
    });
  });
});
