/**
 * Types & Interfaces for Dairy Farm Management System
 */

// ==========================================
// 1. Common API & Query Contracts
// ==========================================

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface ApiError {
  success: false;
  message: string;
  code?: string;
  fieldErrors?: Record<string, string>;
}

export interface ListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  filters?: Record<string, unknown>;
}

// ==========================================
// 2. Organization, Farm & Infrastructure
// ==========================================

export interface Company {
  id: string;
  name: string;
  currency: string;
  country: string;
}

export interface Farm {
  id: string;
  companyId: string;
  name: string;
  code: string;
  location: string;
  totalAreaAcres: number;
  establishedYear: number;
}

export interface Shed {
  id: string;
  farmId: string;
  name: string;
  code: string;
  capacity: number;
  currentCount: number;
  shedType: 'Lactating' | 'Dry/Pregnant' | 'Maternity & Calves' | 'Quarantine';
}

export interface HerdGroup {
  id: string;
  farmId: string;
  name: string;
  code: string;
  type: 'Lactating' | 'Dry' | 'Pregnant' | 'Heifer' | 'Calf' | 'Bull' | 'Sick/Quarantine';
  shedId: string;
  animalCount: number;
}

// ==========================================
// 3. Animal Management
// ==========================================

export type AnimalBreed = 'Holstein Friesian' | 'Jersey' | 'Crossbred' | 'Other';
export type AnimalSex = 'Female' | 'Male';
export type AnimalStatus =
  | 'Active'
  | 'Calf'
  | 'Heifer'
  | 'Lactating'
  | 'Dry'
  | 'Pregnant'
  | 'Open'
  | 'Sick'
  | 'Quarantine'
  | 'Sold'
  | 'Dead'
  | 'Bull';

export interface Animal {
  id: string;

  /**
   * The NUMERIC database primary key (`animals.animal_id`) as a string.
   * Alias of `id`; named explicitly so route-building code is unambiguous.
   * Every API route (`/api/animals/{id}/...`) takes THIS, not `animalId`.
   */
  databaseId?: string;

  farmId: string;
  shedId: string;
  groupId: string;

  /**
   * Human-readable farm code, e.g. "AN-001" - this is `animals.animal_code`,
   * NOT the primary key. This is what every label, card and printed tag shows.
   */
  animalId: string;
  earTag: string;   // e.g. "001"
  name?: string;    // e.g. "Rani"
  rfid?: string;    // e.g. "9002150001001"

  photoUrl?: string;

  // Unique QR Identity & Payload Token for live scanning
  qrCode?: string;   // e.g. "AN-001" or stable identifier
  qrToken?: string;  // e.g. "qr-token-an-001-9002150001001"

  breed: AnimalBreed;
  sex: AnimalSex;
  dateOfBirth: string;

  status: AnimalStatus;
  location?: string;
  pregnancyStatus?: string;
  expectedCalvingDate?: string;

  damId?: string;
  sireId?: string;
  damTag?: string;
  sireTag?: string;

  purchaseDate?: string;
  purchasePrice?: number;

  colorMarkings?: string;
  source?: string;
  remarks?: string;

  // Computed / Denormalized for display convenience in lists/cards
  lactationNumber?: number;
  daysInMilk?: number;
  dailyAvgMilk?: number;
  todayMilk?: number;
  isWithdrawalActive?: boolean;
}

export interface AnimalListQuery extends ListQuery {
  farmId?: string;
  status?: AnimalStatus;
  breed?: string;
  sex?: AnimalSex;
  groupId?: string;
  shedId?: string;

  lactating?: boolean;
  pregnant?: boolean;
  sick?: boolean;

  ageMin?: number;
  ageMax?: number;

  productionMin?: number;
  productionMax?: number;
}

export interface CreateAnimalInput {
  animalId: string;
  /**
   * Target farm as a database id. `animals.farm_id` is NOT NULL with a foreign
   * key to `farms`, so the server needs this. Defaults to farm 1 when omitted.
   */
  farmId?: string;
  earTag: string;
  name?: string;
  rfid?: string;
  photoUrl?: string;
  qrCode?: string;
  qrToken?: string;
  breed: AnimalBreed;
  sex: AnimalSex;
  dateOfBirth: string;
  status: AnimalStatus;
  location?: string;
  pregnancyStatus?: string;
  expectedCalvingDate?: string;
  shedId: string;
  groupId: string;
  damId?: string;
  sireId?: string;
  damTag?: string;
  sireTag?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  colorMarkings?: string;
  source?: string;
  remarks?: string;
}

export interface UpdateAnimalInput extends Partial<CreateAnimalInput> {
  id?: string;
}

export interface AnimalQrProfileDto {
  animal: Animal;
  farm?: Farm;
  shed?: Shed;
  group?: HerdGroup;
  latestMilkRecords: MilkRecord[];
  breedingRecords: BreedingRecord[];
  healthRecords: HealthRecord[];
  treatments: TreatmentRecord[];
  calvings: CalvingRecord[];
  lactations: LactationRecord[];
  vaccinations: VaccinationRecord[];
  ration?: Ration;
  isWithdrawalActive: boolean;
  qrToken: string;
  qrUrl: string;
  generatedAt: string;
}

// ==========================================
// 4. Milk Management
// ==========================================

export type MilkingSession = 'Morning' | 'Evening' | 'Third';
export type MilkQualityStatus = 'Accepted' | 'Rejected';

export interface MilkRecord {
  id: string;
  animalId: string;
  animalTag?: string;
  animalName?: string;
  farmId: string;
  date: string;
  session: MilkingSession;
  quantityLiters: number;
  pricePerLiter?: number;
  totalAmount?: number;

  fatPercent?: number;
  proteinPercent?: number;
  snfPercent?: number;
  scc?: number; // somatic cell count

  qualityStatus: MilkQualityStatus;
  rejectionReason?: string;
  remarks?: string;
}

export interface MilkDailySummary {
  date: string;
  morningLiters: number;
  eveningLiters: number;
  thirdLiters: number;
  totalLiters: number;
  milkingCowsCount: number;
  averagePerCow: number;
  rejectedLiters: number;
  revenue: number | null;
  avgFat: number | null;
  avgSnf: number | null;
}

export interface MilkAnimalSummary {
  animalId: string;
  animalTag: string;
  animalName?: string;
  currentMilkToday: number;
  average7Days: number;
  average30Days: number;
  peakMilk: number;
  peakDate: string;
  totalLactationMilk: number;
  daysInMilk: number;
  records: MilkRecord[];
}

export interface MilkListQuery extends ListQuery {
  animalId?: string;
  date?: string;
  from?: string;
  to?: string;
  session?: MilkingSession;
  groupId?: string;
  shedId?: string;
  qualityStatus?: MilkQualityStatus;
}

export interface CreateMilkRecordInput {
  animalId: string;
  date: string;
  session: MilkingSession;
  quantityLiters: number;
  pricePerLiter?: number;
  totalAmount?: number;
  fatPercent?: number;
  proteinPercent?: number;
  snfPercent?: number;
  scc?: number;
  qualityStatus?: MilkQualityStatus;
  rejectionReason?: string;
  remarks?: string;
}

export interface UpdateMilkRecordInput extends Partial<CreateMilkRecordInput> {
  id?: string;
}

// ==========================================
// 5. Lactation Management
// ==========================================

export interface LactationRecord {
  id: string;
  animalId: string;
  animalTag?: string;
  farmId: string;
  lactationNumber: number;
  calvingDate: string;
  daysInMilk: number;
  peakMilk: number;
  peakDate: string;
  currentMilk: number;
  totalLactationMilk: number;
  status: 'In Milk' | 'Dry' | 'Completed';
  dryDate?: string;
  endDate?: string;
  remarks?: string;
}

// ==========================================
// 6. Breeding & Reproduction
// ==========================================

export type BreedingMethod = 'AI' | 'Natural Service' | 'Natural';
export type PregnancyResult = 'Positive' | 'Negative' | 'Pending';

export interface BreedingRecord {
  id: string;
  animalId: string;
  animalTag?: string;
  animalName?: string;
  farmId: string;

  heatDate: string;
  heatIntensity?: 'Weak' | 'Medium' | 'Strong';
  observedBy?: string;

  serviceDate?: string;
  method: BreedingMethod;
  bullId?: string;
  bullTag?: string;
  semenCode?: string;
  semenStrawCode?: string;
  technician?: string;
  inseminatorName?: string;
  serviceNumber?: number;

  pregnancyCheckDate?: string;
  pregnancyResult?: PregnancyResult;
  pregnancyStage?: string;

  expectedCalvingDate?: string;
  actualCalvingDate?: string;
  remarks?: string;
  cost?: number;
  notes?: string;
}

export interface BreedingListQuery extends ListQuery {
  animalId?: string;
  status?: 'Heat Detected' | 'Inseminated' | 'Pregnancy Check Due' | 'Pregnant' | 'Calving Due';
  pregnancyResult?: PregnancyResult;
  dateFrom?: string;
  dateTo?: string;
}

export interface CreateBreedingInput {
  animalId: string;
  heatDate: string;
  heatIntensity?: 'Weak' | 'Medium' | 'Strong';
  observedBy?: string;
  serviceDate?: string;
  method: BreedingMethod;
  bullId?: string;
  bullTag?: string;
  semenCode?: string;
  semenStrawCode?: string;
  technician?: string;
  inseminatorName?: string;
  serviceNumber?: number;
  pregnancyCheckDate?: string;
  pregnancyResult?: PregnancyResult;
  pregnancyStage?: string;
  expectedCalvingDate?: string;
  cost?: number;
  remarks?: string;
  notes?: string;
}

export interface UpdateBreedingInput extends Partial<CreateBreedingInput> {
  id?: string;
}

/**
 * A persisted pregnancy, as sourced from `/api/pregnancies`.
 *
 * NOTE: this is NOT derived from `Animal.status === 'Pregnant'`. An animal's
 * status is a herd-state label; a pregnancy is its own persisted row in the
 * `pregnancies` table. Only real persisted pregnancies appear here.
 */
export interface PregnancyRecord {
  id: string;
  farmId: string;
  animalId: string;
  /** Links to the `breeding_events` row that confirmed this pregnancy. */
  breedingEventId?: string;
  conceptionDate?: string;
  confirmationDate?: string;
  expectedCalvingDate?: string;
  actualCalvingDate?: string;
  status: 'CONFIRMED' | 'NOT_PREGNANT' | 'ABORTED' | 'CALVED';
  calfCount?: number;
  notes?: string;
}

export type PregnancyStatus = PregnancyRecord['status'];

export interface CreatePregnancyInput {
  animalId: string;
  status: PregnancyStatus;
  /** Set only when the caller already knows the persisted breeding event id. */
  breedingEventId?: string;
  conceptionDate?: string;
  confirmationDate?: string;
  expectedCalvingDate?: string;
  calfCount?: number;
  notes?: string;
}

export interface CalvingRecord {
  id: string;
  farmId: string;
  damId: string;
  damTag: string;
  sireId?: string;
  sireTag?: string;
  breedingId?: string;

  calvingDate: string;
  calvingTime?: string;
  difficulty: 'Normal / Unassisted' | 'Easy Assist' | 'Hard Assist' | 'Caesarean';
  calfCount?: number;
  calfSex: AnimalSex;
  birthWeightKg: number;
  calfId?: string;
  calfTag?: string;

  colostrumTimeHours?: number;
  colostrumLiters?: number;
  colostrumFedLiters?: number;
  colostrumFedHoursPostBirth?: number;
  complications?: string;
  attendedBy?: string;
  remarks?: string;
  notes?: string;
}

export interface CreateCalvingInput {
  damId: string;
  /** Real persisted pregnancy id, when one exists (never derived from status). */
  pregnancyId?: string;
  calvingDate: string;
  calvingTime?: string;
  /** One of the words that map to a real `calving_type` enum value. */
  difficulty: CalvingRecord['difficulty'];
  calfCount?: number;
  veterinarianName?: string;

  /**
   * The fields below have NO writable path in the frozen backend: they belong
   * to the `calves` table, which the server populates itself. They are retained
   * on the type only so existing call sites still compile; they are NOT sent.
   */
  calfSex: AnimalSex;
  birthWeightKg: number;
  createCalfRecord: boolean;
  calfTag?: string;
  calfName?: string;
  colostrumTimeHours?: number;
  colostrumLiters?: number;
  complications?: string;
  remarks?: string;
  notes?: string;
}

// ==========================================
// 7. Health, Treatments, Medicines, Vaccinations, Quarantine & Audit
// ==========================================

export type HealthEventType =
  | 'Disease'
  | 'Injury'
  | 'Routine Examination'
  | 'Observation'
  | 'Emergency'
  | 'Reproductive Health'
  | 'Vaccination'
  | 'Deworming'
  | 'Other';

export interface HealthRecord {
  id: string;
  animalId: string;
  animalTag?: string;
  animalName?: string;
  farmId: string;
  date: string;
  eventDate?: string;
  eventType?: HealthEventType;
  problem: string;
  symptoms?: string;
  diagnosis: string;
  severity?: 'Mild' | 'Moderate' | 'Severe' | 'Critical';
  temperature?: number; // e.g. 104.5 °F
  weight?: number; // in kg
  heartRate?: number; // bpm
  respiratoryRate?: number; // breaths/min
  clinicalFindings?: string;
  treatmentRequired?: boolean;
  followUpDate?: string;
  attachments?: string[];
  veterinarian: string;
  status: 'Reported' | 'In Treatment' | 'Under Treatment' | 'Recovered' | 'Chronic' | 'Deceased';
  cost?: number;
  recoveryDate?: string;
  remarks?: string;
  notes?: string;
  createdAt?: string;
}

export type HealthEvent = HealthRecord;

export type TreatmentRoute =
  | 'Intramammary'
  | 'Intramuscular'
  | 'Subcutaneous'
  | 'Oral'
  | 'Intravenous'
  | 'Topical'
  | 'Other';

export type TreatmentStatus = 'Planned' | 'In Treatment' | 'Completed' | 'Cancelled';
export type WithdrawalStatus = 'Not Applicable' | 'Active Hold' | 'Cleared' | 'Override';

export interface TreatmentRecord {
  id: string;
  farmId: string;
  animalId: string;
  animalTag?: string;
  animalName?: string;
  healthRecordId?: string;
  date: string;
  startDate?: string;
  problem?: string;
  diagnosis: string;
  medicineId: string;
  medicineName: string;
  medicineBatch?: string;
  dose: string;
  dosage: string;
  doseUnit?: string;
  frequency?: string;
  route: TreatmentRoute | string;
  durationDays: number;
  milkWithdrawalDays?: number;
  withdrawalDaysMilk?: number;
  meatWithdrawalDays?: number;
  withdrawalDaysMeat?: number;
  treatmentInstructions?: string;
  veterinarian: string;
  administeredBy?: string;
  treatmentCost?: number;
  cost?: number;
  pharmacySource?: string;
  status: TreatmentStatus | 'In Treatment' | 'Completed';
  withdrawalStatus?: WithdrawalStatus;

  // Medicine withdrawal fields
  withdrawalStartDate?: string;
  withdrawalEndDate?: string;
  milkUsableDate: string; // hold until date
  isWithdrawalActive: boolean;

  completedAt?: string;
  completedBy?: string;
  overrideReason?: string;
  overrideAuthorizedBy?: string;
  remarks?: string;
  notes?: string;
  createdAt?: string;
}

export interface QuarantineRecord {
  id: string;
  farmId: string;
  animalId: string;
  animalTag: string;
  animalName?: string;
  reason: string;
  startDate: string;
  expectedReleaseDate: string;
  actualReleaseDate?: string;
  isolationLocation: string;
  responsiblePerson: string;
  status: 'Active' | 'Released' | 'Cancelled';
  previousAnimalStatus?: string;
  releaseCriteria?: string;
  dischargeNotes?: string;
  notes?: string;
  createdAt?: string;
}

export interface HealthAuditLog {
  id: string;
  farmId: string;
  timestamp: string;
  user: string;
  action:
    | 'Health Event Created'
    | 'Health Event Updated'
    | 'Treatment Started'
    | 'Treatment Updated'
    | 'Treatment Completed'
    | 'Milk Hold Created'
    | 'Milk Hold Completed'
    | 'Withdrawal Override'
    | 'Vaccination Administered'
    | 'Animal Quarantined'
    | 'Animal Released'
    | 'Medicine Issued';
  entity: 'HealthEvent' | 'Treatment' | 'Vaccination' | 'Quarantine' | 'Medicine';
  entityId: string;
  animalTag?: string;
  oldValue?: string;
  newValue?: string;
  notes?: string;
}

export interface HealthDashboardSummary {
  healthEventsCount: number;
  activeTreatmentsCount: number;
  vaccinationScheduleCount: number;
  quarantineCount: number;
  pharmacyCount: number;
  activeMilkWithdrawalCount: number;
  overdueVaccinationsCount: number;
  expiringMedicinesCount: number;
}

export interface Medicine {
  id: string;
  farmId: string;
  name: string;
  category: 'Antibiotic' | 'Anti-inflammatory' | 'Anthelmintic' | 'Vitamin' | 'Vaccine' | 'Topical' | 'Hormone' | 'Other';
  manufacturer?: string;
  batchNumber: string;
  quantity?: number;
  stockQuantity: number;
  currentStock?: number;
  unit: 'vial' | 'ml' | 'bolus' | 'bottle' | 'kg' | 'tube' | 'pack';
  unitPrice: number;
  cost?: number;
  purchaseDate?: string;
  expiryDate: string;
  supplierId?: string;
  supplierName?: string;
  supplier?: string;
  warehouseId?: string;
  warehouseName?: string;
  warehouse?: string;
  withdrawalDays?: number;
  withdrawalDaysMilk: number;
  withdrawalDaysMeat: number;
  lowStockThreshold: number;
  minAlertLevel?: number;
  notes?: string;
  status?: 'Optimal' | 'Low' | 'Reorder' | 'Out of Stock' | 'Expired';
}

export interface VaccineStock {
  id: string;
  farmId: string;
  name: string;
  vaccineName: string;
  manufacturer: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  unit: string;
  storageTemperature: string; // e.g. "2°C - 8°C Cold Chain"
  warehouseId?: string;
  warehouseName?: string;
  warehouse?: string;
  supplier?: string;
  unitPrice?: number;
  minStockLevel?: number;
  status?: 'Optimal' | 'Low' | 'Reorder' | 'Out of Stock' | 'Expired';
  targetDisease?: string;
  notes?: string;
  createdAt?: string;
}

export interface SemenStraw {
  id: string;
  farmId: string;
  bullName: string;
  breed: string;
  strawCode: string;
  quantity: number;
  collectionDate: string;
  tankNumber: string;
  canisterNumber: string;
  position: string;
  nitrogenLevel: number; // percentage e.g. 85, or cm
  minNitrogenLevel?: number; // e.g. 25
  nitrogenStatus?: 'Optimal' | 'Alert' | 'Critical';
  conceptionRate?: string;
  supplier?: string;
  unitCost?: number;
  unitPrice?: number;
  notes?: string;
  status?: 'Optimal' | 'Low' | 'Reorder' | 'Out of Stock';
  createdAt?: string;
}

export interface Warehouse {
  id: string;
  farmId: string;
  name: string;
  code: string;
  type: 'Silage Bunker' | 'Dry Feed Shed' | 'Veterinary Pharmacy' | 'Cryogenic Semen Bank' | 'General Store';
  capacity: number; // Capacity in kg or standard units
  currentStock: number;
  currentUtilization: number; // (currentStock / capacity) * 100
  totalItems: number; // count of SKUs/items housed
  location: string;
  manager: string;
  temperatureControlled: boolean;
  notes?: string;
  createdAt?: string;
}

export interface InventoryTransaction {
  id: string;
  farmId: string;
  itemType: 'Feed' | 'Medicine' | 'Vaccine' | 'Semen';
  itemId: string;
  itemName: string;
  warehouseId?: string;
  warehouseName?: string;
  transactionType: 'Purchase' | 'Consumption' | 'Adjustment';
  quantity: number;
  unit: string;
  unitPrice?: number;
  totalCost?: number;
  supplier?: string;
  invoiceNo?: string;
  date: string;
  reason?: string;
  activity?: string;
  animalId?: string;
  animalTag?: string;
  penLocation?: string;
  notes?: string;
  performedBy?: string;
  createdAt?: string;
}

export interface VaccinationRecord {
  id: string;
  farmId: string;
  animalId?: string;
  animalTag?: string;
  groupId?: string;
  groupName?: string;
  vaccineName: string;
  targetDisease: string;
  disease?: string;
  targetGroup?: string;
  date: string;
  vaccinationDate?: string;
  dateAdministered?: string;
  nextDueDate: string;
  batchNumber: string;
  manufacturer?: string;
  veterinarian: string;
  administeredBy?: string;
  status: 'Scheduled' | 'Due' | 'Due Today' | 'Due Soon' | 'Overdue' | 'Completed';
  dose: string;
  dosage?: string;
  doseUnit?: string;
  route?: string;
  cost?: number;
  notes?: string;
  createdAt?: string;
}

// ==========================================
// 8. Feed & Inventory
// ==========================================

export interface FeedItem {
  id: string;
  farmId: string;
  name: string;
  category: 'Silage' | 'Concentrate' | 'Fodder' | 'Straw' | 'Mineral/Supplement' | 'Hay' | 'Grain';
  currentStockKg: number;
  currentStock?: number;
  unit: 'kg' | 'bag' | 'bale' | 'ton';
  unitPrice: number; // cost per unit in PKR / Rs
  supplierId?: string;
  supplierName?: string;
  supplier?: string;
  minStockThresholdKg: number;
  minAlertLevel?: number;
  dryMatterPercent?: number;
  crudeProteinPercent?: number;
  purchaseDate?: string;
  expiryDate?: string;
  warehouseId?: string;
  warehouseName?: string;
  warehouse?: string;
  notes?: string;
  batchNumber?: string;
  status?: 'Optimal' | 'Low' | 'Reorder' | 'Out of Stock';
}

export interface RationIngredient {
  feedItemId: string;
  feedItemName: string;
  quantityKg: number;
  costPerKg: number;
}

export interface Ration {
  id: string;
  farmId: string;
  name: string;
  targetGroup: string;
  description?: string;
  ingredients: RationIngredient[];
  totalKgPerCow: number;
  costPerCowPerDay: number;
  isActive: boolean;
}

export interface FeedInventoryTransaction {
  id: string;
  farmId: string;
  feedItemId: string;
  feedItemName: string;
  date: string;
  type: 'Purchase' | 'Consumption' | 'Adjustment';
  quantityKg: number;
  unitPrice?: number;
  totalCost?: number;
  notes?: string;
}

// ==========================================
// 9. Purchases, Sales & Mortality
// ==========================================

export interface AnimalPurchase {
  id: string;
  farmId: string;
  animalId: string;
  animalTag: string;
  sellerName: string;
  sellerPhone?: string;
  purchaseDate: string;
  purchasePrice: number;
  transportCost: number;
  landedCost: number;
  previousFarm?: string;
  quarantineDays: number;
  notes?: string;
}

export interface AnimalSale {
  id: string;
  farmId?: string;
  animalId: string;
  animalTag: string;
  buyerName: string;
  buyerPhone?: string;
  saleDate: string;
  salePrice: number;
  reason?: 'Low Production' | 'Reproductive Problem' | 'Disease' | 'Age' | 'Surplus' | 'Male Calf' | string;
  saleReason?: string;
  weightKg?: number;
  purchasePrice?: number;
  profitOrLoss?: number;
  notes?: string;
}

export interface MortalityRecord {
  id: string;
  farmId: string;
  animalId: string;
  animalTag: string;
  animalName?: string;
  deathDate: string;
  causeOfDeath: string;
  lactationNumber?: number;
  financialLoss: number;
  postMortemNotes?: string;
  veterinarian?: string;
}

// ==========================================
// 10. Finance (Income, Expenses, Customers, Suppliers)
// ==========================================

export type ExpenseCategory =
  | 'Feed'
  | 'Medicine'
  | 'Labour'
  | 'Electricity'
  | 'Diesel'
  | 'Veterinary'
  | 'Maintenance'
  | 'Animal Purchases'
  | 'Transport'
  | 'Other';

export interface Expense {
  id: string;
  farmId: string;
  date: string;
  category: ExpenseCategory;
  amount: number;
  payee: string;
  paymentMethod: 'Cash' | 'Bank Transfer' | 'Cheque';
  description: string;
  receiptAttachment?: string;
}

export type IncomeCategory =
  | 'Milk Sales'
  | 'Animal Sales'
  | 'Calf Sales'
  | 'Manure Sales'
  | 'Other';

export interface Income {
  id: string;
  farmId?: string;
  date: string;
  category?: IncomeCategory | string;
  source?: string;
  amount: number;
  customerName?: string;
  payer?: string;
  paymentMethod: 'Cash' | 'Bank Transfer' | 'Cheque';
  description: string;
  quantityLiters?: number;
  ratePerLiter?: number;
}

export interface Customer {
  id: string;
  farmId: string;
  name: string;
  contactPerson?: string;
  phone: string;
  address: string;
  dailyMilkQuotaLiters: number;
  ratePerLiter: number;
  outstandingBalance?: number;
  paymentTerms: string;
}

export interface Supplier {
  id: string;
  farmId: string;
  name: string;
  contactPerson: string;
  phone: string;
  address: string;
  productsSupplied: string[];
  outstandingBalance?: number;
}

// ==========================================
// 11. Tasks, Notifications, Users, Attachments
// ==========================================

export type TaskCategory =
  | 'Vaccination'
  | 'AI'
  | 'Pregnancy Diagnosis'
  | 'Dry-off'
  | 'Calving'
  | 'Medicine'
  | 'Deworming'
  | 'Hoof Trimming'
  | 'Health Check'
  | 'General';

export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Critical';
export type TaskStatus = 'Pending' | 'In Progress' | 'Completed' | 'Overdue';

export interface Task {
  id: string;
  farmId: string;
  title: string;
  description?: string;
  category: TaskCategory;
  animalId?: string;
  animalTag?: string;
  groupId?: string;
  dueDate: string;
  assignedToUserId: string;
  assignedToName: string;
  priority: TaskPriority;
  status: TaskStatus;
  completedDate?: string;
  notes?: string;
}

export interface Notification {
  id: string;
  farmId: string;
  title: string;
  message: string;
  type: 'Calving' | 'Vaccination' | 'Withdrawal' | 'MilkDrop' | 'FeedLow' | 'General';
  severity: 'info' | 'warning' | 'error' | 'success';
  isRead: boolean;
  timestamp: string;
  animalId?: string;
  animalTag?: string;
  link?: string;
}

export type UserRole =
  | 'Owner'
  | 'Manager'
  | 'Veterinarian'
  | 'Feed Manager'
  | 'Worker'
  | 'Accountant';

export interface User {
  id: string;
  companyId: string;
  farmId: string;
  name: string;
  email: string;
  role: UserRole;
  phone: string;
  avatarUrl?: string;
  lastActive?: string;
}

export interface Attachment {
  id: string;
  recordType: 'Animal' | 'Expense' | 'Health' | 'Sale';
  recordId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadedAt: string;
  url: string;
}

// ==========================================
// 12. Dashboard & Reporting Contracts
// ==========================================

/**
 * Dashboard snapshot.
 *
 * RECONCILED against the canonical backend. `null` means "the backend has no
 * source for this metric yet" — it must be rendered as unavailable, NEVER as 0.
 * A `0` always means the backend genuinely returned zero.
 */
export interface DashboardSummary {
  animalCounts: {
    total: number;
    lactating: number;
    dry: number;
    pregnant: number;
    open: number;
    heifers: number;
    calves: number;
    bulls: number;
    sick: number;
    quarantine: number;
  };

  milk: {
    /** GET /api/dashboard -> todayMilk */
    todayLiters: number;
    /** GET /api/dashboard -> yesterdayMilk */
    yesterdayLiters: number;
    /** GET /api/dashboard -> averageMilkPerCow */
    averageLiters: number;
    /** GET /api/dashboard -> monthlyMilk */
    monthlyLiters: number;
    /** CONTRACT GAP: the dashboard endpoint exposes no rejected-litre figure. */
    rejectedLiters: number | null;
    todayRevenue: number | null;
  };

  finance: {
    /** GET /api/reports/farm for TODAY ONLY (from == to) -> income */
    todayRevenue: number;
    /** GET /api/reports/farm for TODAY ONLY -> expenses */
    todayExpenses: number;
    /** GET /api/reports/farm for TODAY ONLY -> estimatedProfit */
    estimatedProfitToday: number;
    /** GET /api/dashboard -> milkRevenue (the month's ledger income) */
    monthlyRevenue: number;
    /** GET /api/dashboard -> monthlyExpenses */
    monthlyExpenses: number;
    /** GET /api/dashboard -> estimatedProfit */
    monthlyProfit: number;
  };

  alerts: {
    /** GET /api/dashboard -> breedingReminders */
    breedingDue: number;
    /** GET /api/dashboard -> healthAlerts */
    healthAlerts: number;
    /** CONTRACT GAP: no backend source. */
    feedStockWarnings: number | null;
    /** CONTRACT GAP: no backend source. */
    withdrawalActive: number | null;
    milkDropAlerts: number | null;
  };

  charts: {
    /**
     * Built from GET /api/reports/milk. `morning` / `evening` are null because
     * the canonical milk model stores a single session total per row; the
     * server exposes no per-session split.
     */
    milkLast7Days: Array<{
      date: string;
      label: string;
      morning: number | null;
      evening: number | null;
      total: number;
    }>;
    /** Built from GET /api/reports/farm, one request per day. */
    expensesLast7Days: Array<{ date: string; label: string; amount: number }>;
    /** CONTRACT GAP: no backend endpoint ranks animals by daily milk. */
    topMilkProducers: Array<{ animalId: string; tag: string; name?: string; liters: number }> | null;
  };
}

export interface MilkReportQuery {
  from: string;
  to: string;
  animalId?: string;
  groupId?: string;
}

export interface MilkReport {
  from: string;
  to: string;
  totalLiters: number;
  averageDailyLiters: number;
  acceptedLiters: number;
  rejectedLiters: number;
  totalRevenue: number | null;
  averageFat: number | null;
  averageSnf: number | null;
  animalBreakdown: Array<{
    animalId: string;
    animalTag: string;
    animalName?: string;
    totalLiters: number;
    averageLiters: number;
    daysCount: number;
  }>;
  dailyBreakdown: Array<{
    date: string;
    totalLiters: number;
    averagePerCow: number;
    fatPercent: number | null;
    snfPercent: number | null;
    revenue: number | null;
  }>;
}

export interface FinancialReport {
  from: string;
  to: string;
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  incomeByCategory: Array<{ category: string; amount: number; percentage: number }>;
  expenseByCategory: Array<{ category: string; amount: number; percentage: number }>;
  dailyFlow: Array<{ date: string; income: number; expenses: number; net: number }>;
}

export interface BreedingReport {
  from: string;
  to: string;
  totalHeats: number;
  totalInseminations: number;
  pregnancyChecks: number;
  confirmedPregnant: number;
  conceptionRatePercent: number;
  calvingsDueIn30Days: number;
  records: BreedingRecord[];
}

export interface HealthReport {
  from: string;
  to: string;
  totalCases: number;
  activeTreatments: number;
  curedCases: number;
  cowsInWithdrawal: number;
  topDiseases: Array<{ disease: string; count: number }>;
  totalMedicalCost: number;
  records: HealthRecord[];
}
