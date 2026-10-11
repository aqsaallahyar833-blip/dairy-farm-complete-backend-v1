import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

export interface InventoryDbState {
  warehouses: any[];
  feedStocks: any[];
  medicineStocks: any[];
  vaccineStocks: any[];
  semenInventory: any[];
  transactions: any[];
}

const DATA_DIR = path.join(process.cwd(), 'server', 'data');
const INVENTORY_FILE = path.join(DATA_DIR, 'mysql_inventory.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function getInitialServerInventory(): InventoryDbState {
  return {
    warehouses: [
      {
        id: 'warehouse-001',
        farmId: 'farm-001',
        name: 'Silo Bunker A - Silage & Bulk',
        code: 'WH-SILO-01',
        type: 'Silage Bunker',
        capacity: 100000,
        currentStock: 47000,
        currentUtilization: 47.0,
        totalItems: 2,
        location: 'Silo Bunker Yard (North East)',
        manager: 'Muhammad Akram',
        temperatureControlled: false,
      },
      {
        id: 'warehouse-002',
        farmId: 'farm-001',
        name: 'Main Feed & Concentrate Shed',
        code: 'WH-FEED-02',
        type: 'Dry Feed Shed',
        capacity: 40000,
        currentStock: 19800,
        currentUtilization: 49.5,
        totalItems: 6,
        location: 'Barn B Perimeter',
        manager: 'Sajid Mehmood',
        temperatureControlled: false,
      },
      {
        id: 'warehouse-003',
        farmId: 'farm-001',
        name: 'Central Veterinary Pharmacy & Cold Room',
        code: 'WH-PHARM-03',
        type: 'Veterinary Pharmacy',
        capacity: 3000,
        currentStock: 485,
        currentUtilization: 16.2,
        totalItems: 14,
        location: 'Admin & Hospital Block',
        manager: 'Dr. Imran Qureshi',
        temperatureControlled: true,
      },
      {
        id: 'warehouse-004',
        farmId: 'farm-001',
        name: 'Cryogenic Liquid Nitrogen Semen Bank',
        code: 'WH-CRYO-04',
        type: 'Cryogenic Semen Bank',
        capacity: 1500,
        currentStock: 172,
        currentUtilization: 11.5,
        totalItems: 5,
        location: 'Breeding Lab',
        manager: 'Ali Hassan',
        temperatureControlled: true,
      },
      {
        id: 'warehouse-005',
        farmId: 'farm-001',
        name: 'Dry Fodder & Bhoosa Store',
        code: 'WH-STRAW-05',
        type: 'General Store',
        capacity: 35000,
        currentStock: 15000,
        currentUtilization: 42.8,
        totalItems: 2,
        location: 'South Paddock 4',
        manager: 'Bashir Ahmed',
        temperatureControlled: false,
      },
    ],
    feedStocks: [
      {
        id: 'feed-0001',
        farmId: 'farm-001',
        name: 'Maize Silage (Fermented 32% DM)',
        category: 'Silage',
        currentStock: 47000,
        currentStockKg: 47000,
        unit: 'kg',
        unitPrice: 14.5,
        dryMatterPercent: 32,
        minAlertLevel: 10000,
        minStockThresholdKg: 10000,
        supplier: 'National Silage Farms',
        purchaseDate: '2024-05-10',
        expiryDate: '2025-06-30',
        warehouseId: 'warehouse-001',
        warehouseName: 'Silo Bunker A - Silage & Bulk',
        notes: 'Moisture verified at 68% (32% Dry Matter).',
        status: 'Optimal',
      },
      {
        id: 'feed-0002',
        farmId: 'farm-001',
        name: 'Cottonseed Cake (Khal)',
        category: 'Concentrate',
        currentStock: 1400,
        currentStockKg: 1400,
        unit: 'kg',
        unitPrice: 85,
        dryMatterPercent: 90,
        minAlertLevel: 2000,
        minStockThresholdKg: 2000,
        supplier: 'Supreme Feeds',
        purchaseDate: '2024-04-18',
        expiryDate: '2024-12-31',
        warehouseId: 'warehouse-002',
        warehouseName: 'Main Feed & Concentrate Shed',
        notes: 'Protein content 22%. Stock running low.',
        status: 'Reorder',
      },
      {
        id: 'feed-0003',
        farmId: 'farm-001',
        name: 'Wheat Straw (Bhoosa)',
        category: 'Straw',
        currentStock: 15000,
        currentStockKg: 15000,
        unit: 'kg',
        unitPrice: 22,
        dryMatterPercent: 92,
        minAlertLevel: 4000,
        minStockThresholdKg: 4000,
        supplier: 'Punjab Green Forages',
        purchaseDate: '2024-04-20',
        expiryDate: '2025-10-30',
        warehouseId: 'warehouse-005',
        warehouseName: 'Dry Fodder & Bhoosa Store',
        notes: 'Dry, golden baled bhoosa.',
        status: 'Optimal',
      },
    ],
    medicineStocks: [
      {
        id: 'medicine-0001',
        farmId: 'farm-001',
        name: 'Amoxicillin Trihydrate 15% LA',
        batchNumber: 'AMX-2024-08',
        category: 'Antibiotic',
        quantity: 15,
        currentStock: 15,
        stockQuantity: 15,
        unit: 'vial',
        purchaseDate: '2024-03-01',
        expiryDate: '2025-11-30',
        withdrawalDays: 5,
        withdrawalDaysMilk: 5,
        withdrawalDaysMeat: 14,
        supplier: 'Al-Faisal Veterinary Pharma',
        cost: 1850,
        unitPrice: 1850,
        warehouseId: 'warehouse-003',
        warehouseName: 'Central Veterinary Pharmacy & Cold Room',
        status: 'Optimal',
      },
      {
        id: 'medicine-0002',
        farmId: 'farm-001',
        name: 'Oxytetracycline 20% LA',
        batchNumber: 'OXY-LA-551',
        category: 'Antibiotic',
        quantity: 4,
        currentStock: 4,
        stockQuantity: 4,
        unit: 'bottle',
        purchaseDate: '2024-02-15',
        expiryDate: '2025-06-15',
        withdrawalDays: 7,
        withdrawalDaysMilk: 7,
        withdrawalDaysMeat: 21,
        supplier: 'Al-Faisal Veterinary Pharma',
        cost: 2100,
        unitPrice: 2100,
        warehouseId: 'warehouse-003',
        warehouseName: 'Central Veterinary Pharmacy & Cold Room',
        status: 'Reorder',
      },
    ],
    vaccineStocks: [
      {
        id: 'vaccine-0001',
        farmId: 'farm-001',
        vaccineName: 'FMD Quadrivalent Vaccine (O, A, Asia-1)',
        name: 'FMD Quadrivalent Vaccine (O, A, Asia-1)',
        manufacturer: 'Veterinary Research Institute (VRI)',
        batchNumber: 'FMD-VRI-2024-B1',
        expiryDate: '2025-04-30',
        quantity: 180,
        unit: 'doses',
        storageTemperature: '2°C - 8°C (Cold Chain)',
        warehouseId: 'warehouse-003',
        warehouseName: 'Central Veterinary Pharmacy & Cold Room',
        status: 'Optimal',
      },
      {
        id: 'vaccine-0002',
        farmId: 'farm-001',
        vaccineName: 'Hemorrhagic Septicemia (HS) Alum Vaccine',
        name: 'Hemorrhagic Septicemia (HS) Alum Vaccine',
        manufacturer: 'Veterinary Research Institute (VRI)',
        batchNumber: 'HS-AL-2024-09',
        expiryDate: '2025-06-15',
        quantity: 120,
        unit: 'doses',
        storageTemperature: '2°C - 8°C (Cold Chain)',
        warehouseId: 'warehouse-003',
        warehouseName: 'Central Veterinary Pharmacy & Cold Room',
        status: 'Optimal',
      },
    ],
    semenInventory: [
      {
        id: 'semen-0001',
        farmId: 'farm-001',
        bullName: 'AltaSpring-77',
        breed: 'Holstein Friesian',
        strawCode: 'SEM-HF-9901',
        quantity: 45,
        collectionDate: '2023-11-15',
        tankNumber: 'Tank 1 (MVE-XC33)',
        canisterNumber: 'Canister 1',
        position: 'Upper Rack P-01',
        nitrogenLevel: 86,
        nitrogenStatus: 'Optimal',
      },
      {
        id: 'semen-0003',
        farmId: 'farm-001',
        bullName: 'Sahiwal-Royal-Bull 04',
        breed: 'Sahiwal',
        strawCode: 'SEM-SW-04',
        quantity: 35,
        collectionDate: '2023-12-05',
        tankNumber: 'Tank 2 (Cryo-Pro 20L)',
        canisterNumber: 'Canister 1',
        position: 'Canister 1 Rack A',
        nitrogenLevel: 21,
        nitrogenStatus: 'Alert',
      },
    ],
    transactions: [
      {
        id: 'inv-tx-001',
        farmId: 'farm-001',
        itemType: 'Feed',
        itemName: 'Maize Silage (Fermented 32% DM)',
        transactionType: 'Purchase',
        quantity: 15000,
        unit: 'kg',
        unitPrice: 14.5,
        totalCost: 217500,
        warehouseName: 'Silo Bunker A - Silage & Bulk',
        supplier: 'National Silage Farms',
        date: '2024-05-10',
      },
    ],
  };
}

function readInventoryDb(): InventoryDbState {
  ensureDataDir();
  if (!fs.existsSync(INVENTORY_FILE)) {
    const initial = getInitialServerInventory();
    fs.writeFileSync(INVENTORY_FILE, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }
  try {
    const raw = fs.readFileSync(INVENTORY_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed reading inventory db:', err);
    return getInitialServerInventory();
  }
}

function writeInventoryDb(data: InventoryDbState) {
  ensureDataDir();
  fs.writeFileSync(INVENTORY_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// GET /api/inventory
export async function handleGetInventory(req: Request, res: Response) {
  try {
    const db = readInventoryDb();
    const totalWarehouses = db.warehouses.length;
    const totalFeedStock = db.feedStocks.reduce((s, f) => s + (Number(f.currentStock || f.currentStockKg) || 0), 0);
    const totalMedicines = db.medicineStocks.reduce((s, m) => s + (Number(m.quantity || m.stockQuantity) || 0), 0);
    const totalVaccines = db.vaccineStocks.reduce((s, v) => s + (Number(v.quantity) || 0), 0);
    const totalSemenStraws = db.semenInventory.reduce((s, st) => s + (Number(st.quantity) || 0), 0);

    let inventoryValue = 0;
    db.feedStocks.forEach((f) => {
      inventoryValue += (Number(f.currentStock || f.currentStockKg) || 0) * (Number(f.unitPrice) || 0);
    });
    db.medicineStocks.forEach((m) => {
      inventoryValue += (Number(m.quantity || m.stockQuantity) || 0) * (Number(m.cost || m.unitPrice) || 0);
    });
    db.vaccineStocks.forEach((v) => {
      inventoryValue += (Number(v.quantity) || 0) * (Number(v.unitPrice) || 200);
    });
    db.semenInventory.forEach((s) => {
      inventoryValue += (Number(s.quantity) || 0) * (Number(s.unitCost || s.unitPrice) || 3500);
    });

    return res.json({
      success: true,
      summary: {
        totalWarehouses,
        totalFeedStock,
        totalMedicines,
        totalVaccines,
        totalSemenStraws,
        inventoryValue: Math.round(inventoryValue),
      },
      warehouses: db.warehouses,
      feed: db.feedStocks,
      medicines: db.medicineStocks,
      vaccines: db.vaccineStocks,
      semen: db.semenInventory,
      transactions: db.transactions,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}

// GET /api/feed
export async function handleGetFeed(_req: Request, res: Response) {
  try {
    const db = readInventoryDb();
    return res.json({ success: true, count: db.feedStocks.length, data: db.feedStocks });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

// GET /api/medicines
export async function handleGetMedicines(_req: Request, res: Response) {
  try {
    const db = readInventoryDb();
    return res.json({ success: true, count: db.medicineStocks.length, data: db.medicineStocks });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

// GET /api/vaccines
export async function handleGetVaccines(_req: Request, res: Response) {
  try {
    const db = readInventoryDb();
    return res.json({ success: true, count: db.vaccineStocks.length, data: db.vaccineStocks });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

// GET /api/semen
export async function handleGetSemen(_req: Request, res: Response) {
  try {
    const db = readInventoryDb();
    return res.json({ success: true, count: db.semenInventory.length, data: db.semenInventory });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

// POST /api/inventory
export async function handlePostInventory(req: Request, res: Response) {
  try {
    const { itemType, ...payload } = req.body;
    if (!itemType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: itemType (Feed, Medicine, Vaccine, Semen, Warehouse, Transaction)',
      });
    }

    const db = readInventoryDb();
    const typeUpper = String(itemType).toLowerCase();

    if (typeUpper === 'feed') {
      if (!payload.name || payload.name.trim().length < 2) {
        return res.status(400).json({ success: false, error: 'Feed Name is required.' });
      }
      const newItem = {
        id: payload.id || `feed-${Date.now()}`,
        farmId: 'farm-001',
        name: payload.name.trim(),
        category: payload.category || 'Concentrate',
        currentStock: Number(payload.currentStock || payload.currentStockKg) || 0,
        currentStockKg: Number(payload.currentStock || payload.currentStockKg) || 0,
        unit: payload.unit || 'kg',
        unitPrice: Number(payload.unitPrice) || 0,
        minAlertLevel: Number(payload.minAlertLevel || payload.minStockThresholdKg) || 1000,
        minStockThresholdKg: Number(payload.minAlertLevel || payload.minStockThresholdKg) || 1000,
        dryMatterPercent: Number(payload.dryMatterPercent) || 30,
        supplier: payload.supplier || payload.supplierName || 'National Feed Supply',
        warehouseId: payload.warehouseId || 'warehouse-001',
        warehouseName: payload.warehouseName || payload.warehouse || 'Silo Bunker A',
        status: (Number(payload.currentStock) || 0) <= (Number(payload.minAlertLevel) || 1000) ? 'Reorder' : 'Optimal',
      };
      db.feedStocks.unshift(newItem);
      writeInventoryDb(db);
      return res.status(201).json({ success: true, data: newItem, message: 'Feed stock created successfully' });
    }

    if (typeUpper === 'medicine') {
      if (!payload.name || !payload.batchNumber) {
        return res.status(400).json({ success: false, error: 'Medicine Name and Batch Number are required.' });
      }
      const newItem = {
        id: payload.id || `medicine-${Date.now()}`,
        farmId: 'farm-001',
        name: payload.name.trim(),
        batchNumber: payload.batchNumber.trim(),
        category: payload.category || 'Antibiotic',
        quantity: Number(payload.quantity || payload.stockQuantity) || 0,
        stockQuantity: Number(payload.quantity || payload.stockQuantity) || 0,
        unit: payload.unit || 'vial',
        cost: Number(payload.cost || payload.unitPrice) || 0,
        unitPrice: Number(payload.cost || payload.unitPrice) || 0,
        withdrawalDays: Number(payload.withdrawalDays || payload.withdrawalDaysMilk) || 0,
        withdrawalDaysMilk: Number(payload.withdrawalDays || payload.withdrawalDaysMilk) || 0,
        supplier: payload.supplier || payload.supplierName || 'Al-Faisal Pharma',
        warehouseId: payload.warehouseId || 'warehouse-003',
        warehouseName: payload.warehouseName || 'Central Veterinary Pharmacy',
        expiryDate: payload.expiryDate || '2025-12-31',
        status: 'Optimal',
      };
      db.medicineStocks.unshift(newItem);
      writeInventoryDb(db);
      return res.status(201).json({ success: true, data: newItem, message: 'Medicine registered successfully' });
    }

    if (typeUpper === 'vaccine') {
      if (!payload.vaccineName && !payload.name) {
        return res.status(400).json({ success: false, error: 'Vaccine Name is required.' });
      }
      const newItem = {
        id: payload.id || `vaccine-${Date.now()}`,
        farmId: 'farm-001',
        vaccineName: (payload.vaccineName || payload.name).trim(),
        name: (payload.vaccineName || payload.name).trim(),
        manufacturer: payload.manufacturer || 'Veterinary Research Institute',
        batchNumber: payload.batchNumber || `VAC-${Date.now()}`,
        expiryDate: payload.expiryDate || '2025-06-30',
        quantity: Number(payload.quantity) || 0,
        unit: payload.unit || 'doses',
        storageTemperature: payload.storageTemperature || '2°C - 8°C (Cold Chain)',
        warehouseId: payload.warehouseId || 'warehouse-003',
        status: 'Optimal',
      };
      db.vaccineStocks.unshift(newItem);
      writeInventoryDb(db);
      return res.status(201).json({ success: true, data: newItem, message: 'Vaccine registered successfully' });
    }

    if (typeUpper === 'semen') {
      if (!payload.bullName || !payload.strawCode) {
        return res.status(400).json({ success: false, error: 'Bull Name and Straw Code are required.' });
      }
      const newItem = {
        id: payload.id || `semen-${Date.now()}`,
        farmId: 'farm-001',
        bullName: payload.bullName.trim(),
        breed: payload.breed || 'Holstein Friesian',
        strawCode: payload.strawCode.trim(),
        quantity: Number(payload.quantity) || 0,
        collectionDate: payload.collectionDate || new Date().toISOString().split('T')[0],
        tankNumber: payload.tankNumber || 'Tank 1 (MVE-XC33)',
        canisterNumber: payload.canisterNumber || 'Canister 1',
        position: payload.position || 'Rack A',
        nitrogenLevel: Number(payload.nitrogenLevel) || 85,
        nitrogenStatus: (Number(payload.nitrogenLevel) || 85) < 25 ? 'Alert' : 'Optimal',
      };
      db.semenInventory.unshift(newItem);
      writeInventoryDb(db);
      return res.status(201).json({ success: true, data: newItem, message: 'Semen straw registered' });
    }

    return res.status(400).json({ success: false, error: `Unsupported itemType: ${itemType}` });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to save inventory record' });
  }
}

// PUT /api/inventory/:id
export async function handlePutInventory(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const db = readInventoryDb();

    // Check across collections
    const feed = db.feedStocks.find((f) => f.id === id);
    if (feed) {
      Object.assign(feed, req.body);
      writeInventoryDb(db);
      return res.json({ success: true, data: feed, message: 'Feed record updated' });
    }

    const med = db.medicineStocks.find((m) => m.id === id);
    if (med) {
      Object.assign(med, req.body);
      writeInventoryDb(db);
      return res.json({ success: true, data: med, message: 'Medicine record updated' });
    }

    const vac = db.vaccineStocks.find((v) => v.id === id);
    if (vac) {
      Object.assign(vac, req.body);
      writeInventoryDb(db);
      return res.json({ success: true, data: vac, message: 'Vaccine record updated' });
    }

    const semen = db.semenInventory.find((s) => s.id === id);
    if (semen) {
      Object.assign(semen, req.body);
      writeInventoryDb(db);
      return res.json({ success: true, data: semen, message: 'Semen straw record updated' });
    }

    const wh = db.warehouses.find((w) => w.id === id);
    if (wh) {
      Object.assign(wh, req.body);
      writeInventoryDb(db);
      return res.json({ success: true, data: wh, message: 'Warehouse record updated' });
    }

    return res.status(404).json({ success: false, error: `Inventory item not found: ${id}` });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

// DELETE /api/inventory/:id
export async function handleDeleteInventory(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const db = readInventoryDb();

    let deleted = false;

    const fIdx = db.feedStocks.findIndex((f) => f.id === id);
    if (fIdx !== -1) {
      db.feedStocks.splice(fIdx, 1);
      deleted = true;
    }

    const mIdx = db.medicineStocks.findIndex((m) => m.id === id);
    if (mIdx !== -1) {
      db.medicineStocks.splice(mIdx, 1);
      deleted = true;
    }

    const vIdx = db.vaccineStocks.findIndex((v) => v.id === id);
    if (vIdx !== -1) {
      db.vaccineStocks.splice(vIdx, 1);
      deleted = true;
    }

    const sIdx = db.semenInventory.findIndex((s) => s.id === id);
    if (sIdx !== -1) {
      db.semenInventory.splice(sIdx, 1);
      deleted = true;
    }

    const wIdx = db.warehouses.findIndex((w) => w.id === id);
    if (wIdx !== -1) {
      db.warehouses.splice(wIdx, 1);
      deleted = true;
    }

    if (deleted) {
      writeInventoryDb(db);
      return res.json({ success: true, message: `Inventory item ${id} deleted successfully` });
    }

    return res.status(404).json({ success: false, error: `Item with ID ${id} not found` });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
