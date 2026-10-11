import { mockStorage } from './mockStorage';
import { getInitialDatabase, MockDatabase } from './mockSeed';
import { mockMortalities } from './mockSeedData/feedFinanceData';
import { mockCalvings } from './mockSeedData/animalData';
import { mockBreedingRecords } from './mockSeedData/healthBreedingData';
import {
  mockWarehouses,
  mockVaccines,
  mockSemenStraws,
  mockInventoryTransactions,
} from './mockSeedData/inventoryWarehouseData';
import {
  generateNextAnimalId,
  generateNextAnimalTag,
  isAnimalIdUnique,
  parseAnimalIdNumber,
  milkCalculationService,
  financialCalculationService,
  animalCalculationService,
  inventoryCalculationService,
  healthCalculationService,
} from '../calculations';
import {
  Animal,
  AnimalListQuery,
  CreateAnimalInput,
  UpdateAnimalInput,
  MilkRecord,
  MilkListQuery,
  CreateMilkRecordInput,
  UpdateMilkRecordInput,
  MilkDailySummary,
  MilkAnimalSummary,
  BreedingRecord,
  BreedingListQuery,
  CreateBreedingInput,
  UpdateBreedingInput,
  CalvingRecord,
  CreateCalvingInput,
  LactationRecord,
  HealthRecord,
  HealthEvent,
  TreatmentRecord,
  Medicine,
  VaccinationRecord,
  FeedItem,
  Ration,
  FeedInventoryTransaction,
  Expense,
  Income,
  Customer,
  Supplier,
  Task,
  Notification,
  DashboardSummary,
  MilkReportQuery,
  MilkReport,
  FinancialReport,
  BreedingReport,
  HealthReport,
  AnimalPurchase,
  AnimalSale,
  MortalityRecord,
  Warehouse,
  VaccineStock,
  SemenStraw,
  InventoryTransaction,
  QuarantineRecord,
  HealthAuditLog,
  HealthDashboardSummary,
} from '../../types';

export const compareAnimalsAsc = (a: Animal, b: Animal): number => {
  const tagA = (a.earTag || a.animalId || '').trim();
  const tagB = (b.earTag || b.animalId || '').trim();
  const numA = parseInt(tagA.replace(/\D/g, ''), 10);
  const numB = parseInt(tagB.replace(/\D/g, ''), 10);
  if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
    return numA - numB;
  }
  return tagA.localeCompare(tagB, undefined, { numeric: true, sensitivity: 'base' });
};

class MockDatabaseService {
  private db: MockDatabase;

  constructor() {
    const saved = mockStorage.get<MockDatabase>();
    if (saved && saved.animals && saved.milkRecords) {
      this.db = saved;
    } else {
      this.db = getInitialDatabase();
      mockStorage.set(this.db);
    }
    // Ensure all animals have qrToken and qrCode populated
    this.db.animals.forEach((a) => {
      if (!a.qrCode) a.qrCode = a.animalId;
      if (!a.qrToken) {
        a.qrToken = `qr-tok-${a.animalId.toLowerCase().replace(/[^a-z0-9]/g, '')}-${a.earTag || a.id.replace('animal-', '')}`;
      }
    });
    // Always keep all animals sorted in ascending order
    this.db.animals.sort(compareAnimalsAsc);

    // Ensure all breeding records have semenStrawCode, inseminatorName, serviceDate, and pregnancyResult normalized
    if (!this.db.breedingRecords || this.db.breedingRecords.length < mockBreedingRecords.length) {
      this.db.breedingRecords = [...mockBreedingRecords];
    }
    if (this.db.breedingRecords) {
      this.db.breedingRecords.forEach((b) => {
        if (!b.serviceDate) b.serviceDate = b.heatDate;
        if (!b.semenStrawCode) {
          b.semenStrawCode = b.semenCode || b.bullTag || (b.method === 'Natural Service' ? 'BULL-01 (Sultan)' : 'SEM-HF-9901');
        }
        if (!b.semenCode) b.semenCode = b.semenStrawCode;
        if (!b.inseminatorName) {
          b.inseminatorName = b.technician || b.observedBy || (b.method === 'Natural Service' ? 'Bashir Ahmed' : 'Dr. Imran Qureshi');
        }
        if (!b.technician) b.technician = b.inseminatorName;
        if (!b.pregnancyResult) {
          b.pregnancyResult = 'Pending';
        }
        if (b.pregnancyResult === 'Positive' && !b.expectedCalvingDate && b.serviceDate) {
          const d = new Date(b.serviceDate);
          d.setDate(d.getDate() + 282);
          b.expectedCalvingDate = d.toISOString().split('T')[0];
        }
      });
      // Sort breeding records by animalId in ascending order
      this.db.breedingRecords.sort((a, b) =>
        (a.animalId || '').localeCompare(b.animalId || '', undefined, { numeric: true, sensitivity: 'base' })
      );
    }

    // Ensure mortalities are populated and have full veterinary and post-mortem fields
    if (!this.db.mortalities || this.db.mortalities.length < mockMortalities.length) {
      this.db.mortalities = [...mockMortalities];
    } else {
      this.db.mortalities.forEach((m) => {
        if (!m.veterinarian) m.veterinarian = 'Dr. Imran Qureshi';
        if (!m.postMortemNotes) {
          m.postMortemNotes = 'Clinical necropsy verified: internal hemorrhaging & metabolic collapse.';
        }
      });
    }

    // Ensure calvings are populated and complete
    if (!this.db.calvings || this.db.calvings.length < mockCalvings.length) {
      this.db.calvings = [...mockCalvings];
    } else {
      this.db.calvings.forEach((c) => {
        if (!c.colostrumLiters && !c.colostrumFedLiters) c.colostrumLiters = 4.0;
        if (!c.attendedBy) c.attendedBy = 'Bashir Ahmed';
        if (!c.difficulty) c.difficulty = 'Normal / Unassisted';
      });
    }

    // Ensure Warehouses are initialized
    if (!this.db.warehouses || this.db.warehouses.length === 0) {
      this.db.warehouses = [...mockWarehouses];
    }

    // Ensure Vaccines are initialized
    if (!this.db.vaccineStocks || this.db.vaccineStocks.length === 0) {
      this.db.vaccineStocks = [...mockVaccines];
    }

    // Ensure Semen Straws are initialized
    if (!this.db.semenStraws || this.db.semenStraws.length === 0) {
      this.db.semenStraws = [...mockSemenStraws];
    }

    // Ensure Inventory Transactions are initialized
    if (!this.db.inventoryTransactions || this.db.inventoryTransactions.length === 0) {
      this.db.inventoryTransactions = [...mockInventoryTransactions];
    }

    // Normalize and enrich Feed Items
    if (this.db.feedItems) {
      this.db.feedItems.forEach((f) => {
        if (f.id === 'feed-0001' && (f.currentStockKg === 42000 || f.currentStock === 42000)) {
          f.currentStockKg = 47000;
          f.currentStock = 47000;
        }
        if (f.currentStock === undefined) f.currentStock = f.currentStockKg;
        if (f.currentStockKg === undefined) f.currentStockKg = f.currentStock || 0;
        if (f.minAlertLevel === undefined) f.minAlertLevel = f.minStockThresholdKg;
        if (f.minStockThresholdKg === undefined) f.minStockThresholdKg = f.minAlertLevel || 0;
        if (!f.unitPrice) f.unitPrice = 25;
        if (!f.supplier) f.supplier = f.supplierName || 'National Feed Supply';
        if (!f.supplierName) f.supplierName = f.supplier;
        if (!f.warehouseId) {
          f.warehouseId = f.category === 'Silage' ? 'warehouse-001' : f.category === 'Straw' || f.category === 'Fodder' ? 'warehouse-005' : 'warehouse-002';
        }
        if (!f.warehouseName) {
          const wh = this.db.warehouses.find((w) => w.id === f.warehouseId);
          f.warehouseName = wh ? wh.name : 'Main Feed & Concentrate Shed';
        }
        if (!f.warehouse) f.warehouse = f.warehouseName;
        if (!f.purchaseDate) f.purchaseDate = '2024-04-15';
        if (!f.expiryDate) f.expiryDate = f.category === 'Concentrate' ? '2024-12-31' : '2025-06-30';
        if (!f.notes) f.notes = `Standard verified ${f.category} feed stock.`;
        // Auto status calculation
        const statusObj = inventoryCalculationService.calculateStockStatus(f.currentStockKg, f.minStockThresholdKg);
        f.status = statusObj.status;
      });
    }

    // Normalize and enrich Medicines
    if (this.db.medicines) {
      this.db.medicines.forEach((m) => {
        if (m.currentStock === undefined) m.currentStock = m.stockQuantity;
        if (m.stockQuantity === undefined) m.stockQuantity = m.currentStock || 0;
        if (m.quantity === undefined) m.quantity = m.stockQuantity;
        if (m.cost === undefined) m.cost = m.unitPrice;
        if (m.unitPrice === undefined) m.unitPrice = m.cost || 0;
        if (m.withdrawalDays === undefined) m.withdrawalDays = m.withdrawalDaysMilk || 0;
        if (m.withdrawalDaysMilk === undefined) m.withdrawalDaysMilk = m.withdrawalDays || 0;
        if (m.withdrawalDaysMeat === undefined) m.withdrawalDaysMeat = 14;
        if (m.minAlertLevel === undefined) m.minAlertLevel = m.lowStockThreshold || 5;
        if (!m.warehouseId) m.warehouseId = 'warehouse-003';
        if (!m.warehouseName) m.warehouseName = 'Central Veterinary Pharmacy & Cold Room';
        if (!m.warehouse) m.warehouse = m.warehouseName;
        if (!m.supplier) m.supplier = m.supplierName || 'Al-Faisal Veterinary Pharma';
        if (!m.purchaseDate) m.purchaseDate = '2024-02-10';
        // Auto status
        const expRes = inventoryCalculationService.calculateMedicineExpiry(m.expiryDate);
        if (expRes.isExpired) {
          m.status = 'Expired';
        } else {
          m.status = inventoryCalculationService.calculateStockStatus(m.stockQuantity, m.lowStockThreshold).status;
        }
      });
    }

    // Normalize and enrich Vaccines
    if (this.db.vaccineStocks) {
      this.db.vaccineStocks.forEach((v) => {
        if (!v.name) v.name = v.vaccineName;
        if (!v.vaccineName) v.vaccineName = v.name;
        if (!v.warehouseId) v.warehouseId = 'warehouse-003';
        if (!v.warehouseName) v.warehouseName = 'Central Veterinary Pharmacy & Cold Room';
        if (!v.warehouse) v.warehouse = v.warehouseName;
        if (!v.minStockLevel) v.minStockLevel = 30;
        const expRes = inventoryCalculationService.calculateMedicineExpiry(v.expiryDate);
        if (expRes.isExpired) {
          v.status = 'Expired';
        } else {
          v.status = inventoryCalculationService.calculateStockStatus(v.quantity, v.minStockLevel).status;
        }
      });
    }

    // Normalize Semen Straws
    if (this.db.semenStraws) {
      this.db.semenStraws.forEach((s) => {
        const nitr = inventoryCalculationService.calculateNitrogenStatus(s.nitrogenLevel, s.minNitrogenLevel || 25);
        s.nitrogenStatus = nitr.status;
        s.status = inventoryCalculationService.calculateStockStatus(s.quantity, 10).status;
      });
    }

    // Ensure Quarantine Records are initialized
    if (!this.db.quarantineRecords) {
      this.db.quarantineRecords = [];
    }

    // Ensure Health Audit Logs are initialized
    if (!this.db.healthAuditLogs || this.db.healthAuditLogs.length === 0) {
      this.db.healthAuditLogs = [...(getInitialDatabase().healthAuditLogs || [])];
    }

    // Ensure Health Records are populated
    if (!this.db.healthRecords || this.db.healthRecords.length < 8) {
      this.db.healthRecords = [...getInitialDatabase().healthRecords];
    }

    // Ensure Treatments match exact 5 active treatments & single active withdrawal on HF-038
    if (
      !this.db.treatments ||
      this.db.treatments.length < 5 ||
      !this.db.treatments.some((t) => (t.animalTag === 'HF-038' || t.animalId === 'HF-038' || t.animalId === 'animal-0024') && t.isWithdrawalActive)
    ) {
      this.db.treatments = [...getInitialDatabase().treatments];
    }

    // Normalize treatments withdrawal status and hold dates
    this.db.treatments.forEach((t) => {
      if (!t.diagnosis) t.diagnosis = t.problem || 'Clinical Care';
      if (!t.dosage) t.dosage = t.dose || 'Standard dose';
      if (!t.dose) t.dose = t.dosage;
      if (!t.route) t.route = 'Intramuscular';
      if (t.milkWithdrawalDays === undefined) t.milkWithdrawalDays = 0;
      if (t.meatWithdrawalDays === undefined) t.meatWithdrawalDays = 0;
      if (!t.status) t.status = 'In Treatment';

      if (t.animalTag === 'HF-038' || t.animalId === 'HF-038' || t.animalId === 'animal-0024') {
        t.isWithdrawalActive = true;
        t.milkWithdrawalDays = 10;
        t.milkUsableDate = '2024-05-19';
        t.withdrawalStatus = 'Active Hold';
        t.status = 'In Treatment';
        t.medicineName = 'Oxytetracycline 20% LA';
        t.dosage = '25 ml deep IM';
        t.dose = '25 ml';
        t.route = 'Intramuscular';
        t.veterinarian = 'Dr. Imran Qureshi';
      }
    });

    // Ensure HF-038 animal record has isWithdrawalActive: true and other animals are cleared unless under hold
    this.db.animals.forEach((cow) => {
      const activeHold = this.db.treatments.some(
        (t) =>
          (t.animalId === cow.id || t.animalTag === cow.animalId || t.animalTag === cow.earTag) &&
          t.isWithdrawalActive &&
          t.status !== 'Completed'
      );
      cow.isWithdrawalActive = activeHold;
      if (cow.animalId === 'HF-038' || cow.earTag === 'HF-038' || cow.id === 'animal-0024') {
        cow.isWithdrawalActive = true;
        cow.remarks = 'Active antimicrobial milk withdrawal: Oxytetracycline 20% LA (Hold until 2024-05-19). Do Not Milk Into Bulk Tank.';
      }
    });

    // Recalculate warehouse utilization
    this.refreshAllWarehouseMetrics();
  }

  public getSnapshot(): MockDatabase {
    return this.db;
  }

  private commit(): void {
    mockStorage.set(this.db);
  }

  public resetToSeed(): void {
    this.db = getInitialDatabase();
    this.db.animals.sort(compareAnimalsAsc);
    this.commit();
  }

  public getAnimalMatchSet(identifier: string): Set<string> {
    const set = new Set<string>();
    const trimmed = identifier.trim().toLowerCase();
    set.add(trimmed);

    const animal = this.db.animals.find(
      (a) =>
        a.id.toLowerCase() === trimmed ||
        a.animalId.toLowerCase() === trimmed ||
        (a.earTag && a.earTag.toLowerCase() === trimmed) ||
        (a.rfid && a.rfid.toLowerCase() === trimmed)
    );

    if (animal) {
      set.add(animal.id.toLowerCase());
      set.add(animal.animalId.toLowerCase());
      if (animal.earTag) set.add(animal.earTag.toLowerCase());
      if (animal.rfid) set.add(animal.rfid.toLowerCase());
      const numMatch = animal.id.match(/\d+/) || animal.animalId.match(/\d+/) || (animal.earTag ? animal.earTag.match(/\d+/) : null);
      if (numMatch) {
        const num = parseInt(numMatch[0], 10);
        set.add(`animal-${String(num).padStart(4, '0')}`);
        set.add(`an-${String(num).padStart(3, '0')}`);
        set.add(`hf-${String(num).padStart(3, '0')}`);
        set.add(String(num).padStart(3, '0'));
        set.add(String(num));
      }
    } else {
      const numMatch = trimmed.match(/\d+/);
      if (numMatch) {
        const num = parseInt(numMatch[0], 10);
        set.add(`animal-${String(num).padStart(4, '0')}`);
        set.add(`an-${String(num).padStart(3, '0')}`);
        set.add(`hf-${String(num).padStart(3, '0')}`);
        set.add(String(num).padStart(3, '0'));
        set.add(String(num));
      }
    }
    return set;
  }

  // ==========================================
  // Animals
  // ==========================================
  public getAnimals(query?: AnimalListQuery): { data: Animal[]; total: number } {
    let result = [...this.db.animals];

    if (query?.search) {
      const q = query.search.toLowerCase().trim();
      result = result.filter(
        (a) =>
          a.animalId.toLowerCase().includes(q) ||
          a.earTag.toLowerCase().includes(q) ||
          (a.rfid && a.rfid.toLowerCase().includes(q))
      );
    }

    if (query?.status) {
      result = result.filter((a) => a.status === query.status);
    }

    if (query?.breed) {
      result = result.filter((a) => a.breed === query.breed);
    }

    if (query?.sex) {
      result = result.filter((a) => a.sex === query.sex);
    }

    if (query?.groupId) {
      result = result.filter((a) => a.groupId === query.groupId);
    }

    if (query?.shedId) {
      result = result.filter((a) => a.shedId === query.shedId);
    }

    if (query?.lactating) {
      result = result.filter((a) => a.status === 'Lactating');
    }

    if (query?.pregnant !== undefined) {
      if (query.pregnant) {
        result = result.filter((a) => a.status === 'Pregnant');
      } else {
        result = result.filter((a) => a.status !== 'Pregnant');
      }
    }

    if (query?.productionMin !== undefined) {
      result = result.filter((a) => (a.todayMilk || a.dailyAvgMilk || 0) >= query.productionMin!);
    }

    if (query?.productionMax !== undefined) {
      result = result.filter((a) => (a.todayMilk || a.dailyAvgMilk || 0) <= query.productionMax!);
    }

    if (query?.sick) {
      result = result.filter((a) => a.status === 'Sick' || a.status === 'Quarantine');
    }

    // Sorting: default to ascending order by Ear Tag / Animal ID
    if (query?.sortBy) {
      const field = query.sortBy as keyof Animal;
      const dir = query.sortDirection === 'desc' ? -1 : 1;
      result.sort((a, b) => {
        const valA = a[field] ?? '';
        const valB = b[field] ?? '';
        if (valA < valB) return -1 * dir;
        if (valA > valB) return 1 * dir;
        return compareAnimalsAsc(a, b);
      });
    } else {
      result.sort(compareAnimalsAsc);
    }

    const total = result.length;
    const page = query?.page || 1;
    const pageSize = query?.pageSize || 20;
    const start = (page - 1) * pageSize;
    const paginated = result.slice(start, start + pageSize);

    return { data: paginated, total };
  }

  public getAnimalById(id: string): Animal | undefined {
    const trimmed = id.trim().toLowerCase();
    return this.db.animals.find(
      (a) =>
        a.id.toLowerCase() === trimmed ||
        a.animalId.toLowerCase() === trimmed ||
        a.earTag.toLowerCase() === trimmed ||
        (a.qrToken && a.qrToken.toLowerCase() === trimmed) ||
        (a.rfid && a.rfid.toLowerCase() === trimmed)
    );
  }

  public getAnimalByQrToken(qrToken: string): Animal | undefined {
    const trimmed = qrToken.trim().toLowerCase();
    return this.db.animals.find(
      (a) =>
        (a.qrToken && a.qrToken.toLowerCase() === trimmed) ||
        a.animalId.toLowerCase() === trimmed ||
        a.id.toLowerCase() === trimmed ||
        a.earTag.toLowerCase() === trimmed
    );
  }

  public getAnimalQrProfile(qrTokenOrId: string) {
    const animal = this.getAnimalByQrToken(qrTokenOrId) || this.getAnimalById(qrTokenOrId);
    if (!animal) return undefined;

    const farm = this.db.farms.find((f) => f.id === animal.farmId);
    const shed = this.db.sheds.find((s) => s.id === animal.shedId);
    const group = this.db.groups.find((g) => g.id === animal.groupId);
    const milkRecords = this.db.milkRecords
      .filter((m) => m.animalId === animal.id || m.animalId === animal.animalId || m.animalTag === animal.earTag)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);
    const breedingRecords = this.db.breedingRecords.filter(
      (b) => b.animalId === animal.id || b.animalId === animal.animalId || b.animalTag === animal.earTag
    );
    const healthRecords = this.db.healthRecords.filter(
      (h) => h.animalId === animal.id || h.animalId === animal.animalId || h.animalTag === animal.earTag
    );
    const treatments = this.db.treatments.filter(
      (t) => t.animalId === animal.id || t.animalId === animal.animalId || t.animalTag === animal.earTag
    );
    const calvings = this.db.calvings.filter((c) => c.damId === animal.id || c.damTag === animal.earTag);
    const lactations = this.db.lactations.filter((l) => l.animalId === animal.id || l.animalId === animal.animalId);
    const vaccinations = this.db.vaccinations.filter(
      (v) => v.animalId === animal.id || v.groupId === animal.groupId
    );
    const ration = this.db.rations.find((r) => r.targetGroup === group?.name || r.isActive);

    return {
      animal,
      farm,
      shed,
      group,
      latestMilkRecords: milkRecords,
      breedingRecords,
      healthRecords,
      treatments,
      calvings,
      lactations,
      vaccinations,
      ration,
      isWithdrawalActive: Boolean(animal.isWithdrawalActive),
      qrToken: animal.qrToken || animal.animalId,
      qrUrl: `/qr/animal/${animal.qrToken || animal.animalId}`,
      generatedAt: new Date().toISOString(),
    };
  }

  public regenerateQrToken(id: string): { qrToken: string; qrCode: string } {
    const animal = this.getAnimalById(id);
    if (!animal) throw new Error(`Animal "${id}" not found.`);
    const randomHex = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
    const newToken = `qr-tok-${animal.animalId.toLowerCase().replace(/[^a-z0-9]/g, '')}-${randomHex}`;
    animal.qrToken = newToken;
    this.commit();
    return { qrToken: newToken, qrCode: animal.qrCode || animal.animalId };
  }

  public getNextAnimalId(): string {
    return generateNextAnimalId(this.db.animals);
  }

  public getNextAnimalTag(): string {
    return generateNextAnimalTag(this.db.animals, 3);
  }

  public createAnimal(input: CreateAnimalInput): Animal {
    // Determine sequential Animal ID and Ear Tag
    const animalIdToUse = input.animalId?.trim() || generateNextAnimalId(this.db.animals);
    const nextSequentialTag = generateNextAnimalTag(this.db.animals, 3);
    const earTagToUse = input.earTag?.trim() || nextSequentialTag;

    // Validation: Animal ID uniqueness
    if (!isAnimalIdUnique(animalIdToUse, this.db.animals)) {
      throw new Error(`Animal ID "${animalIdToUse}" already exists. Each animal must have a unique identifier.`);
    }

    const nextNumber = parseAnimalIdNumber(animalIdToUse) || (this.db.animals.length + 1);
    const qrTokenToUse = input.qrToken || `qr-tok-${animalIdToUse.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now().toString(36)}`;
    const qrCodeToUse = input.qrCode || animalIdToUse;

    const newAnimal: Animal = {
      ...input,
      animalId: animalIdToUse,
      earTag: earTagToUse,
      qrToken: qrTokenToUse,
      qrCode: qrCodeToUse,
      id: `animal-${String(nextNumber).padStart(4, '0')}`,
      farmId: 'farm-001',
      lactationNumber: input.status === 'Lactating' ? 1 : 0,
      daysInMilk: input.status === 'Lactating' ? 1 : 0,
      dailyAvgMilk: input.status === 'Lactating' ? 20.0 : 0,
      todayMilk: input.status === 'Lactating' ? 20.0 : 0,
    };

    this.db.animals.push(newAnimal);
    this.db.animals.sort(compareAnimalsAsc);
    this.commit();
    return newAnimal;
  }

  public updateAnimal(id: string, input: UpdateAnimalInput): Animal {
    const idx = this.db.animals.findIndex((a) => a.id === id || a.animalId === id);
    if (idx === -1) {
      throw new Error(`Animal with ID "${id}" not found.`);
    }

    // Animal ID is a permanent historical identifier and cannot be modified after registration
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { animalId: _cannotChange, id: _cannotChangeId, ...safeInput } = input as any;

    const updated = { ...this.db.animals[idx], ...safeInput };
    this.db.animals[idx] = updated;
    this.commit();
    return updated;
  }

  public archiveAnimal(id: string, reason: 'Sold' | 'Dead' = 'Sold'): void {
    const animal = this.getAnimalById(id);
    if (!animal) throw new Error(`Animal "${id}" not found`);
    animal.status = reason;
    this.commit();
  }

  // ==========================================
  // Milk Management
  // ==========================================
  public getMilkRecords(query?: MilkListQuery): { data: MilkRecord[]; total: number } {
    let result = [...this.db.milkRecords];

    if (query?.animalId) {
      const matchSet = this.getAnimalMatchSet(query.animalId);
      result = result.filter((m) => {
        const id = (m.animalId || '').toLowerCase();
        const tag = (m.animalTag || '').toLowerCase();
        return matchSet.has(id) || matchSet.has(tag);
      });

      // If no milk records currently found for this animal but it is lactating, dynamically generate realistic records so profile has complete data
      if (result.length === 0) {
        const animal = this.getAnimalById(query.animalId);
        if (animal && (animal.status === 'Lactating' || (animal.dailyAvgMilk && animal.dailyAvgMilk > 0))) {
          const avg = animal.dailyAvgMilk || 26.0;
          const generated: MilkRecord[] = [];
          for (let day = 0; day < 15; day++) {
            const dateObj = new Date(Date.parse('2024-05-14') - day * 86400000);
            const dateStr = dateObj.toISOString().split('T')[0];
            const morningLiters = Math.round((avg * 0.55 + (Math.sin(day) * 1.5)) * 10) / 10;
            const eveningLiters = Math.round((avg * 0.45 + (Math.cos(day) * 1.2)) * 10) / 10;

            generated.push({
              id: `gen-milk-${animal.id}-${dateStr}-M`,
              farmId: 'farm-001',
              animalId: animal.id,
              animalTag: animal.earTag || animal.animalId,
              date: dateStr,
              session: 'Morning',
              quantityLiters: morningLiters,
              fatPercent: 3.9,
              snfPercent: 8.8,
              qualityStatus: 'Accepted',
            });
            generated.push({
              id: `gen-milk-${animal.id}-${dateStr}-E`,
              farmId: 'farm-001',
              animalId: animal.id,
              animalTag: animal.earTag || animal.animalId,
              date: dateStr,
              session: 'Evening',
              quantityLiters: eveningLiters,
              fatPercent: 4.0,
              snfPercent: 8.9,
              qualityStatus: 'Accepted',
            });
          }
          result = generated;
        }
      }
    }
    if (query?.date) {
      result = result.filter((m) => m.date === query.date);
    }
    if (query?.from && query?.to) {
      result = result.filter((m) => m.date >= query.from! && m.date <= query.to!);
    }
    if (query?.session) {
      result = result.filter((m) => m.session === query.session);
    }
    if (query?.qualityStatus) {
      result = result.filter((m) => m.qualityStatus === query.qualityStatus);
    }

    // Default sort by date desc
    result.sort((a, b) => b.date.localeCompare(a.date));

    const total = result.length;
    const page = query?.page || 1;
    const pageSize = query?.pageSize || 25;
    const start = (page - 1) * pageSize;
    return { data: result.slice(start, start + pageSize), total };
  }

  public createMilkRecord(input: CreateMilkRecordInput): MilkRecord {
    if (input.quantityLiters < 0) {
      throw new Error('Milk quantity cannot be negative.');
    }

    const animal = this.getAnimalById(input.animalId);
    if (!animal) {
      throw new Error(`Animal "${input.animalId}" does not exist.`);
    }
    if (animal.status === 'Sold' || animal.status === 'Dead') {
      throw new Error(`Cannot record milk for animal with status "${animal.status}".`);
    }

    // Prevent accidental duplicate records for the same: Animal + Date + Session
    const duplicate = this.db.milkRecords.find(
      (r) =>
        (r.animalId === animal.id || r.animalId === animal.animalId || r.animalTag === animal.animalId) &&
        r.date === input.date &&
        r.session === input.session
    );
    if (duplicate) {
      throw new Error(
        `A ${input.session} milk record for animal ${animal.animalId} (${animal.earTag || ''}) on ${input.date} already exists (${duplicate.quantityLiters} L). Please edit the existing record or choose another session.`
      );
    }

    const nextNumber = this.db.milkRecords.length + 1;
    const unitPrice = input.pricePerLiter !== undefined ? input.pricePerLiter : 150;
    const totalAmount = input.totalAmount !== undefined ? input.totalAmount : Math.round(input.quantityLiters * unitPrice);

    const newRecord: MilkRecord = {
      ...input,
      id: `milk-${String(nextNumber).padStart(6, '0')}`,
      farmId: 'farm-001',
      animalTag: animal.animalId || animal.earTag,
      pricePerLiter: unitPrice,
      totalAmount: totalAmount,
      qualityStatus: input.qualityStatus || 'Accepted',
      rejectionReason: input.rejectionReason,
    };

    this.db.milkRecords.unshift(newRecord);

    // Update animal's recorded milk yield
    const todaySummary = milkCalculationService.calculateAnimalMilkPerformance(
      animal.id,
      this.db.milkRecords,
      input.date
    );
    animal.todayMilk = todaySummary.todayMilk;

    this.commit();
    return newRecord;
  }

  public getDailyMilkSummary(date: string = '2024-05-14'): MilkDailySummary {
    return milkCalculationService.calculateHerdDailySummary(this.db.milkRecords, date);
  }

  public getAnimalMilkSummary(animalId: string): MilkAnimalSummary {
    const animal = this.getAnimalById(animalId);
    if (!animal) throw new Error(`Animal not found: ${animalId}`);

    const matchSet = this.getAnimalMatchSet(animalId);
    let records = this.db.milkRecords
      .filter((r) => matchSet.has((r.animalId || '').toLowerCase()) || matchSet.has((r.animalTag || '').toLowerCase()))
      .sort((a, b) => b.date.localeCompare(a.date));

    if (records.length === 0 && (animal.status === 'Lactating' || (animal.dailyAvgMilk && animal.dailyAvgMilk > 0))) {
      const generated = this.getMilkRecords({ animalId: animal.id });
      records = generated.data;
    }

    const perf = milkCalculationService.calculateAnimalMilkPerformance(
      animal.id,
      this.db.milkRecords,
      '2024-05-14'
    );

    const lactation = this.db.lactations.find((l) => matchSet.has((l.animalId || '').toLowerCase()) && l.status === 'In Milk');

    return {
      animalId: animal.id,
      animalTag: animal.animalId,
      currentMilkToday: perf.todayMilk || animal.todayMilk || animal.dailyAvgMilk || 25,
      average7Days: perf.average7Days || animal.dailyAvgMilk || 25,
      average30Days: perf.average30Days || animal.dailyAvgMilk || 25,
      peakMilk: lactation?.peakMilk || perf.peakMilk || 34.5,
      peakDate: lactation?.peakDate || '2023-11-28',
      totalLactationMilk: lactation?.totalLactationMilk || (animal.daysInMilk ? animal.daysInMilk * 25 : 6450),
      daysInMilk: lactation?.daysInMilk || animal.daysInMilk || 216,
      records: records.slice(0, 30),
    };
  }

  // ==========================================
  // Breeding & Reproduction
  // ==========================================
  public getBreedingRecords(query?: BreedingListQuery): { data: BreedingRecord[]; total: number } {
    let result = [...this.db.breedingRecords];
    if (query?.animalId) {
      const matchSet = this.getAnimalMatchSet(query.animalId);
      result = result.filter((b) => {
        const id = (b.animalId || '').toLowerCase();
        const tag = (b.animalTag || '').toLowerCase();
        return matchSet.has(id) || matchSet.has(tag);
      });

      if (result.length === 0) {
        const animal = this.getAnimalById(query.animalId);
        if (animal && (animal.status === 'Pregnant' || animal.status === 'Lactating')) {
          result = [{
            id: `gen-breeding-${animal.id}`,
            animalId: animal.id,
            animalTag: animal.earTag || animal.animalId,
            farmId: 'farm-001',
            heatDate: '2024-03-12',
            heatIntensity: 'Strong',
            observedBy: 'Farm Staff',
            serviceDate: '2024-03-13',
            method: 'AI',
            bullTag: animal.sireTag || 'Bull AltaSpring',
            semenCode: 'SEM-HF-9901',
            technician: 'Dr. Imran Qureshi',
            serviceNumber: 1,
            pregnancyCheckDate: '2024-04-04',
            pregnancyResult: 'Positive',
            pregnancyStage: animal.status === 'Pregnant' ? 'Confirmed In-Calf' : 'Confirmed',
            expectedCalvingDate: '2024-09-25',
            remarks: 'Animal is in prime condition. Gestation on track.',
          }];
        }
      }
    }
    if (query?.pregnancyResult) {
      result = result.filter((b) => b.pregnancyResult === query.pregnancyResult);
    }
    // Default sort by animalId in ascending order per requirements
    result.sort((a, b) =>
      (a.animalId || '').localeCompare(b.animalId || '', undefined, { numeric: true, sensitivity: 'base' })
    );
    const total = result.length;
    const page = query?.page || 1;
    const pageSize = query?.pageSize || 20;
    return { data: result.slice((page - 1) * pageSize, page * pageSize), total };
  }

  public createBreeding(input: CreateBreedingInput): BreedingRecord {
    const animal = this.getAnimalById(input.animalId);
    if (!animal) throw new Error(`Animal not found: ${input.animalId}`);

    const strawCode =
      input.semenStrawCode ||
      input.semenCode ||
      input.bullTag ||
      (input.method === 'Natural' || input.method === 'Natural Service' ? 'BULL-01 (Sultan)' : 'SEM-HF-9901');
    const inseminator = input.inseminatorName || input.technician || input.observedBy || 'Dr. Imran Qureshi';
    const sDate = input.serviceDate || input.heatDate || new Date().toISOString().split('T')[0];
    const pregResult = input.pregnancyResult || 'Pending';

    let expCalving = input.expectedCalvingDate;
    if (pregResult === 'Positive' && !expCalving && sDate) {
      const d = new Date(sDate);
      d.setDate(d.getDate() + 282);
      expCalving = d.toISOString().split('T')[0];
    }

    const nextId = `breeding-${String(this.db.breedingRecords.length + 1).padStart(4, '0')}`;
    const newRecord: BreedingRecord = {
      ...input,
      id: nextId,
      farmId: 'farm-001',
      animalTag: animal.earTag || animal.animalId,
      animalName: animal.name,
      serviceDate: sDate,
      semenStrawCode: strawCode,
      semenCode: strawCode,
      inseminatorName: inseminator,
      technician: inseminator,
      pregnancyResult: pregResult,
      expectedCalvingDate: expCalving,
    };

    // If an entry for this animal with the same serviceDate exists, update it, else add it
    const existingIdx = this.db.breedingRecords.findIndex(
      (b) => b.animalId === animal.id && b.serviceDate === sDate
    );
    if (existingIdx >= 0) {
      this.db.breedingRecords[existingIdx] = {
        ...this.db.breedingRecords[existingIdx],
        ...newRecord,
        id: this.db.breedingRecords[existingIdx].id,
      };
    } else {
      this.db.breedingRecords.unshift(newRecord);
    }

    // Keep sorted by animalId ascending
    this.db.breedingRecords.sort((a, b) =>
      (a.animalId || '').localeCompare(b.animalId || '', undefined, { numeric: true, sensitivity: 'base' })
    );

    if (pregResult === 'Positive') {
      animal.status = 'Pregnant';
      animal.pregnancyStatus = 'Confirmed (PD+)';
      animal.expectedCalvingDate = expCalving;
    }

    this.commit();
    return newRecord;
  }

  public getLactations(animalId?: string): LactationRecord[] {
    let list = [...this.db.lactations];
    if (animalId) {
      const matchSet = this.getAnimalMatchSet(animalId);
      list = list.filter((l) => {
        const id = (l.animalId || '').toLowerCase();
        const tag = (l.animalTag || '').toLowerCase();
        return matchSet.has(id) || matchSet.has(tag);
      });

      if (list.length === 0) {
        const animal = this.getAnimalById(animalId);
        if (animal && (animal.status === 'Lactating' || (animal.lactationNumber && animal.lactationNumber > 0))) {
          const lacNo = animal.lactationNumber || 1;
          const dim = animal.daysInMilk || 140;
          const peak = Math.round((animal.dailyAvgMilk ? animal.dailyAvgMilk * 1.25 : 32.5) * 10) / 10;
          const currentYield = animal.todayMilk || animal.dailyAvgMilk || 26.5;
          const totalMilk = Math.round(dim * (animal.dailyAvgMilk || 25.0));
          list = [{
            id: `lac-${animal.id}-${lacNo}`,
            farmId: 'farm-001',
            animalId: animal.id,
            animalTag: animal.earTag || animal.animalId,
            lactationNumber: lacNo,
            calvingDate: new Date(Date.now() - dim * 86400000).toISOString().split('T')[0],
            daysInMilk: dim,
            peakMilk: peak,
            peakDate: '2023-12-10',
            currentMilk: currentYield,
            totalLactationMilk: totalMilk,
            status: animal.status === 'Lactating' ? 'In Milk' : 'Completed',
          }];
          if (lacNo > 1) {
            list.push({
              id: `lac-${animal.id}-${lacNo - 1}`,
              farmId: 'farm-001',
              animalId: animal.id,
              animalTag: animal.earTag || animal.animalId,
              lactationNumber: lacNo - 1,
              calvingDate: '2022-10-15',
              daysInMilk: 305,
              peakMilk: 31.0,
              peakDate: '2022-11-20',
              currentMilk: 14.0,
              totalLactationMilk: 7450,
              status: 'Completed',
            });
          }
        }
      }
    }
    return list.sort((a, b) => (b.lactationNumber || 0) - (a.lactationNumber || 0));
  }

  public getCalvings(damId?: string): CalvingRecord[] {
    let list = [...this.db.calvings];
    if (damId) {
      const matchSet = this.getAnimalMatchSet(damId);
      list = list.filter((c) => {
        const id = (c.damId || '').toLowerCase();
        const tag = (c.damTag || '').toLowerCase();
        return matchSet.has(id) || matchSet.has(tag);
      });

      if (list.length === 0) {
        const animal = this.getAnimalById(damId);
        if (animal && (animal.lactationNumber && animal.lactationNumber > 0)) {
          list = [{
            id: `calving-dyn-${animal.id}`,
            farmId: 'farm-001',
            damId: animal.id,
            damTag: animal.earTag || animal.animalId,
            sireTag: animal.sireTag || 'Bull-AltaSpring',
            calvingDate: new Date(Date.now() - (animal.daysInMilk || 150) * 86400000).toISOString().split('T')[0],
            difficulty: 'Normal / Unassisted',
            calfCount: 1,
            calfSex: 'Female',
            birthWeightKg: 38,
            calfTag: `Calf of Tag ${animal.earTag || animal.animalId}`,
            colostrumTimeHours: 1,
            colostrumLiters: 4,
            attendedBy: 'Farm Veterinary Staff',
          }];
        }
      }
    }
    return list.sort((a, b) => (b.calvingDate || '').localeCompare(a.calvingDate || ''));
  }

  public createCalving(input: CreateCalvingInput): CalvingRecord {
    const dam = this.getAnimalById(input.damId);
    if (!dam) throw new Error(`Dam not found: ${input.damId}`);

    const calvingId = `calving-${String(this.db.calvings.length + 1).padStart(4, '0')}`;
    let calfId: string | undefined;
    let calfTag = input.calfTag;

    if (input.createCalfRecord) {
      const calfNumber = this.db.animals.length + 1;
      calfId = `animal-${String(calfNumber).padStart(4, '0')}`;
      if (!calfTag) {
        calfTag = `CALF-${String(calfNumber).padStart(3, '0')}`;
      }

      const newCalf: Animal = {
        id: calfId,
        farmId: 'farm-001',
        shedId: 'shed-003',
        groupId: 'group-calf',
        animalId: calfTag,
        earTag: `${2000 + calfNumber}`,
        breed: dam.breed,
        sex: input.calfSex,
        dateOfBirth: input.calvingDate,
        status: 'Calf',
        damId: dam.id,
        damTag: dam.animalId,
        remarks: `Born via ${input.difficulty}. Birth weight: ${input.birthWeightKg}kg.`,
      };
      this.db.animals.push(newCalf);
      this.db.animals.sort(compareAnimalsAsc);
    }

    // Update Dam status to Lactating & start new lactation record
    dam.status = 'Lactating';
    dam.daysInMilk = 1;
    dam.lactationNumber = (dam.lactationNumber || 0) + 1;

    const newCalving: CalvingRecord = {
      ...input,
      id: calvingId,
      farmId: 'farm-001',
      damTag: dam.animalId,
      calfId,
      calfTag,
    };

    this.db.calvings.unshift(newCalving);
    this.commit();
    return newCalving;
  }

  // ==========================================
  // Health, Treatments, Medicines, Vaccinations, Quarantine & Audit
  // ==========================================
  public getHealthRecords(animalId?: string): HealthRecord[] {
    let list = [...this.db.healthRecords];
    if (animalId) {
      const matchSet = this.getAnimalMatchSet(animalId);
      list = list.filter((h) => {
        const id = (h.animalId || '').toLowerCase();
        const tag = (h.animalTag || '').toLowerCase();
        return matchSet.has(id) || matchSet.has(tag);
      });
      if (list.length === 0) {
        const animal = this.getAnimalById(animalId);
        if (animal) {
          list = [{
            id: `gen-health-${animal.id}`,
            farmId: 'farm-001',
            animalId: animal.id,
            animalTag: animal.earTag || animal.animalId,
            date: '2024-04-10',
            problem: 'Routine Herd Health Checkup',
            diagnosis: 'Healthy, rumen motility normal, teeth and hooves inspected',
            symptoms: 'Normal appetite and body condition',
            veterinarian: 'Dr. Imran Qureshi',
            status: 'Recovered',
          }];
        }
      }
    }
    return list.sort((a, b) => b.date.localeCompare(a.date));
  }

  public getHealthRecordById(id: string): HealthRecord | undefined {
    return this.db.healthRecords.find((h) => h.id === id);
  }

  public createHealthRecord(input: Partial<HealthRecord>): HealthRecord {
    if (!input.animalId) throw new Error('Animal is required for health observation.');
    const animal = this.getAnimalById(input.animalId);
    if (!animal) throw new Error(`Animal not found: ${input.animalId}`);

    const id = `health-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newRecord: HealthRecord = {
      id,
      farmId: 'farm-001',
      animalId: animal.id,
      animalTag: animal.earTag || animal.animalId,
      animalName: animal.name,
      date: input.date || input.eventDate || new Date().toISOString().split('T')[0],
      eventDate: input.date || input.eventDate || new Date().toISOString().split('T')[0],
      eventType: input.eventType || 'Disease',
      problem: input.problem || input.diagnosis || 'Clinical Observation',
      diagnosis: input.diagnosis || input.problem || 'Under Evaluation',
      symptoms: input.symptoms || '',
      severity: input.severity || 'Moderate',
      temperature: input.temperature,
      weight: input.weight,
      heartRate: input.heartRate,
      respiratoryRate: input.respiratoryRate,
      clinicalFindings: input.clinicalFindings,
      treatmentRequired: input.treatmentRequired,
      followUpDate: input.followUpDate,
      attachments: input.attachments || [],
      veterinarian: input.veterinarian || 'Dr. Imran Qureshi',
      status: input.status || 'Reported',
      cost: input.cost || 0,
      remarks: input.remarks || input.notes || '',
      notes: input.notes || input.remarks || '',
      createdAt: new Date().toISOString(),
    };

    this.db.healthRecords.unshift(newRecord);

    this.addHealthAuditLog({
      user: input.veterinarian || 'Dr. Imran Qureshi',
      action: 'Health Event Created',
      entity: 'HealthEvent',
      entityId: id,
      animalTag: animal.earTag || animal.animalId,
      newValue: `Diagnosis: ${newRecord.diagnosis}`,
      notes: `Logged health event for ${animal.earTag || animal.animalId}`,
    });

    this.commit();
    return newRecord;
  }

  public updateHealthRecord(id: string, input: Partial<HealthRecord>): HealthRecord {
    const record = this.db.healthRecords.find((h) => h.id === id);
    if (!record) throw new Error(`Health record ${id} not found.`);

    const oldDiagnosis = record.diagnosis;
    Object.assign(record, input);

    this.addHealthAuditLog({
      user: input.veterinarian || record.veterinarian || 'Dr. Imran Qureshi',
      action: 'Health Event Updated',
      entity: 'HealthEvent',
      entityId: id,
      animalTag: record.animalTag,
      oldValue: `Diagnosis: ${oldDiagnosis}`,
      newValue: `Diagnosis: ${record.diagnosis}`,
      notes: `Updated health event ${id}`,
    });

    this.commit();
    return record;
  }

  public deleteHealthRecord(id: string): void {
    const idx = this.db.healthRecords.findIndex((h) => h.id === id);
    if (idx !== -1) {
      this.db.healthRecords.splice(idx, 1);
      this.commit();
    }
  }

  // Treatments
  public getTreatments(animalId?: string): TreatmentRecord[] {
    let list = [...this.db.treatments];
    if (animalId) {
      const matchSet = this.getAnimalMatchSet(animalId);
      list = list.filter((t) => {
        const id = (t.animalId || '').toLowerCase();
        const tag = (t.animalTag || '').toLowerCase();
        return matchSet.has(id) || matchSet.has(tag);
      });
    }
    return list.sort((a, b) => (b.startDate || b.date).localeCompare(a.startDate || a.date));
  }

  public getTreatmentById(id: string): TreatmentRecord | undefined {
    return this.db.treatments.find((t) => t.id === id);
  }

  public createTreatment(input: Partial<TreatmentRecord>): TreatmentRecord {
    if (!input.animalId) throw new Error('Animal is required for veterinary treatment.');
    const animal = this.getAnimalById(input.animalId);
    if (!animal) throw new Error(`Animal not found: ${input.animalId}`);

    const startDate = input.startDate || input.date || new Date().toISOString().split('T')[0];
    const durationDays = Number(input.durationDays) || 3;
    const milkWithdrawalDays = Math.max(0, Number(input.milkWithdrawalDays) || 0);
    const meatWithdrawalDays = Math.max(0, Number(input.meatWithdrawalDays) || 0);

    // Auto-calculate hold until date
    const milkUsableDate = input.milkUsableDate || healthCalculationService.calculateMilkHoldUntil(startDate, milkWithdrawalDays);
    const isWithdrawalActive = milkWithdrawalDays > 0;

    // Decrease pharmacy stock & create ledger entry
    const medicine = this.db.medicines.find((m) => m.id === input.medicineId || m.name === input.medicineName);
    if (medicine) {
      let qtyToDeduct = 1;
      const parsedNum = parseFloat(input.dose || input.dosage || '');
      if (!isNaN(parsedNum) && parsedNum > 0 && medicine.unit === 'ml') {
        qtyToDeduct = parsedNum;
      }
      medicine.stockQuantity = Math.max(0, medicine.stockQuantity - qtyToDeduct);
      medicine.currentStock = medicine.stockQuantity;

      // Add Inventory Transaction (ISSUE / CONSUMPTION)
      const txId = `tx-med-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
      this.db.inventoryTransactions.unshift({
        id: txId,
        farmId: 'farm-001',
        itemType: 'Medicine',
        itemId: medicine.id,
        itemName: medicine.name,
        warehouseId: medicine.warehouseId || 'warehouse-003',
        warehouseName: medicine.warehouseName || 'Central Veterinary Pharmacy',
        transactionType: 'Consumption',
        quantity: qtyToDeduct,
        unit: medicine.unit,
        unitPrice: medicine.unitPrice,
        totalCost: qtyToDeduct * (medicine.unitPrice || 0),
        date: startDate,
        reason: `Administered for ${input.diagnosis || 'Treatment'}`,
        activity: 'Clinical Administration',
        animalId: animal.id,
        animalTag: animal.earTag || animal.animalId,
        performedBy: input.veterinarian || 'Dr. Imran Qureshi',
        notes: `Prescription: ${input.dosage || input.dose}. Hold until ${milkUsableDate}.`,
        createdAt: new Date().toISOString(),
      });

      this.addHealthAuditLog({
        user: input.veterinarian || 'Dr. Imran Qureshi',
        action: 'Medicine Issued',
        entity: 'Medicine',
        entityId: medicine.id,
        animalTag: animal.earTag || animal.animalId,
        oldValue: `Stock: ${medicine.stockQuantity + qtyToDeduct} ${medicine.unit}`,
        newValue: `Stock: ${medicine.stockQuantity} ${medicine.unit}`,
        notes: `Dispensed ${qtyToDeduct} ${medicine.unit} for ${animal.earTag || animal.animalId}`,
      });
    }

    const nextId = `treatment-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newRecord: TreatmentRecord = {
      id: nextId,
      farmId: 'farm-001',
      animalId: animal.id,
      animalTag: animal.earTag || animal.animalId,
      animalName: animal.name,
      healthRecordId: input.healthRecordId,
      date: startDate,
      startDate,
      problem: input.problem || input.diagnosis || 'Clinical Disease',
      diagnosis: input.diagnosis || input.problem || 'Veterinary Diagnosis',
      medicineId: input.medicineId || medicine?.id || 'med-0005',
      medicineName: input.medicineName || medicine?.name || 'Veterinary Medication',
      medicineBatch: input.medicineBatch || medicine?.batchNumber || 'OXY-LA-551',
      dose: input.dose || input.dosage || '25 ml',
      dosage: input.dosage || input.dose || '25 ml deep IM',
      doseUnit: input.doseUnit || medicine?.unit || 'ml',
      frequency: input.frequency || 'Once daily',
      route: input.route || 'Intramuscular',
      durationDays,
      milkWithdrawalDays,
      meatWithdrawalDays,
      treatmentInstructions: input.treatmentInstructions || '',
      veterinarian: input.veterinarian || input.administeredBy || 'Dr. Imran Qureshi',
      administeredBy: input.administeredBy || input.veterinarian || 'Dr. Imran Qureshi',
      treatmentCost: input.treatmentCost || input.cost || (medicine?.unitPrice ? medicine.unitPrice * 1.5 : 2500),
      cost: input.cost || input.treatmentCost || 2500,
      pharmacySource: input.pharmacySource || 'Central Veterinary Pharmacy',
      status: input.status || 'In Treatment',
      withdrawalStatus: isWithdrawalActive ? 'Active Hold' : 'Not Applicable',
      withdrawalStartDate: startDate,
      withdrawalEndDate: healthCalculationService.calculateMilkHoldUntil(startDate, durationDays),
      milkUsableDate,
      isWithdrawalActive,
      remarks: input.remarks || input.notes || '',
      notes: input.notes || input.remarks || '',
      createdAt: new Date().toISOString(),
    };

    this.db.treatments.unshift(newRecord);

    // If active milk withdrawal, update animal profile
    if (isWithdrawalActive) {
      animal.isWithdrawalActive = true;
      animal.remarks = `WITHDRAWAL HOLD: ${newRecord.medicineName} (${newRecord.dosage}) until ${milkUsableDate}. Do Not Milk Into Bulk Tank.`;

      this.addHealthAuditLog({
        user: newRecord.veterinarian,
        action: 'Milk Hold Created',
        entity: 'Treatment',
        entityId: nextId,
        animalTag: animal.earTag || animal.animalId,
        oldValue: 'Cleared for Tank',
        newValue: `Hold Until: ${milkUsableDate}`,
        notes: `Food safety antimicrobial milk discard hold until ${milkUsableDate}.`,
      });
    }

    this.addHealthAuditLog({
      user: newRecord.veterinarian,
      action: 'Treatment Started',
      entity: 'Treatment',
      entityId: nextId,
      animalTag: animal.earTag || animal.animalId,
      newValue: `${newRecord.diagnosis} treated with ${newRecord.medicineName} (${newRecord.dosage})`,
      notes: `Route: ${newRecord.route}. Duration: ${newRecord.durationDays} days.`,
    });

    this.commit();
    return newRecord;
  }

  public updateTreatment(id: string, input: Partial<TreatmentRecord>): TreatmentRecord {
    const t = this.db.treatments.find((item) => item.id === id);
    if (!t) throw new Error(`Treatment ${id} not found.`);

    Object.assign(t, input);
    if (input.startDate && input.milkWithdrawalDays !== undefined) {
      t.milkUsableDate = healthCalculationService.calculateMilkHoldUntil(input.startDate, input.milkWithdrawalDays);
      t.isWithdrawalActive = input.milkWithdrawalDays > 0;
    }

    this.addHealthAuditLog({
      user: input.veterinarian || t.veterinarian || 'Dr. Imran Qureshi',
      action: 'Treatment Updated',
      entity: 'Treatment',
      entityId: id,
      animalTag: t.animalTag,
      newValue: `Updated ${t.medicineName} treatment`,
      notes: `Status: ${t.status}. Route: ${t.route}.`,
    });

    this.commit();
    return t;
  }

  public completeTreatment(
    id: string,
    options?: { override?: boolean; overrideReason?: string; authorizedBy?: string }
  ): TreatmentRecord {
    const t = this.db.treatments.find((item) => item.id === id);
    if (!t) throw new Error(`Treatment not found: ${id}`);

    const todayStr = '2024-05-14'; // Farm baseline operational date
    const holdExpired = !t.milkUsableDate || t.milkUsableDate <= todayStr;

    if (!holdExpired && !options?.override && t.isWithdrawalActive) {
      throw new Error(
        `Milk withdrawal hold is active until ${t.milkUsableDate}. Normal completion blocked: Authorized laboratory override workflow required.`
      );
    }

    const previousStatus = t.status;
    t.status = 'Completed';
    t.isWithdrawalActive = false;
    t.withdrawalStatus = options?.override ? 'Override' : 'Cleared';
    t.completedAt = new Date().toISOString();
    t.completedBy = options?.authorizedBy || 'Dr. Imran Qureshi';
    if (options?.overrideReason) {
      t.overrideReason = options.overrideReason;
      t.overrideAuthorizedBy = options.authorizedBy;
    }

    // Refresh animal withdrawal state
    const animal = this.getAnimalById(t.animalId);
    if (animal) {
      const hasOtherActiveHold = this.db.treatments.some(
        (other) =>
          (other.animalId === t.animalId || other.animalTag === animal.animalId || other.animalTag === animal.earTag) &&
          other.id !== id &&
          other.isWithdrawalActive &&
          other.status !== 'Completed'
      );
      if (!hasOtherActiveHold) {
        animal.isWithdrawalActive = false;
        animal.remarks = 'Cleared for Bulk Tank Milk Sales.';
      }
    }

    this.addHealthAuditLog({
      user: options?.authorizedBy || t.veterinarian || 'Dr. Imran Qureshi',
      action: 'Treatment Completed',
      entity: 'Treatment',
      entityId: id,
      animalTag: t.animalTag,
      oldValue: `Status: ${previousStatus}`,
      newValue: 'Status: Completed',
      notes: `Treatment completed by ${t.completedBy}.`,
    });

    this.addHealthAuditLog({
      user: options?.authorizedBy || t.veterinarian || 'Dr. Imran Qureshi',
      action: options?.override ? 'Withdrawal Override' : 'Milk Hold Completed',
      entity: 'Treatment',
      entityId: id,
      animalTag: t.animalTag,
      oldValue: `Hold until ${t.milkUsableDate}`,
      newValue: options?.override ? 'Override Cleared' : 'Cleared for Tank',
      notes: options?.overrideReason || 'Antimicrobial withdrawal hold period completed.',
    });

    this.commit();
    return t;
  }

  // Vaccinations
  public getVaccinations(animalId?: string): VaccinationRecord[] {
    let list = [...this.db.vaccinations];
    if (animalId) {
      const matchSet = this.getAnimalMatchSet(animalId);
      list = list.filter((v) => {
        const id = (v.animalId || '').toLowerCase();
        const tag = (v.animalTag || '').toLowerCase();
        return matchSet.has(id) || matchSet.has(tag);
      });
    }
    return list.sort((a, b) => b.nextDueDate.localeCompare(a.nextDueDate));
  }

  public getVaccinationById(id: string): VaccinationRecord | undefined {
    return this.db.vaccinations.find((v) => v.id === id);
  }

  public createVaccination(input: Partial<VaccinationRecord>): VaccinationRecord {
    if (!input.vaccineName) throw new Error('Vaccine name is required.');
    const date = input.date || input.vaccinationDate || new Date().toISOString().split('T')[0];
    const nextDueDate = input.nextDueDate || healthCalculationService.calculateVaccineNextDueDate(date, 6);

    let animalTag = input.animalTag;
    if (input.animalId && !animalTag) {
      const cow = this.getAnimalById(input.animalId);
      animalTag = cow?.earTag || cow?.animalId;
    }

    // Deduct stock from pharmacy / cold chain inventory
    const vStock = this.db.vaccineStocks.find(
      (vs) => vs.vaccineName.toLowerCase() === input.vaccineName!.toLowerCase() || vs.name.toLowerCase() === input.vaccineName!.toLowerCase()
    );
    if (vStock && vStock.quantity > 0) {
      vStock.quantity -= 1;
      this.refreshAllWarehouseMetrics();

      this.db.inventoryTransactions.unshift({
        id: `tx-vac-${Date.now()}`,
        farmId: 'farm-001',
        itemType: 'Vaccine',
        itemId: vStock.id,
        itemName: vStock.vaccineName,
        warehouseId: vStock.warehouseId || 'warehouse-003',
        warehouseName: vStock.warehouseName || 'Central Veterinary Pharmacy & Cold Room',
        transactionType: 'Consumption',
        quantity: 1,
        unit: 'doses',
        date,
        reason: `Vaccination of ${animalTag || input.groupName || 'Herd'}`,
        activity: 'Prophylactic Immunization',
        performedBy: input.veterinarian || input.administeredBy || 'Dr. Imran Qureshi',
        notes: `Batch: ${input.batchNumber || vStock.batchNumber}. Next due: ${nextDueDate}.`,
        createdAt: new Date().toISOString(),
      });
    }

    const nextId = `vaccination-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    const newRecord: VaccinationRecord = {
      id: nextId,
      farmId: 'farm-001',
      animalId: input.animalId,
      animalTag,
      groupId: input.groupId,
      groupName: input.groupName,
      vaccineName: input.vaccineName,
      targetDisease: input.targetDisease || 'Herd Prophylaxis',
      date,
      vaccinationDate: date,
      nextDueDate,
      batchNumber: input.batchNumber || vStock?.batchNumber || 'VAC-PK-2024',
      manufacturer: input.manufacturer || vStock?.manufacturer || 'Veterinary Research Institute',
      veterinarian: input.veterinarian || input.administeredBy || 'Dr. Imran Qureshi',
      administeredBy: input.administeredBy || input.veterinarian || 'Dr. Imran Qureshi',
      status: input.status || 'Completed',
      dose: input.dose || input.dosage || '2 ml subcutaneous',
      dosage: input.dosage || input.dose || '2 ml',
      doseUnit: input.doseUnit || 'ml',
      route: input.route || 'Subcutaneous',
      cost: input.cost || 250,
      notes: input.notes || '',
      createdAt: new Date().toISOString(),
    };

    this.db.vaccinations.unshift(newRecord);

    this.addHealthAuditLog({
      user: newRecord.veterinarian,
      action: 'Vaccination Administered',
      entity: 'Vaccination',
      entityId: nextId,
      animalTag: animalTag || input.groupName,
      newValue: `${newRecord.vaccineName} (${newRecord.dose})`,
      notes: `Immunization recorded. Next booster scheduled for ${nextDueDate}.`,
    });

    this.commit();
    return newRecord;
  }

  public updateVaccination(id: string, input: Partial<VaccinationRecord>): VaccinationRecord {
    const v = this.db.vaccinations.find((item) => item.id === id);
    if (!v) throw new Error(`Vaccination record ${id} not found.`);
    Object.assign(v, input);
    this.commit();
    return v;
  }

  // Quarantine & Isolation
  public getQuarantineRecords(): QuarantineRecord[] {
    if (!this.db.quarantineRecords) this.db.quarantineRecords = [];
    return this.db.quarantineRecords.sort((a, b) => b.startDate.localeCompare(a.startDate));
  }

  public getQuarantineById(id: string): QuarantineRecord | undefined {
    return (this.db.quarantineRecords || []).find((q) => q.id === id);
  }

  public createQuarantineRecord(input: Partial<QuarantineRecord>): QuarantineRecord {
    if (!input.animalId) throw new Error('Animal is required for quarantine.');
    const animal = this.getAnimalById(input.animalId);
    if (!animal) throw new Error(`Animal not found: ${input.animalId}`);

    const id = `quar-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    const previousStatus = animal.status;

    const newRecord: QuarantineRecord = {
      id,
      farmId: 'farm-001',
      animalId: animal.id,
      animalTag: animal.earTag || animal.animalId,
      animalName: animal.name,
      reason: input.reason || 'Clinical Biocontainment & Observation',
      startDate: input.startDate || new Date().toISOString().split('T')[0],
      expectedReleaseDate: input.expectedReleaseDate || healthCalculationService.calculateMilkHoldUntil(input.startDate || '', 14),
      actualReleaseDate: undefined,
      isolationLocation: input.isolationLocation || 'Isolation Shed - Pen 1',
      responsiblePerson: input.responsiblePerson || 'Dr. Imran Qureshi',
      status: 'Active',
      previousAnimalStatus: previousStatus,
      releaseCriteria: input.releaseCriteria || '2 consecutive negative tests + normal rectal temp for 48h',
      notes: input.notes || '',
      createdAt: new Date().toISOString(),
    };

    if (!this.db.quarantineRecords) this.db.quarantineRecords = [];
    this.db.quarantineRecords.unshift(newRecord);

    // Update animal status to Quarantine
    animal.status = 'Quarantine';
    animal.location = newRecord.isolationLocation;

    this.addHealthAuditLog({
      user: newRecord.responsiblePerson,
      action: 'Animal Quarantined',
      entity: 'Quarantine',
      entityId: id,
      animalTag: animal.earTag || animal.animalId,
      oldValue: `Status: ${previousStatus}`,
      newValue: 'Status: Quarantine',
      notes: `Biocontainment transfer to ${newRecord.isolationLocation}. Reason: ${newRecord.reason}.`,
    });

    this.commit();
    return newRecord;
  }

  public releaseQuarantineRecord(id: string, dischargeNotes?: string): QuarantineRecord {
    const q = (this.db.quarantineRecords || []).find((item) => item.id === id);
    if (!q) throw new Error(`Quarantine record ${id} not found.`);

    q.status = 'Released';
    q.actualReleaseDate = new Date().toISOString().split('T')[0];
    q.dischargeNotes = dischargeNotes || 'Released upon meeting veterinary criteria.';

    // Restore animal status
    const animal = this.getAnimalById(q.animalId);
    if (animal) {
      animal.status = (q.previousAnimalStatus as any) || 'Lactating';
      animal.location = 'Barn B';
    }

    this.addHealthAuditLog({
      user: q.responsiblePerson || 'Dr. Imran Qureshi',
      action: 'Animal Released',
      entity: 'Quarantine',
      entityId: id,
      animalTag: q.animalTag,
      oldValue: 'Status: Quarantine',
      newValue: `Status: ${animal?.status || 'Lactating'}`,
      notes: dischargeNotes || 'Discharged from isolation quarantine to main herd.',
    });

    this.commit();
    return q;
  }

  // Health Audit Logs
  public getHealthAuditLogs(): HealthAuditLog[] {
    if (!this.db.healthAuditLogs) this.db.healthAuditLogs = [];
    return this.db.healthAuditLogs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }

  public addHealthAuditLog(log: Omit<HealthAuditLog, 'id' | 'farmId' | 'timestamp'>): HealthAuditLog {
    if (!this.db.healthAuditLogs) this.db.healthAuditLogs = [];
    const newLog: HealthAuditLog = {
      ...log,
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      farmId: 'farm-001',
      timestamp: new Date().toISOString(),
    };
    this.db.healthAuditLogs.unshift(newLog);
    return newLog;
  }

  // Real-time Health Dashboard Summary
  public getHealthDashboardSummary(): HealthDashboardSummary {
    const healthEventsCount = this.db.healthRecords.length;
    const activeTreatmentsCount = this.db.treatments.filter((t) => t.status === 'In Treatment').length;
    const vaccinationScheduleCount = this.db.vaccinations.length;
    const quarantineCount = (this.db.quarantineRecords || []).filter((q) => q.status === 'Active').length;
    const pharmacyCount = this.db.medicines.length;

    // Unique animals under active milk withdrawal hold
    const activeHolds = this.db.treatments.filter((t) => t.isWithdrawalActive && t.status !== 'Completed');
    const uniqueAnimalsWithHold = new Set(activeHolds.map((t) => t.animalTag || t.animalId));
    const activeMilkWithdrawalCount = uniqueAnimalsWithHold.size;

    // Overdue vaccinations
    const todayStr = '2024-05-14';
    const overdueVaccinationsCount = this.db.vaccinations.filter(
      (v) => v.status === 'Overdue' || (v.nextDueDate < todayStr && v.status !== 'Completed')
    ).length;

    // Expiring medicines within 60 days
    const expiringMedicinesCount = this.db.medicines.filter((m) => {
      const exp = healthCalculationService.evaluateMedicineExpiry(m.expiryDate, 60, todayStr);
      return exp.status === 'Expiring Soon' || exp.status === 'Expired';
    }).length;

    return {
      healthEventsCount,
      activeTreatmentsCount,
      vaccinationScheduleCount,
      quarantineCount,
      pharmacyCount,
      activeMilkWithdrawalCount,
      overdueVaccinationsCount,
      expiringMedicinesCount,
    };
  }

  // ==========================================
  // Supplies & Warehouse Stock Management
  // ==========================================

  public refreshAllWarehouseMetrics(): void {
    if (!this.db.warehouses) return;

    this.db.warehouses.forEach((wh) => {
      let stockSum = 0;
      let skuCount = 0;

      // Feed items in this warehouse
      const feeds = (this.db.feedItems || []).filter((f) => f.warehouseId === wh.id || f.warehouseName === wh.name);
      feeds.forEach((f) => {
        stockSum += Number(f.currentStockKg || f.currentStock || 0);
        skuCount++;
      });

      // Medicines in this warehouse
      const meds = (this.db.medicines || []).filter((m) => m.warehouseId === wh.id || m.warehouseName === wh.name);
      meds.forEach((m) => {
        stockSum += Number(m.stockQuantity || m.currentStock || m.quantity || 0);
        skuCount++;
      });

      // Vaccines in this warehouse
      const vacs = (this.db.vaccineStocks || []).filter((v) => v.warehouseId === wh.id || v.warehouseName === wh.name);
      vacs.forEach((v) => {
        stockSum += Number(v.quantity || 0);
        skuCount++;
      });

      // Semen straws in this warehouse
      const semens = (this.db.semenStraws || []).filter((s) => s.tankNumber.includes(wh.code) || wh.type === 'Cryogenic Semen Bank');
      if (wh.type === 'Cryogenic Semen Bank') {
        semens.forEach((s) => {
          stockSum += Number(s.quantity || 0);
          skuCount++;
        });
      }

      wh.currentStock = Math.round(stockSum * 10) / 10;
      wh.totalItems = skuCount;
      wh.currentUtilization = inventoryCalculationService.calculateWarehouseUtilization(wh.currentStock, wh.capacity);
    });
  }

  // --- Feed Items CRUD ---
  public getFeedItems(): FeedItem[] {
    return (this.db.feedItems || []).map((f) => {
      const stock = f.currentStockKg ?? f.currentStock ?? 0;
      const min = f.minStockThresholdKg ?? f.minAlertLevel ?? 0;
      const statusObj = inventoryCalculationService.calculateStockStatus(stock, min);
      return {
        ...f,
        currentStockKg: stock,
        currentStock: stock,
        minStockThresholdKg: min,
        minAlertLevel: min,
        status: statusObj.status,
      };
    });
  }

  public getFeedItemById(id: string): FeedItem | undefined {
    return this.getFeedItems().find((f) => f.id === id);
  }

  public createFeedItem(input: Partial<FeedItem>): FeedItem {
    if (!input.name || input.name.trim().length < 2) {
      throw new Error('Feed Name is required (at least 2 characters).');
    }
    const currentStock = Math.max(0, Number(input.currentStockKg ?? input.currentStock ?? 0));
    const minAlertLevel = Math.max(0, Number(input.minStockThresholdKg ?? input.minAlertLevel ?? 1000));
    const unitPrice = Math.max(0, Number(input.unitPrice ?? 0));
    const dryMatterPercent = Math.min(100, Math.max(0, Number(input.dryMatterPercent ?? 30)));
    const statusObj = inventoryCalculationService.calculateStockStatus(currentStock, minAlertLevel);

    const warehouseId = input.warehouseId || (input.category === 'Silage' ? 'warehouse-001' : 'warehouse-002');
    const warehouseObj = (this.db.warehouses || []).find((w) => w.id === warehouseId);
    const warehouseName = input.warehouseName || (warehouseObj ? warehouseObj.name : 'Main Feed & Concentrate Shed');

    const nextId = `feed-${String((this.db.feedItems?.length || 0) + 1).padStart(4, '0')}`;
    const newFeed: FeedItem = {
      id: nextId,
      farmId: 'farm-001',
      name: input.name.trim(),
      category: input.category || 'Concentrate',
      currentStockKg: currentStock,
      currentStock: currentStock,
      unit: input.unit || 'kg',
      minStockThresholdKg: minAlertLevel,
      minAlertLevel: minAlertLevel,
      unitPrice,
      dryMatterPercent,
      crudeProteinPercent: Number(input.crudeProteinPercent) || 12,
      supplierId: input.supplierId || 'supplier-0001',
      supplierName: input.supplierName || input.supplier || 'National Feed Supply',
      supplier: input.supplier || input.supplierName || 'National Feed Supply',
      purchaseDate: input.purchaseDate || new Date().toISOString().split('T')[0],
      expiryDate: input.expiryDate || '2025-06-30',
      warehouseId,
      warehouseName,
      warehouse: warehouseName,
      notes: input.notes || '',
      batchNumber: input.batchNumber || `FD-${Date.now().toString().slice(-4)}`,
      status: statusObj.status,
    };

    if (!this.db.feedItems) this.db.feedItems = [];
    this.db.feedItems.push(newFeed);
    this.refreshAllWarehouseMetrics();
    this.commit();
    return newFeed;
  }

  public updateFeedItem(id: string, input: Partial<FeedItem>): FeedItem {
    const item = (this.db.feedItems || []).find((f) => f.id === id);
    if (!item) throw new Error(`Feed Item not found: ${id}`);

    if (input.name !== undefined) item.name = input.name.trim();
    if (input.category !== undefined) item.category = input.category;
    if (input.currentStockKg !== undefined || input.currentStock !== undefined) {
      const stock = Math.max(0, Number(input.currentStockKg ?? input.currentStock ?? 0));
      item.currentStockKg = stock;
      item.currentStock = stock;
    }
    if (input.unit !== undefined) item.unit = input.unit;
    if (input.minStockThresholdKg !== undefined || input.minAlertLevel !== undefined) {
      const min = Math.max(0, Number(input.minStockThresholdKg ?? input.minAlertLevel ?? 0));
      item.minStockThresholdKg = min;
      item.minAlertLevel = min;
    }
    if (input.unitPrice !== undefined) item.unitPrice = Math.max(0, Number(input.unitPrice));
    if (input.dryMatterPercent !== undefined) item.dryMatterPercent = Number(input.dryMatterPercent);
    if (input.crudeProteinPercent !== undefined) item.crudeProteinPercent = Number(input.crudeProteinPercent);
    if (input.supplier !== undefined) item.supplier = input.supplier;
    if (input.supplierName !== undefined) item.supplierName = input.supplierName;
    if (input.purchaseDate !== undefined) item.purchaseDate = input.purchaseDate;
    if (input.expiryDate !== undefined) item.expiryDate = input.expiryDate;
    if (input.warehouseId !== undefined) {
      item.warehouseId = input.warehouseId;
      const wh = (this.db.warehouses || []).find((w) => w.id === input.warehouseId);
      if (wh) {
        item.warehouseName = wh.name;
        item.warehouse = wh.name;
      }
    }
    if (input.warehouseName !== undefined) {
      item.warehouseName = input.warehouseName;
      item.warehouse = input.warehouseName;
    }
    if (input.notes !== undefined) item.notes = input.notes;
    if (input.batchNumber !== undefined) item.batchNumber = input.batchNumber;

    item.status = inventoryCalculationService.calculateStockStatus(item.currentStockKg, item.minStockThresholdKg).status;

    this.refreshAllWarehouseMetrics();
    this.commit();
    return item;
  }

  public deleteFeedItem(id: string): boolean {
    const idx = (this.db.feedItems || []).findIndex((f) => f.id === id);
    if (idx === -1) return false;
    this.db.feedItems.splice(idx, 1);
    this.refreshAllWarehouseMetrics();
    this.commit();
    return true;
  }

  // --- Medicines CRUD ---
  public getMedicines(): Medicine[] {
    return (this.db.medicines || []).map((m) => {
      const qty = m.currentStock ?? m.stockQuantity ?? m.quantity ?? 0;
      const min = m.minAlertLevel ?? m.lowStockThreshold ?? 5;
      const expRes = inventoryCalculationService.calculateMedicineExpiry(m.expiryDate);
      const status = expRes.isExpired
        ? 'Expired'
        : inventoryCalculationService.calculateStockStatus(qty, min).status;

      return {
        ...m,
        stockQuantity: qty,
        currentStock: qty,
        quantity: qty,
        minAlertLevel: min,
        lowStockThreshold: min,
        unitPrice: m.cost ?? m.unitPrice ?? 0,
        cost: m.cost ?? m.unitPrice ?? 0,
        withdrawalDays: m.withdrawalDays ?? m.withdrawalDaysMilk ?? 0,
        withdrawalDaysMilk: m.withdrawalDaysMilk ?? m.withdrawalDays ?? 0,
        status,
      };
    });
  }

  public getMedicineById(id: string): Medicine | undefined {
    return this.getMedicines().find((m) => m.id === id);
  }

  public createMedicine(input: Partial<Medicine>): Medicine {
    if (!input.name || input.name.trim().length < 2) {
      throw new Error('Medicine Name is required (at least 2 characters).');
    }
    if (!input.batchNumber || input.batchNumber.trim().length < 1) {
      throw new Error('Batch Number is required.');
    }
    const qty = Math.max(0, Number(input.stockQuantity ?? input.currentStock ?? input.quantity ?? 0));
    const cost = Math.max(0, Number(input.cost ?? input.unitPrice ?? 0));
    const withdrawalDays = Math.max(0, Number(input.withdrawalDays ?? input.withdrawalDaysMilk ?? 0));
    const minAlert = Math.max(0, Number(input.minAlertLevel ?? input.lowStockThreshold ?? 5));

    const warehouseId = input.warehouseId || 'warehouse-003';
    const wh = (this.db.warehouses || []).find((w) => w.id === warehouseId);
    const warehouseName = input.warehouseName || (wh ? wh.name : 'Central Veterinary Pharmacy & Cold Room');

    const nextId = `medicine-${String((this.db.medicines?.length || 0) + 1).padStart(4, '0')}`;
    const expRes = inventoryCalculationService.calculateMedicineExpiry(input.expiryDate);
    const status = expRes.isExpired
      ? 'Expired'
      : inventoryCalculationService.calculateStockStatus(qty, minAlert).status;

    const newMed: Medicine = {
      id: nextId,
      farmId: 'farm-001',
      name: input.name.trim(),
      batchNumber: input.batchNumber.trim(),
      category: input.category || 'Antibiotic',
      manufacturer: input.manufacturer || 'Pfizer / Zoetis',
      stockQuantity: qty,
      currentStock: qty,
      quantity: qty,
      unit: input.unit || 'vial',
      unitPrice: cost,
      cost,
      purchaseDate: input.purchaseDate || new Date().toISOString().split('T')[0],
      expiryDate: input.expiryDate || '2025-12-31',
      withdrawalDays,
      withdrawalDaysMilk: withdrawalDays,
      withdrawalDaysMeat: Number(input.withdrawalDaysMeat) || 14,
      supplierId: input.supplierId || 'supplier-0002',
      supplierName: input.supplierName || input.supplier || 'Al-Faisal Veterinary Pharma',
      supplier: input.supplier || input.supplierName || 'Al-Faisal Veterinary Pharma',
      warehouseId,
      warehouseName,
      warehouse: warehouseName,
      lowStockThreshold: minAlert,
      minAlertLevel: minAlert,
      notes: input.notes || '',
      status,
    };

    if (!this.db.medicines) this.db.medicines = [];
    this.db.medicines.push(newMed);
    this.refreshAllWarehouseMetrics();
    this.commit();
    return newMed;
  }

  public updateMedicine(id: string, input: Partial<Medicine>): Medicine {
    const med = (this.db.medicines || []).find((m) => m.id === id);
    if (!med) throw new Error(`Medicine not found: ${id}`);

    if (input.name !== undefined) med.name = input.name.trim();
    if (input.batchNumber !== undefined) med.batchNumber = input.batchNumber.trim();
    if (input.category !== undefined) med.category = input.category;
    if (input.manufacturer !== undefined) med.manufacturer = input.manufacturer;
    if (input.stockQuantity !== undefined || input.currentStock !== undefined || input.quantity !== undefined) {
      const q = Math.max(0, Number(input.stockQuantity ?? input.currentStock ?? input.quantity ?? 0));
      med.stockQuantity = q;
      med.currentStock = q;
      med.quantity = q;
    }
    if (input.unit !== undefined) med.unit = input.unit;
    if (input.cost !== undefined || input.unitPrice !== undefined) {
      const c = Math.max(0, Number(input.cost ?? input.unitPrice ?? 0));
      med.cost = c;
      med.unitPrice = c;
    }
    if (input.purchaseDate !== undefined) med.purchaseDate = input.purchaseDate;
    if (input.expiryDate !== undefined) med.expiryDate = input.expiryDate;
    if (input.withdrawalDays !== undefined || input.withdrawalDaysMilk !== undefined) {
      const wd = Math.max(0, Number(input.withdrawalDays ?? input.withdrawalDaysMilk ?? 0));
      med.withdrawalDays = wd;
      med.withdrawalDaysMilk = wd;
    }
    if (input.withdrawalDaysMeat !== undefined) med.withdrawalDaysMeat = Number(input.withdrawalDaysMeat);
    if (input.supplier !== undefined) med.supplier = input.supplier;
    if (input.supplierName !== undefined) med.supplierName = input.supplierName;
    if (input.warehouseId !== undefined) {
      med.warehouseId = input.warehouseId;
      const wh = (this.db.warehouses || []).find((w) => w.id === input.warehouseId);
      if (wh) {
        med.warehouseName = wh.name;
        med.warehouse = wh.name;
      }
    }
    if (input.warehouseName !== undefined) {
      med.warehouseName = input.warehouseName;
      med.warehouse = input.warehouseName;
    }
    if (input.minAlertLevel !== undefined || input.lowStockThreshold !== undefined) {
      const min = Math.max(0, Number(input.minAlertLevel ?? input.lowStockThreshold ?? 5));
      med.minAlertLevel = min;
      med.lowStockThreshold = min;
    }
    if (input.notes !== undefined) med.notes = input.notes;

    const expRes = inventoryCalculationService.calculateMedicineExpiry(med.expiryDate);
    med.status = expRes.isExpired
      ? 'Expired'
      : inventoryCalculationService.calculateStockStatus(med.stockQuantity, med.lowStockThreshold).status;

    this.refreshAllWarehouseMetrics();
    this.commit();
    return med;
  }

  public deleteMedicine(id: string): boolean {
    const idx = (this.db.medicines || []).findIndex((m) => m.id === id);
    if (idx === -1) return false;
    this.db.medicines.splice(idx, 1);
    this.refreshAllWarehouseMetrics();
    this.commit();
    return true;
  }

  // --- Vaccines CRUD ---
  public getVaccines(): VaccineStock[] {
    return (this.db.vaccineStocks || []).map((v) => {
      const min = v.minStockLevel || 30;
      const expRes = inventoryCalculationService.calculateMedicineExpiry(v.expiryDate);
      const status = expRes.isExpired
        ? 'Expired'
        : inventoryCalculationService.calculateStockStatus(v.quantity, min).status;
      return {
        ...v,
        status,
      };
    });
  }

  public getVaccineById(id: string): VaccineStock | undefined {
    return this.getVaccines().find((v) => v.id === id);
  }

  public createVaccine(input: Partial<VaccineStock>): VaccineStock {
    if (!input.vaccineName && !input.name) {
      throw new Error('Vaccine Name is required.');
    }
    if (!input.manufacturer) {
      throw new Error('Manufacturer is required.');
    }
    if (!input.batchNumber) {
      throw new Error('Batch Number is required.');
    }
    const name = (input.vaccineName || input.name || '').trim();
    const qty = Math.max(0, Number(input.quantity ?? 0));
    const minLevel = Math.max(0, Number(input.minStockLevel ?? 30));
    const expRes = inventoryCalculationService.calculateMedicineExpiry(input.expiryDate);
    const status = expRes.isExpired
      ? 'Expired'
      : inventoryCalculationService.calculateStockStatus(qty, minLevel).status;

    const warehouseId = input.warehouseId || 'warehouse-003';
    const wh = (this.db.warehouses || []).find((w) => w.id === warehouseId);
    const warehouseName = input.warehouseName || (wh ? wh.name : 'Central Veterinary Pharmacy & Cold Room');

    const nextId = `vaccine-${String((this.db.vaccineStocks?.length || 0) + 1).padStart(4, '0')}`;
    const newVac: VaccineStock = {
      id: nextId,
      farmId: 'farm-001',
      name,
      vaccineName: name,
      manufacturer: input.manufacturer.trim(),
      batchNumber: input.batchNumber.trim(),
      expiryDate: input.expiryDate || '2025-06-30',
      quantity: qty,
      unit: input.unit || 'doses',
      storageTemperature: input.storageTemperature || '2°C - 8°C (Cold Chain)',
      warehouseId,
      warehouseName,
      warehouse: warehouseName,
      supplier: input.supplier || 'Veterinary Research Institute',
      unitPrice: Number(input.unitPrice) || 200,
      minStockLevel: minLevel,
      status,
      targetDisease: input.targetDisease || 'Livestock Epidemic Prevention',
      notes: input.notes || '',
      createdAt: new Date().toISOString(),
    };

    if (!this.db.vaccineStocks) this.db.vaccineStocks = [];
    this.db.vaccineStocks.push(newVac);
    this.refreshAllWarehouseMetrics();
    this.commit();
    return newVac;
  }

  public updateVaccine(id: string, input: Partial<VaccineStock>): VaccineStock {
    const vac = (this.db.vaccineStocks || []).find((v) => v.id === id);
    if (!vac) throw new Error(`Vaccine not found: ${id}`);

    if (input.vaccineName !== undefined || input.name !== undefined) {
      const n = (input.vaccineName || input.name || '').trim();
      vac.name = n;
      vac.vaccineName = n;
    }
    if (input.manufacturer !== undefined) vac.manufacturer = input.manufacturer.trim();
    if (input.batchNumber !== undefined) vac.batchNumber = input.batchNumber.trim();
    if (input.expiryDate !== undefined) vac.expiryDate = input.expiryDate;
    if (input.quantity !== undefined) vac.quantity = Math.max(0, Number(input.quantity));
    if (input.unit !== undefined) vac.unit = input.unit;
    if (input.storageTemperature !== undefined) vac.storageTemperature = input.storageTemperature;
    if (input.unitPrice !== undefined) vac.unitPrice = Math.max(0, Number(input.unitPrice));
    if (input.minStockLevel !== undefined) vac.minStockLevel = Math.max(0, Number(input.minStockLevel));
    if (input.supplier !== undefined) vac.supplier = input.supplier;
    if (input.targetDisease !== undefined) vac.targetDisease = input.targetDisease;
    if (input.notes !== undefined) vac.notes = input.notes;
    if (input.warehouseId !== undefined) {
      vac.warehouseId = input.warehouseId;
      const wh = (this.db.warehouses || []).find((w) => w.id === input.warehouseId);
      if (wh) {
        vac.warehouseName = wh.name;
        vac.warehouse = wh.name;
      }
    }

    const expRes = inventoryCalculationService.calculateMedicineExpiry(vac.expiryDate);
    vac.status = expRes.isExpired
      ? 'Expired'
      : inventoryCalculationService.calculateStockStatus(vac.quantity, vac.minStockLevel || 30).status;

    this.refreshAllWarehouseMetrics();
    this.commit();
    return vac;
  }

  public deleteVaccine(id: string): boolean {
    const idx = (this.db.vaccineStocks || []).findIndex((v) => v.id === id);
    if (idx === -1) return false;
    this.db.vaccineStocks.splice(idx, 1);
    this.refreshAllWarehouseMetrics();
    this.commit();
    return true;
  }

  // --- Semen Straws CRUD ---
  public getSemenStraws(): SemenStraw[] {
    return (this.db.semenStraws || []).map((s) => {
      const nitr = inventoryCalculationService.calculateNitrogenStatus(s.nitrogenLevel, s.minNitrogenLevel || 25);
      return {
        ...s,
        nitrogenStatus: nitr.status,
        status: inventoryCalculationService.calculateStockStatus(s.quantity, 10).status,
      };
    });
  }

  public getSemenStrawById(id: string): SemenStraw | undefined {
    return this.getSemenStraws().find((s) => s.id === id);
  }

  public createSemenStraw(input: Partial<SemenStraw>): SemenStraw {
    if (!input.bullName || input.bullName.trim().length < 2) {
      throw new Error('Bull Name is required.');
    }
    if (!input.breed) {
      throw new Error('Breed is required.');
    }
    if (!input.strawCode) {
      throw new Error('Straw Code is required.');
    }
    const qty = Math.max(0, Number(input.quantity ?? 0));
    const nitrLevel = Math.max(0, Math.min(100, Number(input.nitrogenLevel ?? 80)));
    const minNitr = Math.max(0, Number(input.minNitrogenLevel ?? 25));
    const nitr = inventoryCalculationService.calculateNitrogenStatus(nitrLevel, minNitr);

    const nextId = `semen-${String((this.db.semenStraws?.length || 0) + 1).padStart(4, '0')}`;
    const newStraw: SemenStraw = {
      id: nextId,
      farmId: 'farm-001',
      bullName: input.bullName.trim(),
      breed: input.breed,
      strawCode: input.strawCode.trim(),
      quantity: qty,
      collectionDate: input.collectionDate || new Date().toISOString().split('T')[0],
      tankNumber: input.tankNumber || 'Tank 1 (MVE-XC33)',
      canisterNumber: input.canisterNumber || 'Canister 1',
      position: input.position || 'Upper Rack P-01',
      nitrogenLevel: nitrLevel,
      minNitrogenLevel: minNitr,
      nitrogenStatus: nitr.status,
      conceptionRate: input.conceptionRate || '70%',
      supplier: input.supplier || 'Alta Genetics / ABS Global',
      unitCost: Number(input.unitCost ?? input.unitPrice ?? 3500),
      unitPrice: Number(input.unitCost ?? input.unitPrice ?? 3500),
      notes: input.notes || '',
      status: inventoryCalculationService.calculateStockStatus(qty, 10).status,
      createdAt: new Date().toISOString(),
    };

    if (!this.db.semenStraws) this.db.semenStraws = [];
    this.db.semenStraws.push(newStraw);
    this.refreshAllWarehouseMetrics();
    this.commit();
    return newStraw;
  }

  public updateSemenStraw(id: string, input: Partial<SemenStraw>): SemenStraw {
    const straw = (this.db.semenStraws || []).find((s) => s.id === id);
    if (!straw) throw new Error(`Semen Straw record not found: ${id}`);

    if (input.bullName !== undefined) straw.bullName = input.bullName.trim();
    if (input.breed !== undefined) straw.breed = input.breed;
    if (input.strawCode !== undefined) straw.strawCode = input.strawCode.trim();
    if (input.quantity !== undefined) straw.quantity = Math.max(0, Number(input.quantity));
    if (input.collectionDate !== undefined) straw.collectionDate = input.collectionDate;
    if (input.tankNumber !== undefined) straw.tankNumber = input.tankNumber;
    if (input.canisterNumber !== undefined) straw.canisterNumber = input.canisterNumber;
    if (input.position !== undefined) straw.position = input.position;
    if (input.nitrogenLevel !== undefined) straw.nitrogenLevel = Math.max(0, Math.min(100, Number(input.nitrogenLevel)));
    if (input.minNitrogenLevel !== undefined) straw.minNitrogenLevel = Math.max(0, Number(input.minNitrogenLevel));
    if (input.conceptionRate !== undefined) straw.conceptionRate = input.conceptionRate;
    if (input.supplier !== undefined) straw.supplier = input.supplier;
    if (input.unitCost !== undefined || input.unitPrice !== undefined) {
      const c = Number(input.unitCost ?? input.unitPrice);
      straw.unitCost = c;
      straw.unitPrice = c;
    }
    if (input.notes !== undefined) straw.notes = input.notes;

    const nitr = inventoryCalculationService.calculateNitrogenStatus(straw.nitrogenLevel, straw.minNitrogenLevel || 25);
    straw.nitrogenStatus = nitr.status;
    straw.status = inventoryCalculationService.calculateStockStatus(straw.quantity, 10).status;

    this.refreshAllWarehouseMetrics();
    this.commit();
    return straw;
  }

  public deleteSemenStraw(id: string): boolean {
    const idx = (this.db.semenStraws || []).findIndex((s) => s.id === id);
    if (idx === -1) return false;
    this.db.semenStraws.splice(idx, 1);
    this.refreshAllWarehouseMetrics();
    this.commit();
    return true;
  }

  // --- Warehouses CRUD ---
  public getWarehouses(): Warehouse[] {
    this.refreshAllWarehouseMetrics();
    return this.db.warehouses || [];
  }

  public getWarehouseById(id: string): Warehouse | undefined {
    return this.getWarehouses().find((w) => w.id === id);
  }

  public createWarehouse(input: Partial<Warehouse>): Warehouse {
    if (!input.name || input.name.trim().length < 2) {
      throw new Error('Warehouse Name is required.');
    }
    const cap = Math.max(1, Number(input.capacity || 10000));
    const nextId = `warehouse-${String((this.db.warehouses?.length || 0) + 1).padStart(3, '0')}`;
    const newWh: Warehouse = {
      id: nextId,
      farmId: 'farm-001',
      name: input.name.trim(),
      code: input.code || `WH-${String((this.db.warehouses?.length || 0) + 1).padStart(2, '0')}`,
      type: input.type || 'General Store',
      capacity: cap,
      currentStock: 0,
      currentUtilization: 0,
      totalItems: 0,
      location: input.location || 'Green Dairy Farm Yard',
      manager: input.manager || 'Farm Operations Manager',
      temperatureControlled: Boolean(input.temperatureControlled),
      notes: input.notes || '',
      createdAt: new Date().toISOString(),
    };

    if (!this.db.warehouses) this.db.warehouses = [];
    this.db.warehouses.push(newWh);
    this.refreshAllWarehouseMetrics();
    this.commit();
    return newWh;
  }

  public updateWarehouse(id: string, input: Partial<Warehouse>): Warehouse {
    const wh = (this.db.warehouses || []).find((w) => w.id === id);
    if (!wh) throw new Error(`Warehouse not found: ${id}`);

    if (input.name !== undefined) wh.name = input.name.trim();
    if (input.code !== undefined) wh.code = input.code.trim();
    if (input.type !== undefined) wh.type = input.type;
    if (input.capacity !== undefined) wh.capacity = Math.max(1, Number(input.capacity));
    if (input.location !== undefined) wh.location = input.location;
    if (input.manager !== undefined) wh.manager = input.manager;
    if (input.temperatureControlled !== undefined) wh.temperatureControlled = Boolean(input.temperatureControlled);
    if (input.notes !== undefined) wh.notes = input.notes;

    this.refreshAllWarehouseMetrics();
    this.commit();
    return wh;
  }

  public deleteWarehouse(id: string): boolean {
    const idx = (this.db.warehouses || []).findIndex((w) => w.id === id);
    if (idx === -1) return false;
    this.db.warehouses.splice(idx, 1);
    this.commit();
    return true;
  }

  // --- Transactions (Purchases & Consumptions) ---
  public getInventoryTransactions(): InventoryTransaction[] {
    return (this.db.inventoryTransactions || []).sort((a, b) => b.date.localeCompare(a.date));
  }

  public recordInventoryPurchase(
    input: Omit<InventoryTransaction, 'id' | 'farmId' | 'createdAt'>
  ): InventoryTransaction {
    const qty = Math.max(0, Number(input.quantity));
    if (qty <= 0) throw new Error('Purchase quantity must be greater than zero.');

    const unitPrice = Math.max(0, Number(input.unitPrice || 0));
    const totalCost = input.totalCost !== undefined ? Number(input.totalCost) : Math.round(qty * unitPrice * 100) / 100;

    // Apply stock increase to target item
    if (input.itemType === 'Feed') {
      const feed = (this.db.feedItems || []).find((f) => f.id === input.itemId || f.name.toLowerCase() === input.itemName.toLowerCase());
      if (feed) {
        feed.currentStockKg = (feed.currentStockKg || 0) + qty;
        feed.currentStock = feed.currentStockKg;
        if (unitPrice > 0) feed.unitPrice = unitPrice;
        feed.status = inventoryCalculationService.calculateStockStatus(feed.currentStockKg, feed.minStockThresholdKg).status;
      }
    } else if (input.itemType === 'Medicine') {
      const med = (this.db.medicines || []).find((m) => m.id === input.itemId || m.name.toLowerCase() === input.itemName.toLowerCase());
      if (med) {
        med.stockQuantity = (med.stockQuantity || 0) + qty;
        med.currentStock = med.stockQuantity;
        med.quantity = med.stockQuantity;
        if (unitPrice > 0) {
          med.cost = unitPrice;
          med.unitPrice = unitPrice;
        }
        med.status = inventoryCalculationService.calculateStockStatus(med.stockQuantity, med.lowStockThreshold).status;
      }
    } else if (input.itemType === 'Vaccine') {
      const vac = (this.db.vaccineStocks || []).find((v) => v.id === input.itemId || v.vaccineName.toLowerCase() === input.itemName.toLowerCase());
      if (vac) {
        vac.quantity = (vac.quantity || 0) + qty;
        if (unitPrice > 0) vac.unitPrice = unitPrice;
        vac.status = inventoryCalculationService.calculateStockStatus(vac.quantity, vac.minStockLevel || 30).status;
      }
    } else if (input.itemType === 'Semen') {
      const straw = (this.db.semenStraws || []).find((s) => s.id === input.itemId || s.strawCode === input.itemId || s.bullName.toLowerCase() === input.itemName.toLowerCase());
      if (straw) {
        straw.quantity = (straw.quantity || 0) + qty;
        if (unitPrice > 0) {
          straw.unitCost = unitPrice;
          straw.unitPrice = unitPrice;
        }
        straw.status = inventoryCalculationService.calculateStockStatus(straw.quantity, 10).status;
      }
    }

    const nextId = `inv-tx-${String((this.db.inventoryTransactions?.length || 0) + 1).padStart(4, '0')}`;
    const newTx: InventoryTransaction = {
      ...input,
      id: nextId,
      farmId: 'farm-001',
      transactionType: 'Purchase',
      quantity: qty,
      unitPrice,
      totalCost,
      date: input.date || new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
    };

    if (!this.db.inventoryTransactions) this.db.inventoryTransactions = [];
    this.db.inventoryTransactions.unshift(newTx);

    // Also record an Expense automatically in financial ledger if cost > 0
    if (totalCost > 0) {
      const expCategory = input.itemType === 'Feed' ? 'Feed' : input.itemType === 'Medicine' || input.itemType === 'Vaccine' ? 'Medicine' : 'Veterinary';
      try {
        this.createExpense({
          date: newTx.date,
          category: expCategory,
          amount: totalCost,
          payee: input.supplier || 'Inventory Supplier',
          paymentMethod: 'Cash',
          description: `Stock Purchase: ${qty} ${input.unit} of ${input.itemName} (Invoice #${input.invoiceNo || 'N/A'})`,
        });
      } catch {
        // Continue even if financial ledger auto-entry encounters a non-fatal edge
      }
    }

    this.refreshAllWarehouseMetrics();
    this.commit();
    return newTx;
  }

  public recordInventoryConsumption(
    input: Omit<InventoryTransaction, 'id' | 'farmId' | 'createdAt'>
  ): InventoryTransaction {
    const qty = Math.max(0, Number(input.quantity));
    if (qty <= 0) throw new Error('Consumption quantity must be greater than zero.');

    let unitPrice = Number(input.unitPrice || 0);

    // Apply stock decrease with safety check
    if (input.itemType === 'Feed') {
      const feed = (this.db.feedItems || []).find((f) => f.id === input.itemId || f.name.toLowerCase() === input.itemName.toLowerCase());
      if (feed) {
        if ((feed.currentStockKg || 0) < qty) {
          throw new Error(`Insufficient feed stock. Available: ${feed.currentStockKg} ${feed.unit}, requested: ${qty} ${feed.unit}`);
        }
        feed.currentStockKg -= qty;
        feed.currentStock = feed.currentStockKg;
        if (!unitPrice) unitPrice = feed.unitPrice || 0;
        feed.status = inventoryCalculationService.calculateStockStatus(feed.currentStockKg, feed.minStockThresholdKg).status;
      }
    } else if (input.itemType === 'Medicine') {
      const med = (this.db.medicines || []).find((m) => m.id === input.itemId || m.name.toLowerCase() === input.itemName.toLowerCase());
      if (med) {
        if ((med.stockQuantity || 0) < qty) {
          throw new Error(`Insufficient medicine stock. Available: ${med.stockQuantity} ${med.unit}, requested: ${qty} ${med.unit}`);
        }
        med.stockQuantity -= qty;
        med.currentStock = med.stockQuantity;
        med.quantity = med.stockQuantity;
        if (!unitPrice) unitPrice = med.cost || med.unitPrice || 0;
        med.status = inventoryCalculationService.calculateStockStatus(med.stockQuantity, med.lowStockThreshold).status;
      }
    } else if (input.itemType === 'Vaccine') {
      const vac = (this.db.vaccineStocks || []).find((v) => v.id === input.itemId || v.vaccineName.toLowerCase() === input.itemName.toLowerCase());
      if (vac) {
        if ((vac.quantity || 0) < qty) {
          throw new Error(`Insufficient vaccine doses. Available: ${vac.quantity} doses, requested: ${qty} doses`);
        }
        vac.quantity -= qty;
        if (!unitPrice) unitPrice = vac.unitPrice || 0;
        vac.status = inventoryCalculationService.calculateStockStatus(vac.quantity, vac.minStockLevel || 30).status;
      }
    } else if (input.itemType === 'Semen') {
      const straw = (this.db.semenStraws || []).find((s) => s.id === input.itemId || s.strawCode === input.itemId || s.bullName.toLowerCase() === input.itemName.toLowerCase());
      if (straw) {
        if ((straw.quantity || 0) < qty) {
          throw new Error(`Insufficient semen straws. Available: ${straw.quantity}, requested: ${qty}`);
        }
        straw.quantity -= qty;
        if (!unitPrice) unitPrice = straw.unitCost || straw.unitPrice || 0;
        straw.status = inventoryCalculationService.calculateStockStatus(straw.quantity, 10).status;
      }
    }

    const totalCost = input.totalCost !== undefined ? Number(input.totalCost) : Math.round(qty * unitPrice * 100) / 100;

    const nextId = `inv-tx-${String((this.db.inventoryTransactions?.length || 0) + 1).padStart(4, '0')}`;
    const newTx: InventoryTransaction = {
      ...input,
      id: nextId,
      farmId: 'farm-001',
      transactionType: 'Consumption',
      quantity: qty,
      unitPrice,
      totalCost,
      date: input.date || new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
    };

    if (!this.db.inventoryTransactions) this.db.inventoryTransactions = [];
    this.db.inventoryTransactions.unshift(newTx);

    this.refreshAllWarehouseMetrics();
    this.commit();
    return newTx;
  }

  public deleteInventoryTransaction(id: string): boolean {
    const idx = (this.db.inventoryTransactions || []).findIndex((t) => t.id === id);
    if (idx === -1) return false;
    this.db.inventoryTransactions.splice(idx, 1);
    this.commit();
    return true;
  }

  // --- Live Inventory Dashboard Metrics ---
  public getLiveInventoryMetrics() {
    this.refreshAllWarehouseMetrics();

    const warehouses = this.getWarehouses();
    const feeds = this.getFeedItems();
    const medicines = this.getMedicines();
    const vaccines = this.getVaccines();
    const semenStraws = this.getSemenStraws();

    const totalWarehouses = warehouses.length;
    const totalFeedStock = feeds.reduce((s, f) => s + (f.currentStockKg || 0), 0);
    const totalMedicines = medicines.reduce((s, m) => s + (m.stockQuantity || 0), 0);
    const totalVaccines = vaccines.reduce((s, v) => s + (v.quantity || 0), 0);
    const totalSemenStraws = semenStraws.reduce((s, st) => s + (st.quantity || 0), 0);

    // Total Inventory Value
    let inventoryValue = 0;
    feeds.forEach((f) => {
      inventoryValue += (f.currentStockKg || 0) * (f.unitPrice || 0);
    });
    medicines.forEach((m) => {
      inventoryValue += (m.stockQuantity || 0) * (m.cost || m.unitPrice || 0);
    });
    vaccines.forEach((v) => {
      inventoryValue += (v.quantity || 0) * (v.unitPrice || 0);
    });
    semenStraws.forEach((s) => {
      inventoryValue += (s.quantity || 0) * (s.unitCost || s.unitPrice || 0);
    });

    // Expiring medicines & vaccines (within 60 days or expired)
    let expiringMedicines = 0;
    medicines.forEach((m) => {
      const exp = inventoryCalculationService.calculateMedicineExpiry(m.expiryDate);
      if (exp.isWarning || exp.isExpired) expiringMedicines++;
    });
    vaccines.forEach((v) => {
      const exp = inventoryCalculationService.calculateMedicineExpiry(v.expiryDate);
      if (exp.isWarning || exp.isExpired) expiringMedicines++;
    });

    // Low stock items (stock <= minLevel)
    let lowStockItems = 0;
    feeds.forEach((f) => {
      if ((f.currentStockKg || 0) <= (f.minStockThresholdKg || 0)) lowStockItems++;
    });
    medicines.forEach((m) => {
      if ((m.stockQuantity || 0) <= (m.lowStockThreshold || 0)) lowStockItems++;
    });
    vaccines.forEach((v) => {
      if ((v.quantity || 0) <= (v.minStockLevel || 0)) lowStockItems++;
    });
    semenStraws.forEach((s) => {
      if ((s.quantity || 0) <= 15 || s.nitrogenStatus === 'Alert' || s.nitrogenStatus === 'Critical') lowStockItems++;
    });

    return {
      totalWarehouses,
      totalFeedStock,
      totalMedicines,
      totalVaccines,
      totalSemenStraws,
      inventoryValue: Math.round(inventoryValue),
      expiringMedicines,
      lowStockItems,
    };
  }

  public getRations(): Ration[] {
    return this.db.rations;
  }

  public getFeedTransactions(): FeedInventoryTransaction[] {
    return this.db.feedTransactions.sort((a, b) => b.date.localeCompare(a.date));
  }

  public recordFeedTransaction(tx: Omit<FeedInventoryTransaction, 'id' | 'farmId'>): FeedInventoryTransaction {
    const item = this.db.feedItems.find((f) => f.id === tx.feedItemId);
    if (!item) throw new Error(`Feed item not found: ${tx.feedItemId}`);

    if (tx.type === 'Consumption') {
      if (item.currentStockKg < tx.quantityKg) {
        throw new Error(`Cannot consume ${tx.quantityKg}kg. Only ${item.currentStockKg}kg available in stock.`);
      }
      item.currentStockKg -= tx.quantityKg;
      item.currentStock = item.currentStockKg;
    } else if (tx.type === 'Purchase') {
      item.currentStockKg += tx.quantityKg;
      item.currentStock = item.currentStockKg;
    } else {
      item.currentStockKg += tx.quantityKg;
      item.currentStock = item.currentStockKg;
    }

    item.status = inventoryCalculationService.calculateStockStatus(item.currentStockKg, item.minStockThresholdKg).status;

    const nextId = `feed-stock-${String(this.db.feedTransactions.length + 1).padStart(4, '0')}`;
    const newTx: FeedInventoryTransaction = {
      ...tx,
      id: nextId,
      farmId: 'farm-001',
      feedItemName: item.name,
    };

    this.db.feedTransactions.unshift(newTx);
    this.refreshAllWarehouseMetrics();
    this.commit();
    return newTx;
  }

  // ==========================================
  // Finance & People
  // ==========================================
  public getExpenses(): Expense[] {
    return this.db.expenses.sort((a, b) => b.date.localeCompare(a.date));
  }

  public createExpense(input: Omit<Expense, 'id' | 'farmId'>): Expense {
    if (input.amount < 0) {
      throw new Error('Expense amount cannot be negative.');
    }
    const nextId = `expense-${String(this.db.expenses.length + 1).padStart(4, '0')}`;
    const newExpense: Expense = { ...input, id: nextId, farmId: 'farm-001' };
    this.db.expenses.unshift(newExpense);
    this.commit();
    return newExpense;
  }

  public getIncomes(): Income[] {
    return this.db.incomes.sort((a, b) => b.date.localeCompare(a.date));
  }

  public createIncome(input: Omit<Income, 'id' | 'farmId'>): Income {
    if (input.amount < 0) {
      throw new Error('Income amount cannot be negative.');
    }
    const nextId = `income-${String(this.db.incomes.length + 1).padStart(4, '0')}`;
    const newIncome: Income = { ...input, id: nextId, farmId: 'farm-001' };
    this.db.incomes.unshift(newIncome);
    this.commit();
    return newIncome;
  }

  public getCustomers(): Customer[] {
    return this.db.customers;
  }

  public createCustomer(input: Omit<Customer, 'id' | 'farmId'>): Customer {
    const nextId = `customer-${String((this.db.customers?.length || 0) + 1).padStart(4, '0')}`;
    const newCustomer: Customer = {
      ...input,
      id: nextId,
      farmId: 'farm-001',
      dailyMilkQuotaLiters: input.dailyMilkQuotaLiters || 0,
      ratePerLiter: input.ratePerLiter || 0,
      outstandingBalance: input.outstandingBalance || 0,
      paymentTerms: input.paymentTerms || 'Weekly settlement',
    };
    if (!this.db.customers) this.db.customers = [];
    this.db.customers.push(newCustomer);
    this.commit();
    return newCustomer;
  }

  public updateCustomer(id: string, input: Partial<Customer>): Customer {
    const cust = this.db.customers.find((c) => c.id === id);
    if (!cust) throw new Error(`Customer not found: ${id}`);
    Object.assign(cust, input);
    this.commit();
    return cust;
  }

  public recordCustomerPayment(
    customerId: string,
    amount: number,
    date: string,
    paymentMethod: string = 'Cash',
    notes?: string
  ): Customer {
    const cust = this.db.customers.find((c) => c.id === customerId);
    if (!cust) throw new Error(`Customer not found: ${customerId}`);
    
    // Reduce outstanding receivable balance
    cust.outstandingBalance = Math.max(0, (cust.outstandingBalance || 0) - amount);
    
    // Record income for this payment received
    const incomeId = `income-${String((this.db.incomes?.length || 0) + 1).padStart(4, '0')}`;
    const newIncome: Income = {
      id: incomeId,
      farmId: 'farm-001',
      date,
      category: 'Other',
      source: 'Customer Payment',
      amount,
      customerName: cust.name,
      payer: cust.name,
      paymentMethod: (paymentMethod as any) || 'Cash',
      description: notes || `Settlement payment received from ${cust.name}. Balance remaining: Rs ${cust.outstandingBalance.toLocaleString()}`,
    };
    if (!this.db.incomes) this.db.incomes = [];
    this.db.incomes.unshift(newIncome);

    this.commit();
    return cust;
  }

  public getSuppliers(): Supplier[] {
    return this.db.suppliers;
  }

  public createSupplier(input: Omit<Supplier, 'id' | 'farmId'>): Supplier {
    const nextId = `supplier-${String((this.db.suppliers?.length || 0) + 1).padStart(4, '0')}`;
    const newSupplier: Supplier = {
      ...input,
      id: nextId,
      farmId: 'farm-001',
      productsSupplied: input.productsSupplied || [],
      outstandingBalance: input.outstandingBalance || 0,
    };
    if (!this.db.suppliers) this.db.suppliers = [];
    this.db.suppliers.push(newSupplier);
    this.commit();
    return newSupplier;
  }

  public updateSupplier(id: string, input: Partial<Supplier>): Supplier {
    const sup = this.db.suppliers.find((s) => s.id === id);
    if (!sup) throw new Error(`Supplier not found: ${id}`);
    Object.assign(sup, input);
    this.commit();
    return sup;
  }

  public recordSupplierPayment(
    supplierId: string,
    amount: number,
    date: string,
    paymentMethod: string = 'Cash',
    notes?: string
  ): Supplier {
    const sup = this.db.suppliers.find((s) => s.id === supplierId);
    if (!sup) throw new Error(`Supplier not found: ${supplierId}`);

    // Reduce payable balance
    sup.outstandingBalance = Math.max(0, (sup.outstandingBalance || 0) - amount);

    // Record expense voucher for this payment disbursed
    const expenseId = `expense-${String((this.db.expenses?.length || 0) + 1).padStart(4, '0')}`;
    const newExpense: Expense = {
      id: expenseId,
      farmId: 'farm-001',
      date,
      category: 'Other',
      amount,
      payee: sup.name,
      paymentMethod: (paymentMethod as any) || 'Cash',
      description: notes || `Payable settlement voucher to ${sup.name}. Balance remaining: Rs ${sup.outstandingBalance.toLocaleString()}`,
    };
    if (!this.db.expenses) this.db.expenses = [];
    this.db.expenses.unshift(newExpense);

    this.commit();
    return sup;
  }

  // ==========================================
  // Tasks & Notifications
  // ==========================================
  public getTasks(): Task[] {
    return this.db.tasks;
  }

  public createTask(input: Partial<Task>): Task {
    const nextId = `task-${String(this.db.tasks.length + 1).padStart(4, '0')}`;
    const newTask: Task = {
      id: nextId,
      farmId: 'farm-001',
      title: input.title || 'General Task',
      category: input.category || 'General',
      dueDate: input.dueDate || '2024-05-15',
      assignedToUserId: 'user-01',
      assignedToName: (input as any).assignedTo || input.assignedToName || 'Dr. Imran',
      priority: input.priority || 'Medium',
      status: 'Pending',
      animalId: input.animalId,
      animalTag: input.animalTag,
      notes: input.notes,
    };
    this.db.tasks.unshift(newTask);
    this.commit();
    return newTask;
  }

  public updateTaskStatus(id: string, status: Task['status']): Task {
    const task = this.db.tasks.find((t) => t.id === id);
    if (!task) throw new Error(`Task not found: ${id}`);
    task.status = status;
    if (status === 'Completed') {
      task.completedDate = '2024-05-14';
    }
    this.commit();
    return task;
  }

  public getNotifications(): Notification[] {
    return this.db.notifications;
  }

  public markNotificationRead(id: string): void {
    const n = this.db.notifications.find((item) => item.id === id);
    if (n) {
      n.isRead = true;
      this.commit();
    }
  }

  public markAllNotificationsRead(): void {
    this.db.notifications.forEach((n) => (n.isRead = true));
    this.commit();
  }

  // ==========================================
  // Purchases, Sales & Mortality (Req 23, 24, 25)
  // ==========================================
  public getPurchases(): AnimalPurchase[] {
    return this.db.purchases || [];
  }

  public getSales(): AnimalSale[] {
    return this.db.sales || [];
  }

  public getMortalities(): MortalityRecord[] {
    return this.db.mortalities || [];
  }

  public recordSale(sale: Omit<AnimalSale, 'id'>): AnimalSale {
    const id = `sale-${String((this.db.sales?.length || 0) + 1).padStart(4, '0')}`;
    const newSale: AnimalSale = { ...sale, id };
    if (!this.db.sales) this.db.sales = [];
    this.db.sales.unshift(newSale);
    // Changing an animal status to Sold
    const animal = this.db.animals.find((a) => a.id === sale.animalId || a.animalId === sale.animalTag);
    if (animal) {
      animal.status = 'Sold';
    }
    this.commit();
    return newSale;
  }

  public recordMortality(mortality: Omit<MortalityRecord, 'id'>): MortalityRecord {
    const id = `mortality-${String((this.db.mortalities?.length || 0) + 1).padStart(4, '0')}`;
    const newMort: MortalityRecord = { ...mortality, id };
    if (!this.db.mortalities) this.db.mortalities = [];
    this.db.mortalities.unshift(newMort);
    // Requirement 25: Changing an animal to Dead must remove it from active herd while preserving all historical records.
    const animal = this.db.animals.find((a) => a.id === mortality.animalId || a.animalId === mortality.animalTag);
    if (animal) {
      animal.status = 'Dead';
    }
    this.commit();
    return newMort;
  }

  // ==========================================
  // Aggregated Dashboard Summary Contract
  // ==========================================
  public getDashboardSummary(): DashboardSummary {
    const herdCounts = animalCalculationService.calculateHerdStatusCounts(this.db.animals);

    const animalCounts = {
      total: herdCounts.totalActive,
      lactating: herdCounts.lactating,
      dry: herdCounts.dry,
      pregnant: herdCounts.pregnant,
      open: herdCounts.open,
      heifers: herdCounts.heifers,
      calves: herdCounts.calves,
      bulls: herdCounts.bulls,
      sick: herdCounts.sick,
      quarantine: herdCounts.quarantine,
    };

    const todaySummary = this.getDailyMilkSummary('2024-05-14');
    const yesterdaySummary = this.getDailyMilkSummary('2024-05-13');

    // Monthly milk liters (sum all May records)
    const monthlyLiters = this.db.milkRecords
      .filter((r) => r.date.startsWith('2024-05'))
      .reduce((s, r) => s + r.quantityLiters, 0);

    // Financial today & monthly via centralized service
    const todayPnL = financialCalculationService.calculateProfitAndLoss(
      this.db.incomes,
      this.db.expenses,
      { date: '2024-05-14' }
    );

    const monthPnL = financialCalculationService.calculateProfitAndLoss(
      this.db.incomes,
      this.db.expenses,
      { from: '2024-05-01', to: '2024-05-14' }
    );

    // Dynamic milk drop alert calculation
    let milkDropAlertsCount = 0;
    const activeLactating = this.db.animals.filter((a) => a.status === 'Lactating');
    for (const cow of activeLactating) {
      const perf = milkCalculationService.calculateAnimalMilkPerformance(cow.id, this.db.milkRecords, '2024-05-14');
      const dropAlert = milkCalculationService.checkMilkDropAlert(perf.todayMilk, perf.average7Days);
      if (dropAlert.hasDrop) {
        milkDropAlertsCount++;
      }
    }

    const alerts = {
      breedingDue: this.db.breedingRecords.filter(
        (b) => b.pregnancyResult === 'Positive' && b.expectedCalvingDate && b.expectedCalvingDate <= '2024-06-15'
      ).length,
      healthAlerts: this.db.treatments.filter((t) => t.status === 'In Treatment').length,
      feedStockWarnings: this.db.feedItems.filter((f) => f.currentStockKg <= f.minStockThresholdKg).length,
      milkDropAlerts: milkDropAlertsCount,
      withdrawalActive: this.db.animals.filter((a) => a.isWithdrawalActive).length,
    };

    // Charts - Strictly from actual database records
    const last7DaysDates = [
      '2024-05-08', '2024-05-09', '2024-05-10', '2024-05-11', '2024-05-12', '2024-05-13', '2024-05-14'
    ];

    const milkLast7Days = last7DaysDates.map((d) => {
      const summary = this.getDailyMilkSummary(d);
      const dayLabel = new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
      return {
        date: d,
        label: dayLabel,
        morning: summary.morningLiters,
        evening: summary.eveningLiters,
        total: summary.totalLiters,
      };
    });

    const expensesLast7Days = last7DaysDates.map((d) => {
      const dayExpenses = this.db.expenses
        .filter((e) => e.date === d)
        .reduce((s, e) => s + e.amount, 0);
      const dayLabel = new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
      return {
        date: d,
        label: dayLabel,
        amount: dayExpenses,
      };
    });

    // Top milk producers on 2024-05-14
    const topProducersMap: Record<string, { tag: string; name?: string; liters: number }> = {};
    this.db.milkRecords
      .filter((r) => r.date === '2024-05-14')
      .forEach((r) => {
        if (!topProducersMap[r.animalId]) {
          topProducersMap[r.animalId] = { tag: r.animalTag || '', name: r.animalName, liters: 0 };
        }
        topProducersMap[r.animalId].liters += r.quantityLiters;
      });

    const topMilkProducers = Object.entries(topProducersMap)
      .map(([animalId, val]) => ({
        animalId,
        tag: val.tag,
        name: val.name,
        liters: Math.round(val.liters * 10) / 10,
      }))
      .sort((a, b) => b.liters - a.liters)
      .slice(0, 5);

    return {
      animalCounts,
      milk: {
        todayLiters: todaySummary.totalLiters,
        yesterdayLiters: yesterdaySummary.totalLiters,
        averageLiters: todaySummary.averagePerCow,
        monthlyLiters: Math.round(monthlyLiters),
        rejectedLiters: todaySummary.rejectedLiters,
        todayRevenue: todaySummary.revenue,
      },
      finance: {
        todayRevenue: todaySummary.revenue,
        todayExpenses: todayPnL.totalExpenses,
        estimatedProfitToday: todayPnL.netProfitOrLoss,
        monthlyRevenue: monthPnL.totalRevenue,
        monthlyExpenses: monthPnL.totalExpenses,
        monthlyProfit: monthPnL.netProfitOrLoss,
      },
      alerts,
      charts: {
        milkLast7Days,
        expensesLast7Days,
        topMilkProducers,
      },
    };
  }

  // ==========================================
  // Report Generation Contracts
  // ==========================================
  public getMilkReport(query: MilkReportQuery): MilkReport {
    const filtered = this.db.milkRecords.filter(
      (r) => r.date >= query.from && r.date <= query.to
    );

    let totalLiters = 0;
    let acceptedLiters = 0;
    let rejectedLiters = 0;
    let fatSum = 0;
    let snfSum = 0;
    let qualityCount = 0;

    const animalMap: Record<string, { tag: string; name?: string; total: number; days: Set<string> }> = {};
    const dailyMap: Record<string, { total: number; cows: Set<string>; fat: number; snf: number; count: number }> = {};

    for (const r of filtered) {
      totalLiters += r.quantityLiters;
      if (r.qualityStatus === 'Rejected') {
        rejectedLiters += r.quantityLiters;
      } else {
        acceptedLiters += r.quantityLiters;
      }

      if (r.fatPercent && r.snfPercent) {
        fatSum += r.fatPercent;
        snfSum += r.snfPercent;
        qualityCount++;
      }

      // Animal map
      if (!animalMap[r.animalId]) {
        animalMap[r.animalId] = { tag: r.animalTag || '', name: r.animalName, total: 0, days: new Set() };
      }
      animalMap[r.animalId].total += r.quantityLiters;
      animalMap[r.animalId].days.add(r.date);

      // Daily map
      if (!dailyMap[r.date]) {
        dailyMap[r.date] = { total: 0, cows: new Set(), fat: 0, snf: 0, count: 0 };
      }
      dailyMap[r.date].total += r.quantityLiters;
      dailyMap[r.date].cows.add(r.animalId);
      if (r.fatPercent && r.snfPercent) {
        dailyMap[r.date].fat += r.fatPercent;
        dailyMap[r.date].snf += r.snfPercent;
        dailyMap[r.date].count++;
      }
    }

    const uniqueDays = Object.keys(dailyMap).length || 1;
    const averageDailyLiters = Math.round((totalLiters / uniqueDays) * 10) / 10;
    const totalRevenue = Math.round(milkCalculationService.calculateMilkRevenue(acceptedLiters));

    const animalBreakdown = Object.entries(animalMap).map(([animalId, d]) => ({
      animalId,
      animalTag: d.tag,
      animalName: d.name,
      totalLiters: Math.round(d.total * 10) / 10,
      averageLiters: Math.round((d.total / (d.days.size || 1)) * 10) / 10,
      daysCount: d.days.size,
    }));

    const dailyBreakdown = Object.entries(dailyMap)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, d]) => ({
        date,
        totalLiters: Math.round(d.total * 10) / 10,
        averagePerCow: Math.round((d.total / (d.cows.size || 1)) * 10) / 10,
        fatPercent: d.count ? Math.round((d.fat / d.count) * 100) / 100 : 3.8,
        snfPercent: d.count ? Math.round((d.snf / d.count) * 100) / 100 : 8.8,
        revenue: Math.round(milkCalculationService.calculateMilkRevenue(d.total)),
      }));

    return {
      from: query.from,
      to: query.to,
      totalLiters: Math.round(totalLiters * 10) / 10,
      averageDailyLiters,
      acceptedLiters: Math.round(acceptedLiters * 10) / 10,
      rejectedLiters: Math.round(rejectedLiters * 10) / 10,
      totalRevenue,
      averageFat: qualityCount ? Math.round((fatSum / qualityCount) * 100) / 100 : 3.8,
      averageSnf: qualityCount ? Math.round((snfSum / qualityCount) * 100) / 100 : 8.8,
      animalBreakdown,
      dailyBreakdown,
    };
  }

  public getFinancialReport(from: string, to: string): FinancialReport {
    const expenses = this.db.expenses.filter((e) => e.date >= from && e.date <= to);
    const incomes = this.db.incomes.filter((i) => i.date >= from && i.date <= to);

    const pnl = financialCalculationService.calculateProfitAndLoss(
      this.db.incomes,
      this.db.expenses,
      { from, to }
    );

    const expCategoryMap: Record<string, number> = {};
    for (const e of expenses) {
      expCategoryMap[e.category] = (expCategoryMap[e.category] || 0) + e.amount;
    }
    const expenseByCategory = Object.entries(expCategoryMap).map(([category, amount]) => ({
      category,
      amount,
      percentage: pnl.totalExpenses ? Math.round((amount / pnl.totalExpenses) * 100) : 0,
    }));

    const incCategoryMap: Record<string, number> = {};
    for (const i of incomes) {
      incCategoryMap[i.category] = (incCategoryMap[i.category] || 0) + i.amount;
    }
    const incomeByCategory = Object.entries(incCategoryMap).map(([category, amount]) => ({
      category,
      amount,
      percentage: pnl.totalRevenue ? Math.round((amount / pnl.totalRevenue) * 100) : 0,
    }));

    return {
      from,
      to,
      totalIncome: pnl.totalRevenue,
      totalExpenses: pnl.totalExpenses,
      netProfit: pnl.netProfitOrLoss,
      incomeByCategory,
      expenseByCategory,
      dailyFlow: [],
    };
  }
}

export const mockDb = new MockDatabaseService();
