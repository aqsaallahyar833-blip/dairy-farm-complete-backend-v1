/**
 * Mock API Implementation
 * Translates simulated REST routes to mockDb operations with network delay & error simulation.
 */

import { simulateNetwork } from './mockStorage';
import { mockDb } from './mockDb';
import { AppApiError } from '../api/apiClient';
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
  AnimalPurchase,
  AnimalSale,
  MortalityRecord,
  PaginatedResponse,
  ApiResponse,
  AnimalQrProfileDto,
  Warehouse,
  VaccineStock,
  SemenStraw,
  InventoryTransaction,
  QuarantineRecord,
  HealthAuditLog,
  HealthDashboardSummary,
} from '../../types';

export const mockApi = {
  // Animals
  async listAnimals(query?: AnimalListQuery): Promise<PaginatedResponse<Animal>> {
    await simulateNetwork();
    const { data, total } = mockDb.getAnimals(query);
    const pageSize = query?.pageSize || 20;
    return {
      data,
      page: query?.page || 1,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  },

  async getAnimalById(id: string): Promise<ApiResponse<Animal>> {
    await simulateNetwork();
    const animal = mockDb.getAnimalById(id);
    if (!animal) {
      throw new AppApiError(`Animal with ID ${id} not found`, 'NOT_FOUND');
    }
    return { data: animal, success: true };
  },

  async getAnimalByQrToken(qrToken: string): Promise<ApiResponse<Animal>> {
    await simulateNetwork();
    const animal = mockDb.getAnimalByQrToken(qrToken);
    if (!animal) {
      throw new AppApiError('Animal Not Found: This QR code is invalid or the animal record no longer exists.', 'NOT_FOUND');
    }
    return { data: animal, success: true };
  },

  async getAnimalQrProfile(qrTokenOrId: string): Promise<ApiResponse<AnimalQrProfileDto>> {
    await simulateNetwork();
    const profile = mockDb.getAnimalQrProfile(qrTokenOrId);
    if (!profile) {
      throw new AppApiError('Animal Not Found: This QR code is invalid or the animal record no longer exists.', 'NOT_FOUND');
    }
    return { data: profile as AnimalQrProfileDto, success: true };
  },

  async regenerateQrToken(id: string): Promise<ApiResponse<{ qrToken: string; qrCode: string }>> {
    await simulateNetwork();
    try {
      const result = mockDb.regenerateQrToken(id);
      return { data: result, success: true, message: 'Secure QR token regenerated successfully' };
    } catch (err: any) {
      throw new AppApiError(err.message || 'Failed to regenerate QR token', 'VALIDATION_ERROR');
    }
  },

  async getNextAnimalId(): Promise<ApiResponse<string>> {
    await simulateNetwork();
    const nextId = mockDb.getNextAnimalId();
    return { data: nextId, success: true };
  },

  async getNextAnimalTag(): Promise<ApiResponse<string>> {
    await simulateNetwork();
    const nextTag = mockDb.getNextAnimalTag();
    return { data: nextTag, success: true };
  },

  async createAnimal(input: CreateAnimalInput): Promise<ApiResponse<Animal>> {
    await simulateNetwork();
    try {
      const animal = mockDb.createAnimal(input);
      return { data: animal, success: true, message: 'Animal created successfully' };
    } catch (err: any) {
      throw new AppApiError(err.message || 'Failed to create animal', 'VALIDATION_ERROR');
    }
  },

  async updateAnimal(id: string, input: UpdateAnimalInput): Promise<ApiResponse<Animal>> {
    await simulateNetwork();
    try {
      const animal = mockDb.updateAnimal(id, input);
      return { data: animal, success: true, message: 'Animal updated successfully' };
    } catch (err: any) {
      throw new AppApiError(err.message || 'Failed to update animal', 'VALIDATION_ERROR');
    }
  },

  async archiveAnimal(id: string): Promise<ApiResponse<void>> {
    await simulateNetwork();
    mockDb.archiveAnimal(id);
    return { data: undefined as unknown as void, success: true, message: 'Animal archived' };
  },

  async listLactations(animalId?: string): Promise<ApiResponse<LactationRecord[]>> {
    await simulateNetwork();
    const data = mockDb.getLactations(animalId);
    return { data, success: true };
  },

  async listCalvings(damId?: string): Promise<ApiResponse<CalvingRecord[]>> {
    await simulateNetwork();
    const data = mockDb.getCalvings(damId);
    return { data, success: true };
  },

  async listPurchases(): Promise<ApiResponse<AnimalPurchase[]>> {
    await simulateNetwork();
    return { data: mockDb.getPurchases(), success: true };
  },

  async listSales(): Promise<ApiResponse<AnimalSale[]>> {
    await simulateNetwork();
    return { data: mockDb.getSales(), success: true };
  },

  async listMortalities(): Promise<ApiResponse<MortalityRecord[]>> {
    await simulateNetwork();
    return { data: mockDb.getMortalities(), success: true };
  },

  async recordSale(sale: Omit<AnimalSale, 'id'>): Promise<ApiResponse<AnimalSale>> {
    await simulateNetwork();
    const result = mockDb.recordSale(sale);
    return { data: result, success: true, message: 'Animal sale recorded successfully' };
  },

  async recordMortality(mort: Omit<MortalityRecord, 'id'>): Promise<ApiResponse<MortalityRecord>> {
    await simulateNetwork();
    const result = mockDb.recordMortality(mort);
    return { data: result, success: true, message: 'Animal mortality recorded' };
  },

  // Milk
  async listMilk(query?: MilkListQuery): Promise<PaginatedResponse<MilkRecord>> {
    await simulateNetwork();
    const { data, total } = mockDb.getMilkRecords(query);
    const pageSize = query?.pageSize || 25;
    return {
      data,
      page: query?.page || 1,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  },

  async createMilkRecord(input: CreateMilkRecordInput): Promise<ApiResponse<MilkRecord>> {
    await simulateNetwork();
    try {
      const record = mockDb.createMilkRecord(input);
      return {
        data: record,
        success: true,
        message: 'Milk record recorded successfully',
      };
    } catch (err: any) {
      throw new AppApiError(err.message || 'Validation failed for milk record', 'VALIDATION_ERROR');
    }
  },

  async getDailyMilkSummary(date: string = '2024-05-14'): Promise<ApiResponse<MilkDailySummary>> {
    await simulateNetwork();
    const summary = mockDb.getDailyMilkSummary(date);
    return { data: summary, success: true };
  },

  async getAnimalMilkSummary(animalId: string): Promise<ApiResponse<MilkAnimalSummary>> {
    await simulateNetwork();
    try {
      const summary = mockDb.getAnimalMilkSummary(animalId);
      return { data: summary, success: true };
    } catch (err: any) {
      throw new AppApiError(err.message, 'NOT_FOUND');
    }
  },

  // Breeding
  async listBreeding(query?: BreedingListQuery): Promise<PaginatedResponse<BreedingRecord>> {
    await simulateNetwork();
    const { data, total } = mockDb.getBreedingRecords(query);
    const pageSize = query?.pageSize || 20;
    return {
      data,
      page: query?.page || 1,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  },

  async createBreeding(input: CreateBreedingInput): Promise<ApiResponse<BreedingRecord>> {
    await simulateNetwork();
    const record = mockDb.createBreeding(input);
    return { data: record, success: true, message: 'Breeding record saved' };
  },

  async createCalving(input: CreateCalvingInput): Promise<ApiResponse<CalvingRecord>> {
    await simulateNetwork();
    const record = mockDb.createCalving(input);
    return { data: record, success: true, message: 'Calving record and new calf registered' };
  },

  // Health
  async listHealth(animalId?: string): Promise<ApiResponse<HealthRecord[]>> {
    await simulateNetwork();
    return { data: mockDb.getHealthRecords(animalId), success: true };
  },

  async getHealthById(id: string): Promise<ApiResponse<HealthRecord>> {
    await simulateNetwork();
    const record = mockDb.getHealthRecordById(id);
    if (!record) throw new AppApiError(`Health event ${id} not found`, 'NOT_FOUND');
    return { data: record, success: true };
  },

  async createHealth(input: Partial<HealthRecord>): Promise<ApiResponse<HealthRecord>> {
    await simulateNetwork();
    try {
      const record = mockDb.createHealthRecord(input);
      return { data: record, success: true, message: 'Clinical health event registered successfully' };
    } catch (err: any) {
      throw new AppApiError(err.message, 'VALIDATION_ERROR');
    }
  },

  async updateHealth(id: string, input: Partial<HealthRecord>): Promise<ApiResponse<HealthRecord>> {
    await simulateNetwork();
    try {
      const record = mockDb.updateHealthRecord(id, input);
      return { data: record, success: true, message: 'Health event updated successfully' };
    } catch (err: any) {
      throw new AppApiError(err.message, 'VALIDATION_ERROR');
    }
  },

  async deleteHealth(id: string): Promise<ApiResponse<void>> {
    await simulateNetwork();
    mockDb.deleteHealthRecord(id);
    return { data: undefined, success: true, message: 'Health event deleted' };
  },

  async listTreatments(animalId?: string): Promise<ApiResponse<TreatmentRecord[]>> {
    await simulateNetwork();
    return { data: mockDb.getTreatments(animalId), success: true };
  },

  async getTreatmentById(id: string): Promise<ApiResponse<TreatmentRecord>> {
    await simulateNetwork();
    const t = mockDb.getTreatmentById(id);
    if (!t) throw new AppApiError(`Treatment with ID ${id} not found`, 'NOT_FOUND');
    return { data: t, success: true };
  },

  async createTreatment(input: Partial<TreatmentRecord>): Promise<ApiResponse<TreatmentRecord>> {
    await simulateNetwork();
    try {
      const treatment = mockDb.createTreatment(input);
      return { data: treatment, success: true, message: 'Treatment registered & withdrawal status synchronized' };
    } catch (err: any) {
      throw new AppApiError(err.message, 'VALIDATION_ERROR');
    }
  },

  async updateTreatment(id: string, input: Partial<TreatmentRecord>): Promise<ApiResponse<TreatmentRecord>> {
    await simulateNetwork();
    try {
      const treatment = mockDb.updateTreatment(id, input);
      return { data: treatment, success: true, message: 'Treatment record updated' };
    } catch (err: any) {
      throw new AppApiError(err.message, 'VALIDATION_ERROR');
    }
  },

  async completeTreatment(
    id: string,
    options?: { override?: boolean; overrideReason?: string; authorizedBy?: string }
  ): Promise<ApiResponse<TreatmentRecord>> {
    await simulateNetwork();
    try {
      const treatment = mockDb.completeTreatment(id, options);
      return { data: treatment, success: true, message: 'Treatment completed & milk hold status updated' };
    } catch (err: any) {
      throw new AppApiError(err.message, 'VALIDATION_ERROR');
    }
  },

  async listVaccinations(animalId?: string): Promise<ApiResponse<VaccinationRecord[]>> {
    await simulateNetwork();
    return { data: mockDb.getVaccinations(animalId), success: true };
  },

  async getVaccinationById(id: string): Promise<ApiResponse<VaccinationRecord>> {
    await simulateNetwork();
    const v = mockDb.getVaccinationById(id);
    if (!v) throw new AppApiError(`Vaccination record ${id} not found`, 'NOT_FOUND');
    return { data: v, success: true };
  },

  async createVaccination(input: Partial<VaccinationRecord>): Promise<ApiResponse<VaccinationRecord>> {
    await simulateNetwork();
    try {
      const v = mockDb.createVaccination(input);
      return { data: v, success: true, message: 'Vaccination record registered' };
    } catch (err: any) {
      throw new AppApiError(err.message, 'VALIDATION_ERROR');
    }
  },

  async updateVaccination(id: string, input: Partial<VaccinationRecord>): Promise<ApiResponse<VaccinationRecord>> {
    await simulateNetwork();
    try {
      const v = mockDb.updateVaccination(id, input);
      return { data: v, success: true, message: 'Vaccination schedule updated' };
    } catch (err: any) {
      throw new AppApiError(err.message, 'VALIDATION_ERROR');
    }
  },

  // Quarantine
  async listQuarantine(): Promise<ApiResponse<QuarantineRecord[]>> {
    await simulateNetwork();
    return { data: mockDb.getQuarantineRecords(), success: true };
  },

  async getQuarantineById(id: string): Promise<ApiResponse<QuarantineRecord>> {
    await simulateNetwork();
    const q = mockDb.getQuarantineById(id);
    if (!q) throw new AppApiError(`Quarantine record ${id} not found`, 'NOT_FOUND');
    return { data: q, success: true };
  },

  async createQuarantine(input: Partial<QuarantineRecord>): Promise<ApiResponse<QuarantineRecord>> {
    await simulateNetwork();
    try {
      const q = mockDb.createQuarantineRecord(input);
      return { data: q, success: true, message: 'Animal transferred to biocontainment isolation' };
    } catch (err: any) {
      throw new AppApiError(err.message, 'VALIDATION_ERROR');
    }
  },

  async releaseQuarantine(id: string, dischargeNotes?: string): Promise<ApiResponse<QuarantineRecord>> {
    await simulateNetwork();
    try {
      const q = mockDb.releaseQuarantineRecord(id, dischargeNotes);
      return { data: q, success: true, message: 'Animal discharged from quarantine to main herd' };
    } catch (err: any) {
      throw new AppApiError(err.message, 'VALIDATION_ERROR');
    }
  },

  // Health Audit Logs & Dashboard
  async listHealthAuditLogs(): Promise<ApiResponse<HealthAuditLog[]>> {
    await simulateNetwork();
    return { data: mockDb.getHealthAuditLogs(), success: true };
  },

  async getHealthDashboardSummary(): Promise<ApiResponse<HealthDashboardSummary>> {
    await simulateNetwork();
    return { data: mockDb.getHealthDashboardSummary(), success: true };
  },

  async listMedicines(): Promise<ApiResponse<Medicine[]>> {
    await simulateNetwork();
    return { data: mockDb.getMedicines(), success: true };
  },

  async getMedicineById(id: string): Promise<ApiResponse<Medicine>> {
    await simulateNetwork();
    const med = mockDb.getMedicineById(id);
    if (!med) throw new AppApiError(`Medicine with ID ${id} not found`, 'NOT_FOUND');
    return { data: med, success: true };
  },

  async createMedicine(input: Partial<Medicine>): Promise<ApiResponse<Medicine>> {
    await simulateNetwork();
    try {
      const med = mockDb.createMedicine(input);
      return { data: med, success: true, message: 'Medicine registered successfully' };
    } catch (err: any) {
      throw new AppApiError(err.message, 'VALIDATION_ERROR');
    }
  },

  async updateMedicine(id: string, input: Partial<Medicine>): Promise<ApiResponse<Medicine>> {
    await simulateNetwork();
    try {
      const med = mockDb.updateMedicine(id, input);
      return { data: med, success: true, message: 'Medicine updated successfully' };
    } catch (err: any) {
      throw new AppApiError(err.message, 'VALIDATION_ERROR');
    }
  },

  async deleteMedicine(id: string): Promise<ApiResponse<void>> {
    await simulateNetwork();
    const success = mockDb.deleteMedicine(id);
    if (!success) throw new AppApiError(`Medicine with ID ${id} not found`, 'NOT_FOUND');
    return { data: undefined, success: true, message: 'Medicine deleted successfully' };
  },

  // Vaccines Inventory
  async listVaccines(): Promise<ApiResponse<VaccineStock[]>> {
    await simulateNetwork();
    return { data: mockDb.getVaccines(), success: true };
  },

  async getVaccineById(id: string): Promise<ApiResponse<VaccineStock>> {
    await simulateNetwork();
    const vac = mockDb.getVaccineById(id);
    if (!vac) throw new AppApiError(`Vaccine with ID ${id} not found`, 'NOT_FOUND');
    return { data: vac, success: true };
  },

  async createVaccine(input: Partial<VaccineStock>): Promise<ApiResponse<VaccineStock>> {
    await simulateNetwork();
    try {
      const vac = mockDb.createVaccine(input);
      return { data: vac, success: true, message: 'Vaccine registered successfully' };
    } catch (err: any) {
      throw new AppApiError(err.message, 'VALIDATION_ERROR');
    }
  },

  async updateVaccine(id: string, input: Partial<VaccineStock>): Promise<ApiResponse<VaccineStock>> {
    await simulateNetwork();
    try {
      const vac = mockDb.updateVaccine(id, input);
      return { data: vac, success: true, message: 'Vaccine updated successfully' };
    } catch (err: any) {
      throw new AppApiError(err.message, 'VALIDATION_ERROR');
    }
  },

  async deleteVaccine(id: string): Promise<ApiResponse<void>> {
    await simulateNetwork();
    const success = mockDb.deleteVaccine(id);
    if (!success) throw new AppApiError(`Vaccine with ID ${id} not found`, 'NOT_FOUND');
    return { data: undefined, success: true, message: 'Vaccine deleted successfully' };
  },

  // Semen Straw Liquid Nitrogen Bank
  async listSemenStraws(): Promise<ApiResponse<SemenStraw[]>> {
    await simulateNetwork();
    return { data: mockDb.getSemenStraws(), success: true };
  },

  async getSemenStrawById(id: string): Promise<ApiResponse<SemenStraw>> {
    await simulateNetwork();
    const straw = mockDb.getSemenStrawById(id);
    if (!straw) throw new AppApiError(`Semen straw record with ID ${id} not found`, 'NOT_FOUND');
    return { data: straw, success: true };
  },

  async createSemenStraw(input: Partial<SemenStraw>): Promise<ApiResponse<SemenStraw>> {
    await simulateNetwork();
    try {
      const straw = mockDb.createSemenStraw(input);
      return { data: straw, success: true, message: 'Semen straw registered in liquid nitrogen tank' };
    } catch (err: any) {
      throw new AppApiError(err.message, 'VALIDATION_ERROR');
    }
  },

  async updateSemenStraw(id: string, input: Partial<SemenStraw>): Promise<ApiResponse<SemenStraw>> {
    await simulateNetwork();
    try {
      const straw = mockDb.updateSemenStraw(id, input);
      return { data: straw, success: true, message: 'Semen straw record updated successfully' };
    } catch (err: any) {
      throw new AppApiError(err.message, 'VALIDATION_ERROR');
    }
  },

  async deleteSemenStraw(id: string): Promise<ApiResponse<void>> {
    await simulateNetwork();
    const success = mockDb.deleteSemenStraw(id);
    if (!success) throw new AppApiError(`Semen straw record with ID ${id} not found`, 'NOT_FOUND');
    return { data: undefined, success: true, message: 'Semen straw record deleted successfully' };
  },

  // Warehouses
  async listWarehouses(): Promise<ApiResponse<Warehouse[]>> {
    await simulateNetwork();
    return { data: mockDb.getWarehouses(), success: true };
  },

  async getWarehouseById(id: string): Promise<ApiResponse<Warehouse>> {
    await simulateNetwork();
    const wh = mockDb.getWarehouseById(id);
    if (!wh) throw new AppApiError(`Warehouse with ID ${id} not found`, 'NOT_FOUND');
    return { data: wh, success: true };
  },

  async createWarehouse(input: Partial<Warehouse>): Promise<ApiResponse<Warehouse>> {
    await simulateNetwork();
    try {
      const wh = mockDb.createWarehouse(input);
      return { data: wh, success: true, message: 'Warehouse registered successfully' };
    } catch (err: any) {
      throw new AppApiError(err.message, 'VALIDATION_ERROR');
    }
  },

  async updateWarehouse(id: string, input: Partial<Warehouse>): Promise<ApiResponse<Warehouse>> {
    await simulateNetwork();
    try {
      const wh = mockDb.updateWarehouse(id, input);
      return { data: wh, success: true, message: 'Warehouse updated successfully' };
    } catch (err: any) {
      throw new AppApiError(err.message, 'VALIDATION_ERROR');
    }
  },

  async deleteWarehouse(id: string): Promise<ApiResponse<void>> {
    await simulateNetwork();
    const success = mockDb.deleteWarehouse(id);
    if (!success) throw new AppApiError(`Warehouse with ID ${id} not found`, 'NOT_FOUND');
    return { data: undefined, success: true, message: 'Warehouse deleted successfully' };
  },

  // Feed
  async listFeedItems(): Promise<ApiResponse<FeedItem[]>> {
    await simulateNetwork();
    return { data: mockDb.getFeedItems(), success: true };
  },

  async getFeedItemById(id: string): Promise<ApiResponse<FeedItem>> {
    await simulateNetwork();
    const feed = mockDb.getFeedItemById(id);
    if (!feed) throw new AppApiError(`Feed item with ID ${id} not found`, 'NOT_FOUND');
    return { data: feed, success: true };
  },

  async createFeedItem(input: Partial<FeedItem>): Promise<ApiResponse<FeedItem>> {
    await simulateNetwork();
    try {
      const feed = mockDb.createFeedItem(input);
      return { data: feed, success: true, message: 'Feed item saved successfully' };
    } catch (err: any) {
      throw new AppApiError(err.message, 'VALIDATION_ERROR');
    }
  },

  async updateFeedItem(id: string, input: Partial<FeedItem>): Promise<ApiResponse<FeedItem>> {
    await simulateNetwork();
    try {
      const feed = mockDb.updateFeedItem(id, input);
      return { data: feed, success: true, message: 'Feed item updated successfully' };
    } catch (err: any) {
      throw new AppApiError(err.message, 'VALIDATION_ERROR');
    }
  },

  async deleteFeedItem(id: string): Promise<ApiResponse<void>> {
    await simulateNetwork();
    const success = mockDb.deleteFeedItem(id);
    if (!success) throw new AppApiError(`Feed item with ID ${id} not found`, 'NOT_FOUND');
    return { data: undefined, success: true, message: 'Feed item deleted successfully' };
  },

  async listRations(): Promise<ApiResponse<Ration[]>> {
    await simulateNetwork();
    return { data: mockDb.getRations(), success: true };
  },

  async listFeedTransactions(): Promise<ApiResponse<FeedInventoryTransaction[]>> {
    await simulateNetwork();
    return { data: mockDb.getFeedTransactions(), success: true };
  },

  async recordFeedTransaction(
    tx: Omit<FeedInventoryTransaction, 'id' | 'farmId'>
  ): Promise<ApiResponse<FeedInventoryTransaction>> {
    await simulateNetwork();
    try {
      const record = mockDb.recordFeedTransaction(tx);
      return { data: record, success: true, message: 'Feed transaction recorded' };
    } catch (err: any) {
      throw new AppApiError(err.message, 'VALIDATION_ERROR');
    }
  },

  // Stock Transactions (Purchases & Consumptions)
  async listInventoryTransactions(): Promise<ApiResponse<InventoryTransaction[]>> {
    await simulateNetwork();
    return { data: mockDb.getInventoryTransactions(), success: true };
  },

  async recordInventoryPurchase(
    input: Omit<InventoryTransaction, 'id' | 'farmId' | 'createdAt'>
  ): Promise<ApiResponse<InventoryTransaction>> {
    await simulateNetwork();
    try {
      const tx = mockDb.recordInventoryPurchase(input);
      return { data: tx, success: true, message: 'Stock purchase recorded & balance updated' };
    } catch (err: any) {
      throw new AppApiError(err.message, 'VALIDATION_ERROR');
    }
  },

  async recordInventoryConsumption(
    input: Omit<InventoryTransaction, 'id' | 'farmId' | 'createdAt'>
  ): Promise<ApiResponse<InventoryTransaction>> {
    await simulateNetwork();
    try {
      const tx = mockDb.recordInventoryConsumption(input);
      return { data: tx, success: true, message: 'Stock consumption recorded & balance updated' };
    } catch (err: any) {
      throw new AppApiError(err.message, 'VALIDATION_ERROR');
    }
  },

  async deleteInventoryTransaction(id: string): Promise<ApiResponse<void>> {
    await simulateNetwork();
    const success = mockDb.deleteInventoryTransaction(id);
    if (!success) throw new AppApiError(`Inventory transaction with ID ${id} not found`, 'NOT_FOUND');
    return { data: undefined, success: true, message: 'Transaction record deleted' };
  },

  // Live Inventory Dashboard Metrics
  async getInventorySummaryMetrics() {
    await simulateNetwork();
    return { data: mockDb.getLiveInventoryMetrics(), success: true };
  },

  // Finance
  async listExpenses(): Promise<ApiResponse<Expense[]>> {
    await simulateNetwork();
    return { data: mockDb.getExpenses(), success: true };
  },

  async createExpense(input: Omit<Expense, 'id' | 'farmId'>): Promise<ApiResponse<Expense>> {
    await simulateNetwork();
    const expense = mockDb.createExpense(input);
    return { data: expense, success: true, message: 'Expense recorded' };
  },

  async listIncomes(): Promise<ApiResponse<Income[]>> {
    await simulateNetwork();
    return { data: mockDb.getIncomes(), success: true };
  },

  async createIncome(input: Omit<Income, 'id' | 'farmId'>): Promise<ApiResponse<Income>> {
    await simulateNetwork();
    const income = mockDb.createIncome(input);
    return { data: income, success: true, message: 'Income recorded' };
  },

  async listCustomers(): Promise<ApiResponse<Customer[]>> {
    await simulateNetwork();
    return { data: mockDb.getCustomers(), success: true };
  },

  async createCustomer(input: Omit<Customer, 'id' | 'farmId'>): Promise<ApiResponse<Customer>> {
    await simulateNetwork();
    const customer = mockDb.createCustomer(input);
    return { data: customer, success: true, message: 'Customer registered' };
  },

  async updateCustomer(id: string, input: Partial<Customer>): Promise<ApiResponse<Customer>> {
    await simulateNetwork();
    const customer = mockDb.updateCustomer(id, input);
    return { data: customer, success: true, message: 'Customer updated' };
  },

  async recordCustomerPayment(
    customerId: string,
    amount: number,
    date: string,
    paymentMethod?: string,
    notes?: string
  ): Promise<ApiResponse<Customer>> {
    await simulateNetwork();
    const customer = mockDb.recordCustomerPayment(customerId, amount, date, paymentMethod, notes);
    return { data: customer, success: true, message: 'Customer payment recorded' };
  },

  async listSuppliers(): Promise<ApiResponse<Supplier[]>> {
    await simulateNetwork();
    return { data: mockDb.getSuppliers(), success: true };
  },

  async createSupplier(input: Omit<Supplier, 'id' | 'farmId'>): Promise<ApiResponse<Supplier>> {
    await simulateNetwork();
    const supplier = mockDb.createSupplier(input);
    return { data: supplier, success: true, message: 'Supplier registered' };
  },

  async updateSupplier(id: string, input: Partial<Supplier>): Promise<ApiResponse<Supplier>> {
    await simulateNetwork();
    const supplier = mockDb.updateSupplier(id, input);
    return { data: supplier, success: true, message: 'Supplier updated' };
  },

  async recordSupplierPayment(
    supplierId: string,
    amount: number,
    date: string,
    paymentMethod?: string,
    notes?: string
  ): Promise<ApiResponse<Supplier>> {
    await simulateNetwork();
    const supplier = mockDb.recordSupplierPayment(supplierId, amount, date, paymentMethod, notes);
    return { data: supplier, success: true, message: 'Supplier payment recorded' };
  },

  // Tasks & Notifications
  async listTasks(): Promise<ApiResponse<Task[]>> {
    await simulateNetwork();
    return { data: mockDb.getTasks(), success: true };
  },

  async createTask(input: Partial<Task>): Promise<ApiResponse<Task>> {
    await simulateNetwork();
    const task = mockDb.createTask(input);
    return { data: task, success: true, message: 'Task created' };
  },

  async updateTaskStatus(id: string, status: Task['status']): Promise<ApiResponse<Task>> {
    await simulateNetwork();
    const task = mockDb.updateTaskStatus(id, status);
    return { data: task, success: true };
  },

  async listNotifications(): Promise<ApiResponse<Notification[]>> {
    await simulateNetwork();
    return { data: mockDb.getNotifications(), success: true };
  },

  async markNotificationRead(id: string): Promise<ApiResponse<void>> {
    await simulateNetwork();
    mockDb.markNotificationRead(id);
    return { data: undefined as unknown as void, success: true };
  },

  async markAllNotificationsRead(): Promise<ApiResponse<void>> {
    await simulateNetwork();
    mockDb.markAllNotificationsRead();
    return { data: undefined as unknown as void, success: true };
  },

  // Dashboard & Reports
  async getDashboardSummary(): Promise<ApiResponse<DashboardSummary>> {
    await simulateNetwork();
    return { data: mockDb.getDashboardSummary(), success: true };
  },

  async getMilkReport(query: MilkReportQuery): Promise<ApiResponse<MilkReport>> {
    await simulateNetwork();
    return { data: mockDb.getMilkReport(query), success: true };
  },

  async getFinancialReport(from: string, to: string): Promise<ApiResponse<FinancialReport>> {
    await simulateNetwork();
    return { data: mockDb.getFinancialReport(from, to), success: true };
  },
};
