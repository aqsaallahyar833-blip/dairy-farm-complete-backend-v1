import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

export interface HealthDbState {
  events: any[];
  treatments: any[];
  vaccinations: any[];
  quarantines: any[];
  auditLogs: any[];
}

const DATA_DIR = path.join(process.cwd(), 'server', 'data');
const HEALTH_FILE = path.join(DATA_DIR, 'mysql_health.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function getInitialHealthState(): HealthDbState {
  return {
    events: [
      {
        id: 'health-0001',
        animalId: 'animal-0001',
        animalTag: 'HF-027',
        animalName: 'Bella',
        date: '2024-05-14',
        eventDate: '2024-05-14',
        eventType: 'Disease',
        problem: 'Mastitis',
        diagnosis: 'Clinical acute coliform mastitis in right hind quarter',
        symptoms: 'Swollen right hind quarter, clots in strip cup, mild fever (103°F)',
        severity: 'Moderate',
        veterinarian: 'Dr. Imran Qureshi',
        status: 'In Treatment',
        cost: 4500,
        remarks: 'Withhold milk from sales until 21 May 2024.',
      },
      {
        id: 'health-0002',
        animalId: 'animal-0001',
        animalTag: 'HF-027',
        animalName: 'Bella',
        date: '2024-04-02',
        eventDate: '2024-04-02',
        eventType: 'Disease',
        problem: 'Tick Fever',
        diagnosis: 'Babesiosis / Tick-borne fever',
        symptoms: 'High fever 105.4°F, lethargy, red urine',
        severity: 'Severe',
        veterinarian: 'Dr. Imran Qureshi',
        status: 'Recovered',
        cost: 3200,
      },
      {
        id: 'health-0003',
        animalId: 'animal-0001',
        animalTag: 'HF-027',
        animalName: 'Bella',
        date: '2024-02-15',
        eventDate: '2024-02-15',
        eventType: 'Deworming',
        problem: 'Internal Parasites',
        diagnosis: 'Gastrointestinal nematodes',
        symptoms: 'Dull coat, slight weight drop',
        severity: 'Mild',
        veterinarian: 'Dr. Imran Qureshi',
        status: 'Recovered',
        cost: 1200,
      },
      {
        id: 'health-0004',
        animalId: 'animal-0024',
        animalTag: 'HF-029',
        animalName: 'Penny',
        date: '2024-05-11',
        eventDate: '2024-05-11',
        eventType: 'Disease',
        problem: 'Hypocalcemia post-calving',
        diagnosis: 'Mild hypocalcemia and muscle weakness',
        symptoms: 'Mild muscle trembling post-calving',
        severity: 'Moderate',
        veterinarian: 'Dr. Imran Qureshi',
        status: 'In Treatment',
        cost: 3800,
      },
      {
        id: 'health-0005',
        animalId: 'animal-0024',
        animalTag: 'HF-038',
        animalName: 'Tina',
        date: '2024-05-09',
        eventDate: '2024-05-09',
        eventType: 'Disease',
        problem: 'Tick Fever',
        diagnosis: 'Theileriosis / Tick-borne infection',
        symptoms: 'Fever 104.8°F, enlarged prescapular lymph nodes, anorexia',
        severity: 'Severe',
        veterinarian: 'Dr. Imran Qureshi',
        status: 'In Treatment',
        cost: 5200,
      },
      {
        id: 'health-0006',
        animalId: 'animal-0017',
        animalTag: 'HF-110',
        animalName: 'Flora',
        date: '2024-05-13',
        eventDate: '2024-05-13',
        eventType: 'Disease',
        problem: 'Milk Drop / Acidosis',
        diagnosis: 'Subacute ruminal acidosis (SARA)',
        symptoms: 'Milk reduced by 3.2L, slight rumen hypomotility',
        severity: 'Mild',
        veterinarian: 'Dr. Imran Qureshi',
        status: 'In Treatment',
        cost: 1500,
      },
      {
        id: 'health-0007',
        animalId: 'animal-0004',
        animalTag: 'HF-021',
        animalName: 'Lucy',
        date: '2024-05-12',
        eventDate: '2024-05-12',
        eventType: 'Injury',
        problem: 'Lameness',
        diagnosis: 'Interdigital necrobacillosis / Foot rot',
        symptoms: 'Swelling of interdigital space, moderate limp on right hind claw',
        severity: 'Moderate',
        veterinarian: 'Dr. Imran Qureshi',
        status: 'In Treatment',
        cost: 2400,
      },
      {
        id: 'health-0008',
        animalId: 'animal-0015',
        animalTag: 'HF-102',
        animalName: 'Stella',
        date: '2024-01-05',
        eventDate: '2024-01-05',
        eventType: 'Emergency',
        problem: 'Milk Fever',
        diagnosis: 'Acute Periparturient Hypocalcemia',
        symptoms: 'Sternal recumbency post-calving, cold extremities',
        severity: 'Critical',
        veterinarian: 'Dr. Imran Qureshi',
        status: 'Recovered',
        cost: 2800,
      },
    ],
    treatments: [
      {
        id: 'treatment-0001',
        animalId: 'animal-0024',
        animalTag: 'HF-038',
        animalName: 'Tina',
        date: '2024-05-09',
        startDate: '2024-05-09',
        diagnosis: 'Tick Fever',
        medicineId: 'med-0005',
        medicineName: 'Oxytetracycline 20% LA',
        medicineBatch: 'OXY-LA-551',
        dose: '25 ml',
        dosage: '25 ml deep IM',
        route: 'Intramuscular',
        durationDays: 3,
        milkWithdrawalDays: 10,
        meatWithdrawalDays: 21,
        veterinarian: 'Dr. Imran Qureshi',
        status: 'In Treatment',
        withdrawalStatus: 'Active Hold',
        milkUsableDate: '2024-05-19',
        isWithdrawalActive: true,
        treatmentCost: 3100,
        remarks: 'Active antimicrobial milk withdrawal: Do Not Milk Into Bulk Tank.',
      },
      {
        id: 'treatment-0002',
        animalId: 'animal-0001',
        animalTag: 'HF-027',
        animalName: 'Bella',
        date: '2024-05-13',
        startDate: '2024-05-13',
        diagnosis: 'Subclinical Ketosis',
        medicineId: 'med-0009',
        medicineName: 'Multivitamin + AD3E Injectable',
        medicineBatch: 'MULTI-NOR-77',
        dose: '20 ml',
        dosage: '20 ml IM',
        route: 'Intramuscular',
        durationDays: 3,
        milkWithdrawalDays: 0,
        meatWithdrawalDays: 0,
        veterinarian: 'Dr. Imran Qureshi',
        status: 'In Treatment',
        withdrawalStatus: 'Not Applicable',
        milkUsableDate: '2024-05-13',
        isWithdrawalActive: false,
        treatmentCost: 1650,
      },
      {
        id: 'treatment-0003',
        animalId: 'animal-0024',
        animalTag: 'HF-029',
        animalName: 'Penny',
        date: '2024-05-12',
        startDate: '2024-05-12',
        diagnosis: 'Post-Calving Hypocalcemia Recovery',
        medicineId: 'med-0007',
        medicineName: 'Calcium Borogluconate 25%',
        medicineBatch: 'CAL-BOR-88',
        dose: '450 ml',
        dosage: '450 ml slow IV',
        route: 'Intravenous',
        durationDays: 2,
        milkWithdrawalDays: 0,
        meatWithdrawalDays: 0,
        veterinarian: 'Dr. Imran Qureshi',
        status: 'In Treatment',
        withdrawalStatus: 'Not Applicable',
        milkUsableDate: '2024-05-12',
        isWithdrawalActive: false,
        treatmentCost: 750,
      },
      {
        id: 'treatment-0004',
        animalId: 'animal-0017',
        animalTag: 'HF-110',
        animalName: 'Flora',
        date: '2024-05-13',
        startDate: '2024-05-13',
        diagnosis: 'Subacute Ruminal Acidosis (SARA)',
        medicineId: 'med-0010',
        medicineName: 'Ketoprofen 10%',
        medicineBatch: 'KETO-MER-12',
        dose: '15 ml',
        dosage: '15 ml deep IM',
        route: 'Intramuscular',
        durationDays: 2,
        milkWithdrawalDays: 0,
        meatWithdrawalDays: 4,
        veterinarian: 'Dr. Imran Qureshi',
        status: 'In Treatment',
        withdrawalStatus: 'Not Applicable',
        milkUsableDate: '2024-05-13',
        isWithdrawalActive: false,
        treatmentCost: 1950,
      },
      {
        id: 'treatment-0005',
        animalId: 'animal-0004',
        animalTag: 'HF-021',
        animalName: 'Lucy',
        date: '2024-05-12',
        startDate: '2024-05-12',
        diagnosis: 'Interdigital Dermatitis & Hoof Care',
        medicineId: 'med-0006',
        medicineName: 'Ceftiofur Sodium',
        medicineBatch: 'CEFT-098',
        dose: '10 ml',
        dosage: '10 ml subcutaneous',
        route: 'Subcutaneous',
        durationDays: 3,
        milkWithdrawalDays: 0,
        meatWithdrawalDays: 4,
        veterinarian: 'Dr. Imran Qureshi',
        status: 'In Treatment',
        withdrawalStatus: 'Not Applicable',
        milkUsableDate: '2024-05-12',
        isWithdrawalActive: false,
        treatmentCost: 1450,
      },
    ],
    vaccinations: [
      {
        id: 'vac-001',
        animalTag: 'HF-027',
        vaccineName: 'FMD Oil Adjuvant Vaccine',
        targetDisease: 'Foot & Mouth Disease',
        date: '2024-01-10',
        nextDueDate: '2024-05-21',
        batchNumber: 'FMD-VRI-2024',
        manufacturer: 'VRI Lahore',
        veterinarian: 'Vet Team',
        status: 'Due Soon',
        dose: '2 ml subcutaneous',
      },
      {
        id: 'vac-002',
        groupName: 'High Milking Group',
        vaccineName: 'FMD Oil Adjuvant Vaccine',
        targetDisease: 'Foot & Mouth Disease',
        date: '2024-01-10',
        nextDueDate: '2024-05-21',
        batchNumber: 'FMD-VRI-2024',
        veterinarian: 'Dr. Imran Qureshi',
        status: 'Due Soon',
        dose: '2 ml subcutaneous',
      },
      {
        id: 'vac-003',
        groupName: 'Calves',
        vaccineName: 'Blackleg Vaccine',
        targetDisease: 'Blackleg (Clostridial)',
        date: '2024-03-01',
        nextDueDate: '2024-09-01',
        batchNumber: 'BL-092-PK',
        veterinarian: 'Dr. Imran Qureshi',
        status: 'Completed',
        dose: '2 ml IM',
      },
      {
        id: 'vac-004',
        groupName: 'Replacement Heifers',
        vaccineName: 'Brucellosis S19 Strain',
        targetDisease: 'Brucellosis',
        date: '2024-02-15',
        nextDueDate: '2025-02-15',
        batchNumber: 'BRU-441-VRI',
        veterinarian: 'Dr. Imran Qureshi',
        status: 'Completed',
        dose: '2 ml subcutaneous',
      },
      {
        id: 'vac-005',
        animalTag: 'HF-031',
        vaccineName: 'Hemorrhagic Septicemia (HS) Alum',
        targetDisease: 'Hemorrhagic Septicemia (HS)',
        date: '2023-11-20',
        nextDueDate: '2024-05-14',
        batchNumber: 'HS-ALUM-88',
        veterinarian: 'Dr. Imran Qureshi',
        status: 'Due Today',
        dose: '3 ml subcutaneous',
      },
      {
        id: 'vac-006',
        animalTag: 'HF-014',
        vaccineName: 'Hemorrhagic Septicemia (HS) Alum',
        targetDisease: 'Hemorrhagic Septicemia (HS)',
        date: '2023-11-20',
        nextDueDate: '2024-05-14',
        batchNumber: 'HS-ALUM-88',
        veterinarian: 'Dr. Imran Qureshi',
        status: 'Due Today',
        dose: '3 ml subcutaneous',
      },
      {
        id: 'vac-007',
        animalTag: 'HF-021',
        vaccineName: 'Anthrax Spore Vaccine',
        targetDisease: 'Anthrax',
        date: '2023-08-10',
        nextDueDate: '2024-08-10',
        batchNumber: 'ANT-91-LHR',
        veterinarian: 'Vet Team',
        status: 'Completed',
        dose: '1 ml subcutaneous',
      },
      {
        id: 'vac-008',
        animalTag: 'HF-033',
        vaccineName: 'FMD Booster',
        targetDisease: 'Foot & Mouth Disease',
        date: '2024-01-10',
        nextDueDate: '2024-05-21',
        batchNumber: 'FMD-VRI-2024',
        veterinarian: 'Dr. Imran Qureshi',
        status: 'Due Soon',
        dose: '2 ml subcutaneous',
      },
      {
        id: 'vac-009',
        animalTag: 'HF-045',
        vaccineName: 'Rotavirus-Coronavirus Calving Prep',
        targetDisease: 'Calf Scours Prevention',
        date: '2024-04-10',
        nextDueDate: '2025-04-10',
        batchNumber: 'SCOUR-81',
        veterinarian: 'Dr. Imran Qureshi',
        status: 'Completed',
        dose: '2 ml IM',
      },
      {
        id: 'vac-010',
        animalTag: 'BULL-01',
        vaccineName: 'FMD Oil Adjuvant Vaccine',
        targetDisease: 'Foot & Mouth Disease',
        date: '2024-01-10',
        nextDueDate: '2024-05-21',
        batchNumber: 'FMD-VRI-2024',
        veterinarian: 'Vet Team',
        status: 'Due Soon',
        dose: '2 ml subcutaneous',
      },
      {
        id: 'vac-011',
        animalTag: 'HF-052',
        vaccineName: 'Clostridial 8-Way',
        targetDisease: 'Enterotoxemia & Blackleg',
        date: '2023-10-15',
        nextDueDate: '2024-05-01',
        batchNumber: 'CLOS-8W-01',
        veterinarian: 'Dr. Imran Qureshi',
        status: 'Overdue',
        dose: '5 ml subcutaneous',
      },
    ],
    quarantines: [],
    auditLogs: [],
  };
}

function readHealthDb(): HealthDbState {
  ensureDataDir();
  if (!fs.existsSync(HEALTH_FILE)) {
    const initial = getInitialHealthState();
    fs.writeFileSync(HEALTH_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
  try {
    return JSON.parse(fs.readFileSync(HEALTH_FILE, 'utf-8'));
  } catch {
    return getInitialHealthState();
  }
}

function writeHealthDb(state: HealthDbState) {
  ensureDataDir();
  fs.writeFileSync(HEALTH_FILE, JSON.stringify(state, null, 2), 'utf-8');
}

// GET /api/health/events
export async function handleGetHealthEvents(req: Request, res: Response) {
  try {
    const db = readHealthDb();
    const { animalId, eventType, severity } = req.query;
    let list = [...db.events];
    if (animalId) list = list.filter((e) => e.animalId === animalId || e.animalTag === animalId);
    if (eventType) list = list.filter((e) => e.eventType === eventType);
    if (severity) list = list.filter((e) => e.severity === severity);
    return res.json({ success: true, count: list.length, data: list });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

// POST /api/health/events
export async function handlePostHealthEvent(req: Request, res: Response) {
  try {
    const db = readHealthDb();
    const payload = req.body;
    if (!payload.animalId && !payload.animalTag) {
      return res.status(400).json({ success: false, error: 'Animal ID or Ear Tag is required.' });
    }
    const newEvent = {
      id: `health-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      animalId: payload.animalId,
      animalTag: payload.animalTag || payload.animalId,
      date: payload.date || payload.eventDate || new Date().toISOString().split('T')[0],
      eventDate: payload.date || payload.eventDate || new Date().toISOString().split('T')[0],
      eventType: payload.eventType || 'Disease',
      problem: payload.problem || payload.diagnosis || 'Clinical Problem',
      diagnosis: payload.diagnosis || payload.problem || 'Preliminary Diagnosis',
      symptoms: payload.symptoms || '',
      severity: payload.severity || 'Moderate',
      temperature: payload.temperature,
      veterinarian: payload.veterinarian || 'Dr. Imran Qureshi',
      status: payload.status || 'Reported',
      cost: payload.cost || 0,
      notes: payload.notes || '',
      createdAt: new Date().toISOString(),
    };
    db.events.unshift(newEvent);
    writeHealthDb(db);
    return res.status(201).json({ success: true, data: newEvent, message: 'Health event logged' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

// GET /api/treatments
export async function handleGetTreatments(req: Request, res: Response) {
  try {
    const db = readHealthDb();
    const { animalId, status, isWithdrawalActive } = req.query;
    let list = [...db.treatments];
    if (animalId) list = list.filter((t) => t.animalId === animalId || t.animalTag === animalId);
    if (status) list = list.filter((t) => t.status === status);
    if (isWithdrawalActive !== undefined) {
      list = list.filter((t) => Boolean(t.isWithdrawalActive) === (isWithdrawalActive === 'true'));
    }
    return res.json({ success: true, count: list.length, data: list });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

// POST /api/treatments
export async function handlePostTreatment(req: Request, res: Response) {
  try {
    const db = readHealthDb();
    const payload = req.body;
    if (!payload.animalId) return res.status(400).json({ success: false, error: 'Animal ID is required' });

    const startDate = payload.startDate || payload.date || new Date().toISOString().split('T')[0];
    const durationDays = Number(payload.durationDays) || 3;
    const milkWithdrawalDays = Math.max(0, Number(payload.milkWithdrawalDays) || 0);

    // Calculate milk hold date
    const d = new Date(startDate);
    d.setDate(d.getDate() + milkWithdrawalDays);
    const milkUsableDate = payload.milkUsableDate || d.toISOString().split('T')[0];
    const isWithdrawalActive = milkWithdrawalDays > 0;

    const newTreatment = {
      id: `treatment-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      animalId: payload.animalId,
      animalTag: payload.animalTag || payload.animalId,
      date: startDate,
      startDate,
      diagnosis: payload.diagnosis || payload.problem || 'Clinical Care',
      medicineId: payload.medicineId || 'med-0005',
      medicineName: payload.medicineName || 'Veterinary Medication',
      medicineBatch: payload.medicineBatch || 'BATCH-001',
      dose: payload.dose || payload.dosage || '25 ml',
      dosage: payload.dosage || payload.dose || '25 ml deep IM',
      route: payload.route || 'Intramuscular',
      durationDays,
      milkWithdrawalDays,
      meatWithdrawalDays: payload.meatWithdrawalDays || 14,
      veterinarian: payload.veterinarian || 'Dr. Imran Qureshi',
      status: payload.status || 'In Treatment',
      withdrawalStatus: isWithdrawalActive ? 'Active Hold' : 'Not Applicable',
      milkUsableDate,
      isWithdrawalActive,
      treatmentCost: payload.treatmentCost || 2500,
      notes: payload.notes || '',
      createdAt: new Date().toISOString(),
    };

    db.treatments.unshift(newTreatment);
    writeHealthDb(db);
    return res.status(201).json({ success: true, data: newTreatment, message: 'Treatment registered' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

// POST /api/treatments/:id/complete
export async function handleCompleteTreatment(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { override, overrideReason, authorizedBy } = req.body || {};
    const db = readHealthDb();
    const t = db.treatments.find((item) => item.id === id);
    if (!t) return res.status(404).json({ success: false, error: `Treatment ${id} not found` });

    t.status = 'Completed';
    t.isWithdrawalActive = false;
    t.withdrawalStatus = override ? 'Override' : 'Cleared';
    t.completedAt = new Date().toISOString();
    t.completedBy = authorizedBy || 'Dr. Imran Qureshi';
    if (overrideReason) t.overrideReason = overrideReason;

    writeHealthDb(db);
    return res.json({ success: true, data: t, message: 'Treatment marked completed and milk hold cleared' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

// GET /api/health/withdrawals/active
export async function handleGetActiveWithdrawals(_req: Request, res: Response) {
  try {
    const db = readHealthDb();
    const active = db.treatments.filter((t) => t.isWithdrawalActive && t.status !== 'Completed');
    return res.json({ success: true, count: active.length, data: active });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

// GET /api/vaccinations
export async function handleGetVaccinations(_req: Request, res: Response) {
  try {
    const db = readHealthDb();
    return res.json({ success: true, count: db.vaccinations.length, data: db.vaccinations });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

// POST /api/vaccinations
export async function handlePostVaccination(req: Request, res: Response) {
  try {
    const db = readHealthDb();
    const payload = req.body;
    if (!payload.vaccineName) return res.status(400).json({ success: false, error: 'Vaccine name is required' });

    const date = payload.date || payload.vaccinationDate || new Date().toISOString().split('T')[0];
    const d = new Date(date);
    d.setMonth(d.getMonth() + 6);
    const nextDueDate = payload.nextDueDate || d.toISOString().split('T')[0];

    const newVac = {
      id: `vac-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      animalTag: payload.animalTag,
      groupName: payload.groupName,
      vaccineName: payload.vaccineName,
      targetDisease: payload.targetDisease || 'Herd Immunity',
      date,
      vaccinationDate: date,
      nextDueDate,
      batchNumber: payload.batchNumber || 'VAC-PK-2024',
      manufacturer: payload.manufacturer || 'Veterinary Research Institute',
      veterinarian: payload.veterinarian || 'Dr. Imran Qureshi',
      status: payload.status || 'Completed',
      dose: payload.dose || payload.dosage || '2 ml subcutaneous',
      createdAt: new Date().toISOString(),
    };

    db.vaccinations.unshift(newVac);
    writeHealthDb(db);
    return res.status(201).json({ success: true, data: newVac, message: 'Vaccination record registered' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

// GET /api/quarantine
export async function handleGetQuarantine(_req: Request, res: Response) {
  try {
    const db = readHealthDb();
    return res.json({ success: true, count: db.quarantines.length, data: db.quarantines });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

// POST /api/quarantine
export async function handlePostQuarantine(req: Request, res: Response) {
  try {
    const db = readHealthDb();
    const payload = req.body;
    if (!payload.animalId && !payload.animalTag) {
      return res.status(400).json({ success: false, error: 'Animal ID or Tag is required' });
    }

    const newQ = {
      id: `quar-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      animalId: payload.animalId,
      animalTag: payload.animalTag || payload.animalId,
      reason: payload.reason || 'Clinical Biocontainment & Observation',
      startDate: payload.startDate || new Date().toISOString().split('T')[0],
      expectedReleaseDate: payload.expectedReleaseDate || '2024-05-28',
      isolationLocation: payload.isolationLocation || 'Isolation Shed - Pen 1',
      responsiblePerson: payload.responsiblePerson || 'Dr. Imran Qureshi',
      status: 'Active',
      notes: payload.notes || '',
      createdAt: new Date().toISOString(),
    };

    db.quarantines.unshift(newQ);
    writeHealthDb(db);
    return res.status(201).json({ success: true, data: newQ, message: 'Animal quarantined' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

// GET /api/health/dashboard
export async function handleGetHealthDashboard(_req: Request, res: Response) {
  try {
    const db = readHealthDb();
    const activeWithdrawals = db.treatments.filter((t) => t.isWithdrawalActive && t.status !== 'Completed');
    return res.json({
      success: true,
      data: {
        healthEventsCount: db.events.length,
        activeTreatmentsCount: db.treatments.filter((t) => t.status === 'In Treatment').length,
        vaccinationScheduleCount: db.vaccinations.length,
        quarantineCount: db.quarantines.filter((q) => q.status === 'Active').length,
        pharmacyCount: 10,
        activeMilkWithdrawalCount: activeWithdrawals.length,
        overdueVaccinationsCount: db.vaccinations.filter((v) => v.status === 'Overdue').length,
        expiringMedicinesCount: 1,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
