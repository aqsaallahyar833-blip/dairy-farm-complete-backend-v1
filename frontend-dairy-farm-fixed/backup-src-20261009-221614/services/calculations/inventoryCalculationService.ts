export interface StockBalanceResult {
  openingStockKg: number;
  purchasesKg: number;
  consumptionKg: number;
  adjustmentsKg: number;
  closingStockKg: number;
  isNegativePrevented: boolean;
}

export interface LowStockAlertResult {
  feedItemId: string;
  name: string;
  currentStockKg: number;
  minThresholdKg: number;
  isLowStock: boolean;
  daysRemainingEstimated?: number;
}

export type InventoryItemStatus = 'Optimal' | 'Low' | 'Reorder' | 'Out of Stock';

export interface ExpiryCalculationResult {
  daysRemaining: number;
  isExpired: boolean;
  isExpiringSoon: boolean; // within 30 days
  isWarning: boolean; // within 60 days
  label: string;
  badgeColor: 'emerald' | 'yellow' | 'rose' | 'slate';
}

export const inventoryCalculationService = {
  /**
   * Feed Total Value = Current Stock × Unit Price
   */
  calculateFeedTotalValue(stock: number, unitPrice: number): number {
    const s = Math.max(0, Number(stock) || 0);
    const p = Math.max(0, Number(unitPrice) || 0);
    return Math.round(s * p * 100) / 100;
  },

  /**
   * Warehouse Utilization = (Current Stock / Capacity) × 100
   */
  calculateWarehouseUtilization(currentStock: number, capacity: number): number {
    const cap = Number(capacity) || 0;
    if (cap <= 0) return 0;
    const stock = Math.max(0, Number(currentStock) || 0);
    const pct = (stock / cap) * 100;
    return Math.min(100, Math.round(pct * 10) / 10);
  },

  /**
   * Medicine Expiry = Expiry Date - Current Date
   */
  calculateMedicineExpiry(expiryDateStr?: string): ExpiryCalculationResult {
    if (!expiryDateStr) {
      return {
        daysRemaining: 9999,
        isExpired: false,
        isExpiringSoon: false,
        isWarning: false,
        label: 'No expiry date',
        badgeColor: 'emerald',
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exp = new Date(expiryDateStr);
    exp.setHours(0, 0, 0, 0);

    const diffTime = exp.getTime() - today.getTime();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (daysRemaining < 0) {
      return {
        daysRemaining,
        isExpired: true,
        isExpiringSoon: true,
        isWarning: true,
        label: `Expired (${Math.abs(daysRemaining)}d ago)`,
        badgeColor: 'rose',
      };
    }

    if (daysRemaining === 0) {
      return {
        daysRemaining,
        isExpired: true,
        isExpiringSoon: true,
        isWarning: true,
        label: 'Expires Today',
        badgeColor: 'rose',
      };
    }

    if (daysRemaining <= 30) {
      return {
        daysRemaining,
        isExpired: false,
        isExpiringSoon: true,
        isWarning: true,
        label: `Expiring soon (${daysRemaining}d)`,
        badgeColor: 'rose',
      };
    }

    if (daysRemaining <= 60) {
      return {
        daysRemaining,
        isExpired: false,
        isExpiringSoon: false,
        isWarning: true,
        label: `Expires in ${daysRemaining}d`,
        badgeColor: 'yellow',
      };
    }

    return {
      daysRemaining,
      isExpired: false,
      isExpiringSoon: false,
      isWarning: false,
      label: `${daysRemaining} days left`,
      badgeColor: 'emerald',
    };
  },

  /**
   * Nitrogen Warning:
   * If Nitrogen < Minimum Level → Alert
   */
  calculateNitrogenStatus(
    nitrogenLevel: number,
    minLevel: number = 25
  ): { status: 'Optimal' | 'Alert' | 'Critical'; isAlert: boolean; message: string } {
    const level = Number(nitrogenLevel) || 0;
    const threshold = Number(minLevel) || 25;

    if (level <= 15) {
      return {
        status: 'Critical',
        isAlert: true,
        message: `CRITICAL: Nitrogen level at ${level}%. Immediate refill required!`,
      };
    }

    if (level < threshold) {
      return {
        status: 'Alert',
        isAlert: true,
        message: `WARNING: Nitrogen at ${level}% below minimum threshold of ${threshold}%.`,
      };
    }

    return {
      status: 'Optimal',
      isAlert: false,
      message: `Optimal: Nitrogen level safe (${level}%).`,
    };
  },

  /**
   * Stock Status:
   * IF Stock = 0: Status = Out of Stock (Gray)
   * IF Current Stock <= Min Level: Status = Reorder (Red)
   * IF Current Stock <= Min Level * 1.25: Status = Low (Yellow)
   * IF Current Stock > Min Level: Status = Optimal (Green)
   */
  calculateStockStatus(
    currentStock: number,
    minLevel: number
  ): { status: InventoryItemStatus; color: 'emerald' | 'yellow' | 'rose' | 'slate'; label: string } {
    const stock = Number(currentStock) || 0;
    const min = Number(minLevel) || 0;

    if (stock <= 0) {
      return { status: 'Out of Stock', color: 'slate', label: 'Out of Stock' };
    }

    if (stock <= min) {
      return { status: 'Reorder', color: 'rose', label: 'Reorder' };
    }

    if (stock <= min * 1.25) {
      return { status: 'Low', color: 'yellow', label: 'Low Stock' };
    }

    return { status: 'Optimal', color: 'emerald', label: 'Optimal' };
  },

  /**
   * Inventory formula:
   * Closing Stock = Opening Stock + Purchases - Consumption ± Adjustments
   * Ensures stock does not go negative unless explicitly overridden.
   */
  calculateClosingStock(
    openingStockKg: number,
    purchasesKg: number,
    consumptionKg: number,
    adjustmentsKg: number = 0
  ): StockBalanceResult {
    const rawClosing = openingStockKg + purchasesKg - consumptionKg + adjustmentsKg;
    const isNegative = rawClosing < 0;
    const closingStockKg = Math.max(0, Math.round(rawClosing * 10) / 10);

    return {
      openingStockKg,
      purchasesKg,
      consumptionKg,
      adjustmentsKg,
      closingStockKg,
      isNegativePrevented: isNegative,
    };
  },

  /**
   * Evaluates if item stock is below minimum buffer threshold
   */
  checkLowStock(
    feedItemId: string,
    name: string,
    currentStockKg: number,
    minThresholdKg: number,
    dailyConsumptionRateKg?: number
  ): LowStockAlertResult {
    const isLowStock = currentStockKg <= minThresholdKg;
    let daysRemainingEstimated: number | undefined;

    if (dailyConsumptionRateKg && dailyConsumptionRateKg > 0) {
      daysRemainingEstimated = Math.floor(currentStockKg / dailyConsumptionRateKg);
    }

    return {
      feedItemId,
      name,
      currentStockKg,
      minThresholdKg,
      isLowStock,
      daysRemainingEstimated,
    };
  },
};

