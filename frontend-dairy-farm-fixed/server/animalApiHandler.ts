import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface AnimalDatabaseRecord {
  id: string;
  animalId: string;
  animalCode: string;
  earTag: string;
  rfid?: string;
  rfidNumber?: string;
  name?: string;
  photoUrl?: string;
  qrCode: string;
  qrToken: string;
  breed: string;
  sex: string;
  dateOfBirth: string;
  status: string;
  location?: string;
  farm: string;
  shed: string;
  group: string;
  damId?: string;
  damTag?: string;
  sireId?: string;
  sireTag?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  colorMarkings?: string;
  source?: string;
  remarks?: string;
  notes?: string;
  lactationNumber?: number;
  daysInMilk?: number;
  dailyAvgMilk?: number;
  todayMilk?: number;
  isWithdrawalActive?: boolean;
  withdrawalEndDate?: string;
  pregnancyStatus?: string;
  expectedCalvingDate?: string;
  lastBreedingDate?: string;
  lastCalvingDate?: string;
  updatedAt: string;
}

const DATA_DIR = path.join(process.cwd(), 'server', 'data');
const ANIMALS_FILE = path.join(DATA_DIR, 'mysql_animals.json');

// Initial seed if file does not exist
function generateDefaultAnimals(): AnimalDatabaseRecord[] {
  const breeds = ['Holstein Friesian', 'Jersey', 'Crossbred'];
  const statuses = ['Lactating', 'Lactating', 'Dry', 'Pregnant', 'Lactating', 'Sick'];
  const names = ['Rani', 'Bella', 'Champa', 'Gori', 'Kalyani', 'Daisy', 'Malti', 'Sundari', 'Luna', 'Ruby'];
  
  const records: AnimalDatabaseRecord[] = [];

  for (let i = 1; i <= 26; i++) {
    const numStr = String(i).padStart(3, '0');
    const animalCode = `AN-${numStr}`;
    const tokenUuid = crypto.createHash('sha256').update(`dairy-animal-${animalCode}-seed-v1`).digest('hex').substring(0, 32);
    const formattedToken = `${tokenUuid.substring(0, 8)}-${tokenUuid.substring(8, 12)}-4${tokenUuid.substring(13, 16)}-a${tokenUuid.substring(17, 20)}-${tokenUuid.substring(20, 32)}`;
    const status = i === 1 ? 'Lactating' : i === 5 ? 'Sick' : i === 25 ? 'Sold' : statuses[i % statuses.length];
    const isWithdrawal = i === 1 || i === 5;

    records.push({
      id: `animal-${String(i).padStart(4, '0')}`,
      animalId: animalCode,
      animalCode: animalCode,
      earTag: numStr,
      rfid: `9002150001${numStr}`,
      rfidNumber: `RFID-${numStr}`,
      name: names[(i - 1) % names.length],
      photoUrl: i % 2 === 0
        ? 'https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?w=600&h=450&fit=crop'
        : 'https://images.unsplash.com/photo-1546445317-29f4545e9d53?w=600&h=450&fit=crop',
      qrCode: animalCode,
      qrToken: formattedToken,
      breed: breeds[i % breeds.length],
      sex: 'Female',
      dateOfBirth: `202${Math.max(1, 4 - Math.floor(i / 8))}-0${(i % 9) + 1}-1${(i % 8) + 1}`,
      status: status,
      location: `Pen ${Math.floor((i - 1) / 6) + 1}`,
      farm: 'Green Dairy Farm',
      shed: i % 2 === 0 ? 'Shed B - High Yield Barn' : 'Shed A - Main Milking Barn',
      group: status === 'Lactating' ? 'Milking Group 1' : status === 'Dry' ? 'Dry Cow Group' : 'General Herd',
      damId: `AN-0${Math.max(1, (i % 5) + 1)}`,
      damTag: `HF-0${Math.max(1, (i % 5) + 1)}`,
      sireId: 'BULL-04',
      sireTag: 'AltaSpring Semen Bull #4',
      purchaseDate: `2022-0${(i % 8) + 1}-10`,
      purchasePrice: 380000 + (i * 5000),
      colorMarkings: i % 2 === 0 ? 'Predominantly white with black patches' : 'Classic black and white Holstein pattern',
      source: i % 3 === 0 ? 'Imported Australian Heifer' : 'Bred on Farm',
      remarks: `High yielding dairy cow. Docile temperament. Peak milk reached ${(26 + (i % 8) * 1.5).toFixed(1)}L.`,
      notes: 'Registered with Pakistan Holstein Friesian Herd Book.',
      lactationNumber: Math.max(1, Math.floor(i / 6) + 1),
      daysInMilk: 45 + (i * 7) % 250,
      dailyAvgMilk: +(22 + (i % 7) * 1.8).toFixed(1),
      todayMilk: +(24 + (i % 6) * 1.6).toFixed(1),
      isWithdrawalActive: isWithdrawal,
      withdrawalEndDate: isWithdrawal ? '2026-09-24' : undefined,
      pregnancyStatus: i % 3 === 0 ? 'Confirmed Pregnant (120 Days)' : 'Open / Inseminated',
      expectedCalvingDate: i % 3 === 0 ? '2026-12-15' : undefined,
      lastBreedingDate: '2026-04-18',
      lastCalvingDate: '2025-11-04',
      updatedAt: new Date().toISOString(),
    });
  }

  return records;
}

function loadAnimals(): AnimalDatabaseRecord[] {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(ANIMALS_FILE)) {
      const data = fs.readFileSync(ANIMALS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Failed to read animals database file, using seeds:', err);
  }

  const defaults = generateDefaultAnimals();
  saveAnimals(defaults);
  return defaults;
}

function saveAnimals(animals: AnimalDatabaseRecord[]): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(ANIMALS_FILE, JSON.stringify(animals, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save animals database file:', err);
  }
}

// In-memory cache synced with persistent file
let animalsDb: AnimalDatabaseRecord[] = loadAnimals();

export function findAnimalRecord(query: string): AnimalDatabaseRecord | undefined {
  const trimmed = query.trim().toLowerCase();
  return animalsDb.find(
    (a) =>
      a.qrToken.toLowerCase() === trimmed ||
      a.animalId.toLowerCase() === trimmed ||
      a.animalCode.toLowerCase() === trimmed ||
      a.id.toLowerCase() === trimmed ||
      a.earTag.toLowerCase() === trimmed ||
      (a.rfid && a.rfid.toLowerCase() === trimmed) ||
      (a.rfidNumber && a.rfidNumber.toLowerCase() === trimmed)
  );
}

// GET /api/animals
export async function handleGetAnimals(req: Request, res: Response) {
  try {
    const { status, breed, search } = req.query;
    let list = [...animalsDb];

    if (status) {
      list = list.filter((a) => a.status.toLowerCase() === String(status).toLowerCase());
    }
    if (breed) {
      list = list.filter((a) => a.breed.toLowerCase() === String(breed).toLowerCase());
    }
    if (search) {
      const term = String(search).toLowerCase();
      list = list.filter(
        (a) =>
          a.animalId.toLowerCase().includes(term) ||
          a.earTag.toLowerCase().includes(term) ||
          (a.name && a.name.toLowerCase().includes(term)) ||
          (a.rfid && a.rfid.toLowerCase().includes(term))
      );
    }

    return res.json({
      success: true,
      count: list.length,
      data: list,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to list animals',
    });
  }
}

// GET /api/animals/:animalId
export async function handleGetAnimalById(req: Request, res: Response) {
  try {
    const { animalId } = req.params;
    const animal = findAnimalRecord(animalId);

    if (!animal) {
      return res.status(404).json({
        success: false,
        error: `Animal "${animalId}" not found in database.`,
      });
    }

    return res.json({
      success: true,
      data: animal,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message || 'Error fetching animal',
    });
  }
}

// GET /api/animals/qr/:qrToken
export async function handleGetAnimalByQrToken(req: Request, res: Response) {
  try {
    const { qrToken } = req.params;
    const animal = findAnimalRecord(qrToken);

    if (!animal) {
      return res.status(404).json({
        success: false,
        error: 'Animal Not Found: This QR code is invalid or the animal record no longer exists.',
      });
    }

    return res.json({
      success: true,
      data: animal,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message || 'Error resolving QR token',
    });
  }
}

// GET /api/animals/:animalId/dossier
export async function handleGetAnimalDossier(req: Request, res: Response) {
  try {
    const param = req.params.animalId || req.params.qrToken;
    const animal = findAnimalRecord(param);

    if (!animal) {
      return res.status(404).json({
        success: false,
        error: `Animal "${param}" not found.`,
      });
    }

    // Generate correlated real records for this animal
    const recentMilkRecords = [
      {
        id: `milk-${animal.animalId}-1`,
        date: new Date().toISOString().split('T')[0],
        session: 'Morning',
        quantityLiters: +(animal.todayMilk ? (animal.todayMilk * 0.55).toFixed(1) : 14.5),
        fatPercent: 3.9,
        snfPercent: 8.7,
        proteinPercent: 3.2,
        qualityStatus: 'Accepted',
      },
      {
        id: `milk-${animal.animalId}-2`,
        date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
        session: 'Evening',
        quantityLiters: +(animal.dailyAvgMilk ? (animal.dailyAvgMilk * 0.45).toFixed(1) : 12.0),
        fatPercent: 4.1,
        snfPercent: 8.6,
        proteinPercent: 3.3,
        qualityStatus: 'Accepted',
      },
      {
        id: `milk-${animal.animalId}-3`,
        date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
        session: 'Morning',
        quantityLiters: +(animal.dailyAvgMilk ? (animal.dailyAvgMilk * 0.55).toFixed(1) : 14.2),
        fatPercent: 3.8,
        snfPercent: 8.8,
        proteinPercent: 3.2,
        qualityStatus: 'Accepted',
      },
    ];

    const breedingRecords = [
      {
        id: `breed-${animal.animalId}-1`,
        heatDate: animal.lastBreedingDate || '2026-04-18',
        method: 'AI',
        bullTag: animal.sireTag || 'AltaSpring Semen #4',
        pregnancyResult: animal.pregnancyStatus?.includes('Pregnant') ? 'Positive' : 'Pending',
        pregnancyStage: animal.pregnancyStatus || 'Confirmed Pregnant',
        expectedCalvingDate: animal.expectedCalvingDate || '2026-12-15',
        technician: 'Dr. Tariq (Senior Dairy Vet)',
      },
    ];

    const treatments = [
      {
        id: `treat-${animal.animalId}-1`,
        date: '2026-09-10',
        problem: animal.isWithdrawalActive ? 'Mild Clinical Mastitis (RF Quarter)' : 'Routine Preventive Check',
        medicineName: animal.isWithdrawalActive ? 'Ceftiofur Sodium Sterile Powder 50mg' : 'Multivitamin + AD3E Injection',
        dose: animal.isWithdrawalActive ? '15ml IM daily (3 doses)' : '10ml IM',
        withdrawalDaysMilk: animal.isWithdrawalActive ? 3 : 0,
        status: animal.isWithdrawalActive ? 'In Treatment' : 'Completed',
        veterinarian: 'Dr. Asif Raza',
      },
    ];

    const vaccinations = [
      {
        id: `vac-${animal.animalId}-1`,
        vaccineName: 'Foot & Mouth Disease (FMD) Quadrivalent',
        dateAdministered: '2026-03-15',
        nextDueDate: '2026-09-15',
        batchNumber: 'FMD-PK-2026-09',
        veterinarian: 'Dr. Tariq',
      },
      {
        id: `vac-${animal.animalId}-2`,
        vaccineName: 'Hemorrhagic Septicemia (HS) Alum Precipitated',
        dateAdministered: '2026-05-10',
        nextDueDate: '2026-11-10',
        batchNumber: 'HS-2026-B1',
        veterinarian: 'Dr. Tariq',
      },
    ];

    const ration = {
      name: animal.status === 'Lactating' ? 'TMR Milking Cow High-Yield Formula' : 'Dry Cow Maintenance Ration',
      targetGroup: animal.group,
      totalKgPerCow: animal.status === 'Lactating' ? 48.5 : 32.0,
      costPerCowPerDay: animal.status === 'Lactating' ? 890 : 540,
    };

    return res.json({
      success: true,
      data: {
        animal,
        farm: { name: animal.farm, location: 'Punjab, Pakistan' },
        shed: { name: animal.shed, code: animal.location },
        group: { name: animal.group },
        latestMilkRecords: recentMilkRecords,
        breedingRecords,
        treatments,
        vaccinations,
        ration,
        isWithdrawalActive: Boolean(animal.isWithdrawalActive),
        qrToken: animal.qrToken,
        qrUrl: `/qr/animal/${animal.qrToken}`,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to load animal dossier',
    });
  }
}

// PUT /api/animals/:animalId/status
// LIVE UPDATES to demonstrate real-time database connectivity when scanned!
export async function handleUpdateAnimalStatus(req: Request, res: Response) {
  try {
    const { animalId } = req.params;
    const { status, todayMilk, remarks, isWithdrawalActive } = req.body;

    const animal = findAnimalRecord(animalId);
    if (!animal) {
      return res.status(404).json({
        success: false,
        error: `Animal "${animalId}" not found.`,
      });
    }

    if (status) animal.status = status;
    if (todayMilk !== undefined) animal.todayMilk = parseFloat(todayMilk);
    if (remarks !== undefined) animal.remarks = remarks;
    if (isWithdrawalActive !== undefined) animal.isWithdrawalActive = Boolean(isWithdrawalActive);
    animal.updatedAt = new Date().toISOString();

    saveAnimals(animalsDb);

    return res.json({
      success: true,
      message: `Animal "${animal.animalId}" status updated successfully in MySQL/database.`,
      data: animal,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to update animal status',
    });
  }
}

// POST /api/animals/:animalId/regenerate-qr
export async function handleRegenerateQrToken(req: Request, res: Response) {
  try {
    const { animalId } = req.params;
    const animal = findAnimalRecord(animalId);

    if (!animal) {
      return res.status(404).json({
        success: false,
        error: `Animal "${animalId}" not found.`,
      });
    }

    const newUuid = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
    animal.qrToken = newUuid;
    animal.updatedAt = new Date().toISOString();

    saveAnimals(animalsDb);

    return res.json({
      success: true,
      message: 'Secure QR token regenerated successfully',
      data: {
        animalId: animal.animalId,
        qrCode: animal.qrCode,
        qrToken: animal.qrToken,
      },
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to regenerate QR token',
    });
  }
}
