import {
  Company,
  Farm,
  Shed,
  HerdGroup,
  User,
  Animal,
  LactationRecord,
  CalvingRecord,
  MilkRecord,
  BreedingRecord,
  Medicine,
  HealthRecord,
  TreatmentRecord,
  VaccinationRecord,
  FeedItem,
  Ration,
  FeedInventoryTransaction,
  AnimalPurchase,
  AnimalSale,
  MortalityRecord,
  Expense,
  Income,
  Customer,
  Supplier,
  Task,
  Notification,
  Attachment,
  Warehouse,
  VaccineStock,
  SemenStraw,
  InventoryTransaction,
  QuarantineRecord,
  HealthAuditLog,
} from '../../types';

import { mockCompany, mockFarm, mockSheds, mockGroups, mockUsers } from './mockSeedData/orgData';
import { mockAnimals, mockLactations, mockCalvings } from './mockSeedData/animalData';
import { mockMilkRecords } from './mockSeedData/milkData';
import {
  mockBreedingRecords,
  mockMedicines,
  mockHealthRecords,
  mockTreatments,
  mockVaccinations,
} from './mockSeedData/healthBreedingData';
import {
  mockFeedItems,
  mockRations,
  mockFeedTransactions,
  mockPurchases,
  mockSales,
  mockMortalities,
  mockExpenses,
  mockIncomes,
  mockCustomers,
  mockSuppliers,
  mockTasks,
  mockNotifications,
  mockAttachments,
} from './mockSeedData/feedFinanceData';
import {
  mockWarehouses,
  mockVaccines,
  mockSemenStraws,
  mockInventoryTransactions,
} from './mockSeedData/inventoryWarehouseData';

export interface MockDatabase {
  companies: Company[];
  farms: Farm[];
  sheds: Shed[];
  groups: HerdGroup[];
  users: User[];
  animals: Animal[];
  lactations: LactationRecord[];
  calvings: CalvingRecord[];
  milkRecords: MilkRecord[];
  breedingRecords: BreedingRecord[];
  medicines: Medicine[];
  healthRecords: HealthRecord[];
  treatments: TreatmentRecord[];
  vaccinations: VaccinationRecord[];
  feedItems: FeedItem[];
  rations: Ration[];
  feedTransactions: FeedInventoryTransaction[];
  purchases: AnimalPurchase[];
  sales: AnimalSale[];
  mortalities: MortalityRecord[];
  expenses: Expense[];
  incomes: Income[];
  customers: Customer[];
  suppliers: Supplier[];
  tasks: Task[];
  notifications: Notification[];
  attachments: Attachment[];
  warehouses: Warehouse[];
  vaccineStocks: VaccineStock[];
  semenStraws: SemenStraw[];
  inventoryTransactions: InventoryTransaction[];
  quarantineRecords: QuarantineRecord[];
  healthAuditLogs: HealthAuditLog[];
}

export function getInitialDatabase(): MockDatabase {
  return {
    companies: [mockCompany],
    farms: [mockFarm],
    sheds: mockSheds,
    groups: mockGroups,
    users: mockUsers,
    animals: mockAnimals,
    lactations: mockLactations,
    calvings: mockCalvings,
    milkRecords: mockMilkRecords,
    breedingRecords: mockBreedingRecords,
    medicines: mockMedicines,
    healthRecords: mockHealthRecords,
    treatments: mockTreatments,
    vaccinations: mockVaccinations,
    feedItems: mockFeedItems,
    rations: mockRations,
    feedTransactions: mockFeedTransactions,
    purchases: mockPurchases,
    sales: mockSales,
    mortalities: mockMortalities,
    expenses: mockExpenses,
    incomes: mockIncomes,
    customers: mockCustomers,
    suppliers: mockSuppliers,
    tasks: mockTasks,
    notifications: mockNotifications,
    attachments: mockAttachments,
    warehouses: mockWarehouses,
    vaccineStocks: mockVaccines,
    semenStraws: mockSemenStraws,
    inventoryTransactions: mockInventoryTransactions,
    quarantineRecords: [],
    healthAuditLogs: [
      {
        id: 'audit-001',
        farmId: 'farm-001',
        timestamp: '2024-05-09T08:30:00Z',
        user: 'Dr. Imran Qureshi',
        action: 'Treatment Started',
        entity: 'Treatment',
        entityId: 'treatment-0001',
        animalTag: 'HF-038',
        oldValue: 'Status: Healthy',
        newValue: 'Status: In Treatment (Tick Fever)',
        notes: 'Initiated Oxytetracycline 20% LA 25ml deep IM. 10 days milk withdrawal hold placed.',
      },
      {
        id: 'audit-002',
        farmId: 'farm-001',
        timestamp: '2024-05-09T08:31:00Z',
        user: 'Dr. Imran Qureshi',
        action: 'Milk Hold Created',
        entity: 'Treatment',
        entityId: 'treatment-0001',
        animalTag: 'HF-038',
        oldValue: 'Milk Status: Cleared for Tank',
        newValue: 'Milk Status: Active Hold Until 2024-05-19',
        notes: 'Automated bulk tank hold activated. Discard in parlor mandatory.',
      },
      {
        id: 'audit-003',
        farmId: 'farm-001',
        timestamp: '2024-05-09T08:32:00Z',
        user: 'Dr. Imran Qureshi',
        action: 'Medicine Issued',
        entity: 'Medicine',
        entityId: 'medicine-0005',
        animalTag: 'HF-038',
        oldValue: 'Stock: 100 ml',
        newValue: 'Stock: 75 ml',
        notes: 'Dispensed 25 ml Oxytetracycline 20% LA for HF-038.',
      },
    ],
  };
}
