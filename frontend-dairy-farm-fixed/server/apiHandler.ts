import { Request, Response } from 'express';

export interface MilkRecordRow {
  id: string;
  animalId: string;
  animalTag: string;
  animalName?: string;
  farmId?: string;
  date: string;
  session: 'Morning' | 'Evening' | 'Noon';
  quantityLiters: number;
  fatPercent?: number;
  snfPercent?: number;
  proteinPercent?: number;
  scc?: number;
  isRejected?: boolean;
  rejectionReason?: string;
  createdAt?: string;
}

const inMemoryRecords: MilkRecordRow[] = [];

export async function handleSaveMilkRecord(req: Request, res: Response) {
  try {
    const { animalId, animalTag, date, session, quantityLiters, fatPercent, snfPercent, proteinPercent, scc, isRejected, rejectionReason } = req.body;

    if (!animalId || !date || !session || quantityLiters === undefined || quantityLiters === null) {
      return res.status(400).json({
        success: false,
        error: 'Missing required milk fields: animalId, date, session, quantityLiters',
      });
    }

    const numQty = parseFloat(quantityLiters);
    if (isNaN(numQty) || numQty < 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid milk quantity. Must be a positive number.',
      });
    }

    const record: MilkRecordRow = {
      id: req.body.id || `milk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      animalId,
      animalTag: animalTag || animalId,
      date,
      session,
      quantityLiters: numQty,
      fatPercent: fatPercent !== undefined ? parseFloat(fatPercent) : 3.8,
      snfPercent: snfPercent !== undefined ? parseFloat(snfPercent) : 8.5,
      proteinPercent: proteinPercent !== undefined ? parseFloat(proteinPercent) : 3.2,
      scc: scc !== undefined ? parseInt(scc, 10) : 180000,
      isRejected: Boolean(isRejected),
      rejectionReason: rejectionReason || undefined,
      createdAt: new Date().toISOString(),
    };

    inMemoryRecords.unshift(record);

    return res.status(201).json({
      success: true,
      message: 'Milk record recorded successfully',
      data: record,
    });
  } catch (err: any) {
    console.error('Error saving milk record:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Internal server error while saving milk record',
    });
  }
}

export async function handleGetMilkRecords(req: Request, res: Response) {
  try {
    let list = [...inMemoryRecords];
    const { animalId, animalTag, date, session } = req.query;

    if (animalId) {
      list = list.filter((r) => r.animalId === animalId || r.animalTag === animalId);
    }
    if (animalTag) {
      list = list.filter((r) => r.animalTag === animalTag || r.animalId === animalTag);
    }
    if (date) {
      list = list.filter((r) => r.date === date);
    }
    if (session) {
      list = list.filter((r) => r.session === session);
    }

    return res.json({
      success: true,
      count: list.length,
      data: list,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to fetch milk records',
    });
  }
}
