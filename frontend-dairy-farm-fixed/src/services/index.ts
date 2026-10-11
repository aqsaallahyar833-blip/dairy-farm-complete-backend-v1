import {
  animalWritesApi,
  animalsApi,
  animalPurchaseApi,
  animalSaleApi,
  animalMortalityApi,
  AppApiError,
  breedingApi,
  calvingApi,
  catalogApi,
  dashboardApi,
  financeApi,
  customerApi,
  taskApi,
  notificationApi,
  feedApi,
  feedConsumptionApi,
  feedTransactionApi,
  farmReportApi,
  healthApi,
  inventoryApi,
  lookupsApi,
  milkApi,
  milkReportApi,
  pregnancyApi,
  rationApi,
  supplierApi,
  treatmentApi,
  vaccinationApi,
} from './api/apiClient';
import { mockApi } from './mock/mockApi';
import type {
  Animal,
  AnimalListQuery,
  AnimalSale,
  ApiResponse,
  Customer,
  BreedingRecord,
  CalvingRecord,
  CreateAnimalInput,
  FeedInventoryTransaction,
  FeedItem,
  HealthDashboardSummary,
  HealthRecord,
  InventoryTransaction,
  Medicine,
  MilkDailySummary,
  MilkListQuery,
  MilkRecord,
  Notification,
  PaginatedResponse,
  PregnancyRecord,
  Ration,
  SemenStraw,
  Supplier,
  Task,
  TreatmentRecord,
  VaccineStock,
  VaccinationRecord,
  Warehouse,
} from '../types';

type ListResponse<T> = ApiResponse<T[]>;

async function toListResponse<T>(source: Promise<PaginatedResponse<T>>): Promise<ListResponse<T>> {
  const result = await source;
  return { success: true, data: result.data };
}

type DashboardResult = {
  success: boolean;
  message?: string;
  data: import('../types').DashboardSummary | null;
};

type DashboardService = {
  getSummary: (farmId: number) => Promise<DashboardResult>;
};

type ReportService = {
  getMilkReport: (farmId: number, query: import('../types').MilkReportQuery) => Promise<ApiResponse<import('../types').MilkReport>>;
  getFinancialReport: (farmId: number, from: string, to: string) => Promise<ApiResponse<import('../types').FinancialReport>>;
};

type InventorySummaryMetrics = {
  totalWarehouses: number;
  totalFeedStock: number;
  totalMedicines: number;
  totalVaccines: number;
  totalSemenStraws: number;
  inventoryValue: number;
  expiringItems: number;
  outOfStockItems: number;
};

type UnsupportedInventoryItem = VaccineStock | SemenStraw | Warehouse;

function unsupported<T>(message: string): Promise<ApiResponse<T>> {
  return Promise.reject(new AppApiError(message, 'UNSUPPORTED'));
}

const UNSUPPORTED_VACCINE = 'Vaccine inventory is not currently supported by the backend.';
const UNSUPPORTED_SEMEN = 'Semen inventory is not currently supported by the backend.';
const UNSUPPORTED_WAREHOUSE = 'Warehouse management is not currently supported by the backend.';
const UNSUPPORTED_METRICS = 'Inventory summary metrics are not currently supported by the backend.';

export const animalService = {
  list: (query?: AnimalListQuery) => animalsApi.list({
    page: query?.page,
    pageSize: query?.pageSize,
    search: query?.search,
    farmId: query?.farmId ? Number(query.farmId) : undefined,
    status: query?.status ?? (query?.lactating ? 'Lactating' : undefined),
    sex: query?.sex,
    groupId: query?.groupId ? Number(query.groupId) : undefined,
  }),
  getById: (id: string) => animalsApi.getById(id),
  create: (input: CreateAnimalInput) => {
    const farmId = Number(input.farmId);
    if (!Number.isInteger(farmId) || farmId <= 0) {
      return Promise.reject(new AppApiError('A valid farm is required to register an animal.', 'INVALID_FARM'));
    }
    return animalWritesApi.create({
    farmId, animalCode: input.animalId || undefined, name: input.name,
    breedId: undefined,
    sex: input.sex === 'Male' ? 'MALE' : 'FEMALE', dateOfBirth: input.dateOfBirth,
    status: input.status?.toUpperCase(), groupId: input.groupId ? Number(input.groupId) : undefined,
    notes: input.remarks, earTag: input.earTag, rfid: input.rfid,
    });
  },
  update: (id: string, input: Partial<Animal>) => animalWritesApi.update(Number(id), input),
  archive: (id: string) => animalWritesApi.changeStatus(Number(id), 'SOLD'),
  getNextId: () => unsupported<string>('Generating the next animal code is not supported by the backend.'),
  getNextTag: () => unsupported<string>('Generating the next ear tag is not supported by the backend.'),
  listPurchases: (farmId: number) => toListResponse(animalPurchaseApi.list(farmId)),
  listSales: (farmId: number) => toListResponse(animalSaleApi.list(farmId)),
  listMortalities: (farmId: number) => toListResponse(animalMortalityApi.list(farmId)),
  recordSale: (input: Omit<AnimalSale, 'id'>) => {
    const farmId = Number(input.farmId);
    if (!Number.isInteger(farmId) || farmId <= 0) {
      return Promise.reject(new AppApiError('A valid farm is required to record a sale.', 'INVALID_FARM'));
    }
    return animalSaleApi.create(farmId, {
      animalId: input.animalId,
      saleDate: input.saleDate,
      salePrice: input.salePrice,
      buyerName: input.buyerName,
      buyerPhone: input.buyerPhone,
      weightKg: input.weightKg,
      costBasis: input.purchasePrice,
      reason: input.reason ?? input.saleReason,
      notes: input.notes,
    });
  },
  recordMortality: (input: Omit<import('../types').MortalityRecord, 'id'>) => {
    const farmId = Number(input.farmId);
    if (!Number.isInteger(farmId) || farmId <= 0) {
      return Promise.reject(new AppApiError('A valid farm is required to record a mortality record.', 'INVALID_FARM'));
    }
    return animalMortalityApi.create(farmId, {
      animalId: input.animalId,
      deathDate: input.deathDate,
      causeOfDeath: input.causeOfDeath,
      veterinarian: input.veterinarian,
      postMortemNotes: input.postMortemNotes,
    });
  },
  listLactations: (animalId: string) => unsupported<import('../types').LactationRecord[]>('Animal lactation history is not currently supported by the backend.'),
  listCalvings: (_animalId?: string) => unsupported<CalvingRecord[]>('Animal-specific calving history is not currently supported by the backend.'),
};

export const milkService = {
  list: (farmId: number, query?: MilkListQuery) => milkApi.list(farmId, query),
  create: (farmId: number, input: Parameters<typeof milkApi.create>[1]) => milkApi.create(farmId, input),
  async getDailySummary(farmId: number, date: string): Promise<ApiResponse<MilkDailySummary>> {
    const records = await milkApi.list(farmId, { from: date, to: date, pageSize: 1000 });
    const bySession = (session: MilkRecord['session']) => records.data
      .filter((record) => record.session === session)
      .reduce((sum, record) => sum + record.quantityLiters, 0);
    const morningLiters = bySession('Morning');
    const eveningLiters = bySession('Evening');
    const thirdLiters = bySession('Third');
    const totalLiters = morningLiters + eveningLiters + thirdLiters;
    const rejectedLiters = records.data
      .filter((record) => record.qualityStatus === 'Rejected')
      .reduce((sum, record) => sum + record.quantityLiters, 0);
    const animalIds = new Set(records.data.map((record) => record.animalId));
    const fatValues = records.data.flatMap((record) => record.fatPercent == null ? [] : [record.fatPercent]);
    const snfValues = records.data.flatMap((record) => record.snfPercent == null ? [] : [record.snfPercent]);
    return {
      success: true,
      data: {
        date, morningLiters, eveningLiters, thirdLiters, totalLiters,
        milkingCowsCount: animalIds.size,
        averagePerCow: animalIds.size ? totalLiters / animalIds.size : 0,
        rejectedLiters,
        revenue: null,
        avgFat: fatValues.length ? fatValues.reduce((sum, value) => sum + value, 0) / fatValues.length : null,
        avgSnf: snfValues.length ? snfValues.reduce((sum, value) => sum + value, 0) / snfValues.length : null,
      },
    };
  },
};

export const breedingService = {
  list: (farmId: number, query?: { page?: number; pageSize?: number; animalId?: string }) => breedingApi.list(farmId, query),
  create: (farmId: number, input: import('../types').CreateBreedingInput, eventType?: Parameters<typeof breedingApi.create>[1]['eventType'], eventDate?: string) =>
    breedingApi.create(farmId, {
      animalId: input.animalId,
      eventType: eventType ?? 'AI',
      eventDate: eventDate ?? input.serviceDate ?? input.heatDate,
      serviceNumber: input.serviceNumber,
      technicianName: input.inseminatorName ?? input.technician,
      semenBatch: input.semenStrawCode ?? input.semenCode,
      pregnancyResult: input.pregnancyResult,
      expectedCalvingDate: input.expectedCalvingDate,
      notes: input.notes ?? input.remarks,
    }),
  recordCalving: (farmId: number, input: import('../types').CreateCalvingInput) => calvingApi.create(farmId, {
    damId: input.damId,
    pregnancyId: input.pregnancyId,
    calvingDate: input.calvingDate,
    difficulty: input.difficulty,
    calfCount: input.calfCount ?? 1,
    veterinarianName: input.veterinarianName,
    notes: input.notes,
  }),
};

export const pregnancyService = {
  list: (farmId: number) => pregnancyApi.list(farmId),
  create: (farmId: number, input: Parameters<typeof pregnancyApi.create>[1]) => pregnancyApi.create(farmId, input),
};

export const healthService = {
  listHealth: (farmId: number) => toListResponse(healthApi.list(farmId)),
  createHealth: (farmId: number, input: Partial<HealthRecord>) => healthApi.create(farmId, {
    animalId: input.animalId ?? '', recordDate: input.date ?? '', eventType: input.eventType,
    symptoms: input.symptoms, diagnosis: input.diagnosis, veterinarian: input.veterinarian,
    followUpDate: input.followUpDate, status: input.status,
  }),
  deleteHealth: (farmId: number, id: string) => healthApi.remove(farmId, id),
  listTreatments: (farmId: number) => toListResponse(treatmentApi.list(farmId)),
  createTreatment: (farmId: number, input: Partial<TreatmentRecord>) => treatmentApi.create(farmId, {
    animalId: input.animalId ?? '', treatmentDate: input.date ?? input.startDate ?? '',
    healthRecordId: input.healthRecordId, medicineId: input.medicineId, dosage: input.dosage,
    administrationRoute: input.route, frequency: input.frequency, durationDays: input.durationDays,
    veterinarian: input.veterinarian, notes: input.notes,
    withdrawalMilkUntil: input.withdrawalEndDate, withdrawalMeatUntil: input.withdrawalEndDate,
  }),
  completeTreatment: (id: string, _options?: { override?: boolean; overrideReason?: string; authorizedBy?: string }) => unsupported<TreatmentRecord>('Completing treatments is not currently supported by the backend.'),
  listMedicines: () => toListResponse(catalogApi.medicines()),
  listVaccinations: (farmId: number) => toListResponse(vaccinationApi.list(farmId)),
  createVaccination: (farmId: number, input: Partial<VaccinationRecord>) => vaccinationApi.create(farmId, {
    vaccineName: input.vaccineName ?? '', vaccinationDate: input.date ?? '', nextDueDate: input.nextDueDate,
    batchNumber: input.batchNumber, manufacturer: input.manufacturer, veterinarian: input.veterinarian,
    animalId: input.animalId, groupId: input.groupId,
  }),
  listQuarantine: () => unsupported<import('../types').QuarantineRecord[]>('Quarantine management is not currently supported by the backend.'),
  getDashboardSummary: () => unsupported<HealthDashboardSummary>('Health dashboard metrics are not currently supported by the backend.'),
  listAuditLogs: () => unsupported<import('../types').HealthAuditLog[]>('Health audit logs are not currently supported by the backend.'),
};

export const feedService = {
  listFeedItems: (farmId: number) => toListResponse(feedApi.list(farmId)),
  async getFeedItemById(farmId: number, id: string): Promise<ApiResponse<FeedItem | null>> {
    const response = await toListResponse(feedApi.list(farmId));
    return { success: true, data: response.data.find((item) => item.id === id) ?? null };
  },
  createFeedItem: (farmId: number, input: Parameters<typeof feedApi.create>[1]) => feedApi.create(farmId, input),
  deleteFeedItem: (farmId: number, id: string) => feedApi.remove(farmId, id),
  listRations: (farmId: number) => toListResponse(rationApi.list(farmId)),
  listTransactions: (farmId: number) => toListResponse(feedTransactionApi.list(farmId)),
  recordTransaction: (farmId: number, input: Parameters<typeof feedTransactionApi.create>[1] & { feedItemName?: string }) => feedTransactionApi.create(farmId, input),
  listConsumption: (farmId: number) => feedConsumptionApi.list(farmId),
  recordConsumption: (farmId: number, input: Parameters<typeof feedConsumptionApi.create>[1]) => feedConsumptionApi.create(farmId, input),
};

export const inventoryService = {
  // Feed Ã¢â‚¬â€ the SAME real API as feedService; no second persistence path.
  listFeed: async (farmId) => feedService.listFeedItems(farmId),
  getFeedById: async (farmId, id) => feedService.getFeedItemById(farmId, id),
  createFeed: (farmId, input) => feedService.createFeedItem(farmId, input),
  updateFeed: async (..._args: unknown[]) => unsupported<FeedItem>(
    'Editing feed items is currently unavailable (backend update is not supported).'
  ),
  deleteFeed: (farmId, id) => feedService.deleteFeedItem(farmId, id),

  // Medicines Ã¢â‚¬â€ GLOBAL catalogue, NOT Feed. Left on its existing path.
  listMedicines: () => toListResponse(catalogApi.medicines()),
  getMedicineById: async (id) => ({
    success: true,
    data: (await catalogApi.medicines()).data.find((m) => String(m.id) === String(id)) ?? null,
  }),
  createMedicine: (input) => mockApi.createMedicine(input),
  updateMedicine: (id, input) => mockApi.updateMedicine(id, input),
  deleteMedicine: (id) => mockApi.deleteMedicine(id),

  // Vaccines
  listVaccines: async () => unsupported<VaccineStock[]>(UNSUPPORTED_VACCINE),
  getVaccineById: async (..._args: unknown[]) => unsupported<VaccineStock>(UNSUPPORTED_VACCINE),
  createVaccine: async (..._args: unknown[]) => unsupported<VaccineStock>(UNSUPPORTED_VACCINE),
  updateVaccine: async (..._args: unknown[]) => unsupported<VaccineStock>(UNSUPPORTED_VACCINE),
  deleteVaccine: async (..._args: unknown[]) => unsupported<void>(UNSUPPORTED_VACCINE),

  // Semen
  listSemen: async () => unsupported<SemenStraw[]>(UNSUPPORTED_SEMEN),
  getSemenById: async (..._args: unknown[]) => unsupported<SemenStraw>(UNSUPPORTED_SEMEN),
  createSemen: async (..._args: unknown[]) => unsupported<SemenStraw>(UNSUPPORTED_SEMEN),
  updateSemen: async (..._args: unknown[]) => unsupported<SemenStraw>(UNSUPPORTED_SEMEN),
  deleteSemen: async (..._args: unknown[]) => unsupported<void>(UNSUPPORTED_SEMEN),

  // Warehouses
  listWarehouses: async () => unsupported<Warehouse[]>(UNSUPPORTED_WAREHOUSE),
  getWarehouseById: async (..._args: unknown[]) => unsupported<Warehouse>(UNSUPPORTED_WAREHOUSE),
  createWarehouse: async (..._args: unknown[]) => unsupported<Warehouse>(UNSUPPORTED_WAREHOUSE),
  updateWarehouse: async (..._args: unknown[]) => unsupported<Warehouse>(UNSUPPORTED_WAREHOUSE),
  deleteWarehouse: async (..._args: unknown[]) => unsupported<void>(UNSUPPORTED_WAREHOUSE),

  // Transactions
  listTransactions: (farmId: number) => toListResponse(inventoryApi.listTransactions(farmId)),
  recordPurchase: (_input: Omit<InventoryTransaction, 'id' | 'farmId' | 'createdAt'>) => unsupported<InventoryTransaction>('Recording inventory purchases is not currently supported by the backend.'),
  recordConsumption: (_input: Omit<InventoryTransaction, 'id' | 'farmId' | 'createdAt'>) => unsupported<InventoryTransaction>('Recording inventory consumption is not currently supported by the backend.'),
  deleteTransaction: (_id: string) => unsupported<void>('Deleting inventory transactions is not currently supported by the backend.'),

  // Live Metrics
  getSummaryMetrics: async () => unsupported<InventorySummaryMetrics>(UNSUPPORTED_METRICS),
};

export const financeService = {
  listExpenses: (farmId: number) => financeApi.listTransactions(farmId, 'EXPENSE'),
  createExpense: async (farmId: number, input) => {
    const categories = await financeApi.listCategories(farmId);
    const category = categories.data.find((item) => item.categoryType.toUpperCase() === 'EXPENSE' && item.name.toLowerCase() === String(input.category).toLowerCase());
    if (!category) throw new Error(`No backend expense category matches "${input.category}".`);
    return financeApi.createTransaction(farmId, 'EXPENSE', {
      categoryId: String(category.categoryId), date: input.date, amount: input.amount,
      paymentMethod: input.paymentMethod, description: input.description,
    });
  },
  listIncomes: (farmId: number) => financeApi.listTransactions(farmId, 'INCOME'),
  createIncome: async (farmId: number, input) => {
    const categoryName = input.category ?? input.source ?? '';
    const categories = await financeApi.listCategories(farmId);
    const category = categories.data.find((item) => item.categoryType.toUpperCase() === 'INCOME' && item.name.toLowerCase() === String(categoryName).toLowerCase());
    if (!category) throw new Error(`No backend income category matches "${categoryName}".`);
    return financeApi.createTransaction(farmId, 'INCOME', {
      categoryId: String(category.categoryId), date: input.date, amount: input.amount,
      paymentMethod: input.paymentMethod, description: input.description,
    });
  },
  listCustomers: (farmId: number) => customerApi.list(farmId),
  createCustomer: async () => unsupported<Customer>('Creating customers is not currently supported by the backend.'),
  updateCustomer: async () => unsupported<Customer>('Updating customers is not currently supported by the backend.'),
  recordCustomerPayment: async () => unsupported<void>('Customer payments are not currently supported by the backend.'),
  listSuppliers: async (farmId) => supplierApi.list(farmId),
  createSupplier: async () => unsupported<Supplier>('Creating suppliers is not currently supported by the backend.'),
  updateSupplier: async () => unsupported<Supplier>('Updating suppliers is not currently supported by the backend.'),
  recordSupplierPayment: async () => unsupported<void>('Supplier payments are not currently supported by the backend.'),
};

export const taskService = {
  list: (farmId: number) => taskApi.list(farmId),
  create: (farmId: number, input: Partial<Task>) => taskApi.create(farmId, input),
  updateStatus: async () => unsupported<Task>('Updating task status is not currently supported by the backend.'),
};

export const notificationService = {
  list: (farmId: number) => notificationApi.list(farmId),
  markRead: (id: string) => notificationApi.markRead(id),
  markAllRead: (farmId: number) => notificationApi.markAllRead(farmId),
};

export const alertService = notificationService;

export const lookupService = {
  /** Breeds, farms, groups and sheds for filter dropdowns. Read-only. */
  getBreeds: async () => {
    try {
      return await lookupsApi.getBreeds();
    } catch (err) {
      console.warn('[lookupService] breeds API unavailable.', err);
      return [] as Awaited<ReturnType<typeof lookupsApi.getBreeds>>;
    }
  },
  getBreedByName: (name: string) => lookupsApi.getBreedByName(name),
  getFarms: async () => {
    try {
      return await lookupsApi.getFarms();
    } catch (err) {
      console.warn('[lookupService] farms API unavailable.', err);
      return [] as Awaited<ReturnType<typeof lookupsApi.getFarms>>;
    }
  },
  getAnimalGroups: async (farmId?: number) => {
    try {
      return await lookupsApi.getAnimalGroups(farmId);
    } catch (err) {
      console.warn('[lookupService] animal-groups API unavailable.', err);
      return [] as Awaited<ReturnType<typeof lookupsApi.getAnimalGroups>>;
    }
  },
  getSheds: async (farmId?: number) => {
    try {
      return await lookupsApi.getSheds(farmId);
    } catch (err) {
      console.warn('[lookupService] sheds API unavailable.', err);
      return [] as Awaited<ReturnType<typeof lookupsApi.getSheds>>;
    }
  },
  getAnimalIdentifications: (id: string) => lookupsApi.getAnimalIdentifications(id),
  getAnimalStatusHistory: (id: string) => lookupsApi.getAnimalStatusHistory(id),
};

/** yyyy-MM-dd in LOCAL time; the backend expects an ISO date, not a timestamp. */
function isoDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Short weekday label, e.g. "Mon". */
function dayLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { weekday: 'short' });
}

/**
 * Dashboard Ã¢â‚¬â€ REAL BACKEND ONLY.
 *
 * Replaces `mockApi.getDashboardSummary()`. There is no mock fallback: if a
 * request fails the failure is returned to the caller so the UI can show an
 * error state instead of fabricated numbers.
 *
 * Sources:
 *   GET /api/dashboard                     -> counters and monthly figures
 *   GET /api/reports/farm (today only)     -> today's income / expense / profit
 *   GET /api/reports/milk  (last 7 days)   -> daily production chart
 *   GET /api/reports/farm (one per day)    -> daily expense chart
 */
export const dashboardService: DashboardService = {
  async getSummary(farmId: number): Promise<DashboardResult> {
    // Propagates a genuine failure without inventing a summary.
    const fail = (message: string): DashboardResult => ({
      success: false,
      message: message || 'Could not load dashboard data.',
      data: null,
    });

    const today = new Date();

    const dash = await dashboardApi.get(farmId);
    if (!dash.success || !dash.data) {
      return fail(dash.message);
    }
    const d = dash.data;

    const todayIso = isoDay(today);
    const weekStartIso = isoDay(new Date(today.getTime() - 6 * 86400000));

    // Today-only range: from == to, so the ledger totals are genuinely "today".
    const todayReport = await farmReportApi.get(farmId, todayIso, todayIso);
    if (!todayReport.success || !todayReport.data) {
      return fail(todayReport.message);
    }

    const milkWeek = await milkReportApi.get(farmId, weekStartIso, todayIso);
    if (!milkWeek.success) {
      return fail(milkWeek.message);
    }

    // One real request per day for the expense series. These are reads only.
    const dailyExpenseReports = await Promise.all(
      Array.from({ length: 7 }, (_, i) => {
        const day = isoDay(new Date(today.getTime() - (6 - i) * 86400000));
        return farmReportApi.get(farmId, day, day);
      })
    );

    const failedDaily = dailyExpenseReports.find((r) => !r.success);
    if (failedDaily) return fail(failedDaily.message);

    const byIso = new Map<string, number>(
      (milkWeek.data ?? []).map((r) => [r.date, r.total])
    );
    const milkLast7Days = Array.from({ length: 7 }, (_, i) => {
      const iso = isoDay(new Date(today.getTime() - (6 - i) * 86400000));
      return {
        date: iso,
        label: dayLabel(iso),
        // The canonical milk model exposes one session total per row, so there
        // is no morning/evening split to show.
        morning: null,
        evening: null,
        total: byIso.get(iso) ?? 0,
      };
    });

    const expensesLast7Days = dailyExpenseReports.map((r, i) => {
      const iso = isoDay(new Date(today.getTime() - (6 - i) * 86400000));
      return { date: iso, label: dayLabel(iso), amount: r.data?.expenses ?? 0 };
    });

    return {
      success: true,
      data: {
        animalCounts: {
          total: d.totalAnimals,
          lactating: d.lactating,
          dry: d.dry,
          pregnant: d.pregnant,
          open: d.open,
          heifers: d.heifers,
          calves: d.calves,
          bulls: d.bulls,
          sick: d.sick,
          quarantine: d.quarantine,
        },
        milk: {
          todayLiters: d.todayMilk,
          yesterdayLiters: d.yesterdayMilk,
          averageLiters: d.averageMilkPerCow,
          monthlyLiters: d.monthlyMilk,
          // No canonical source. Rendered as unavailable, never as 0.
          rejectedLiters: null,
          todayRevenue: null,
        },
        finance: {
          todayRevenue: todayReport.data.income,
          todayExpenses: todayReport.data.expenses,
          estimatedProfitToday: todayReport.data.estimatedProfit,
          monthlyRevenue: d.milkRevenue,
          monthlyExpenses: d.monthlyExpenses,
          monthlyProfit: d.estimatedProfit,
        },
        alerts: {
          breedingDue: d.breedingReminders,
          healthAlerts: d.healthAlerts,
          feedStockWarnings: null,
          withdrawalActive: null,
          milkDropAlerts: null,
        },
        charts: {
          milkLast7Days,
          expensesLast7Days,
          topMilkProducers: null,
        },
      },
    };
  },
};

export const reportService: ReportService = {
  async getMilkReport(farmId, query) {
    const result = await milkReportApi.get(farmId, query.from, query.to);
    const rows = result.data ?? [];
    const from = new Date(`${query.from}T00:00:00Z`);
    const to = new Date(`${query.to}T00:00:00Z`);
    const dayCount = Math.max(1, Math.floor((to.getTime() - from.getTime()) / 86400000) + 1);
    const totalLiters = rows.reduce((sum, row) => sum + row.total, 0);
    const acceptedLiters = rows.reduce((sum, row) => sum + row.saleable, 0);

    return {
      success: result.success,
      message: result.message,
      data: result.success
        ? {
            from: query.from,
            to: query.to,
            totalLiters,
            averageDailyLiters: totalLiters / dayCount,
            acceptedLiters,
            rejectedLiters: totalLiters - acceptedLiters,
            // The reports/milk endpoint does not expose quality or pricing.
            totalRevenue: null,
            averageFat: null,
            averageSnf: null,
            animalBreakdown: [],
            dailyBreakdown: rows.map((row) => ({
              date: row.date,
              totalLiters: row.total,
              averagePerCow: row.animals ? row.total / row.animals : 0,
              fatPercent: null,
              snfPercent: null,
              revenue: null,
            })),
          }
        : undefined,
    } as ApiResponse<import('../types').MilkReport>;
  },
  async getFinancialReport(farmId, from, to) {
    const result = await farmReportApi.get(farmId, from, to);
    return {
      success: result.success,
      message: result.message,
      data: result.success
        ? {
            from,
            to,
            totalIncome: result.data?.income ?? 0,
            totalExpenses: result.data?.expenses ?? 0,
            netProfit: result.data?.estimatedProfit ?? 0,
            incomeByCategory: [],
            expenseByCategory: [],
            dailyFlow: [],
          }
        : undefined,
    } as ApiResponse<import('../types').FinancialReport>;
  },
};

export { mockStorage, mockConfig } from './mock/mockStorage';
export { mockData } from './mock/mockData';
export * from './adapters/animalAdapter';
export * from './adapters/milkAdapter';
export * from './adapters/breedingAdapter';
export * from './adapters/healthAdapter';
export * from './adapters/feedAdapter';
export * from './adapters/financeAdapter';
export * from './calculations';