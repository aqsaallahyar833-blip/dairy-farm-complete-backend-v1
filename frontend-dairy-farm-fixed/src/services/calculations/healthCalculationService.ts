/**
 * Health & Veterinary Calculation Service
 * Centralizes milk withdrawal hold calculations, vaccine next due dates,
 * medicine expiry evaluations, and biosecurity analytics.
 */

export interface ExpiryStatusResult {
  status: 'Optimal' | 'Expiring Soon' | 'Expired';
  label: string;
  daysRemaining: number;
}

export const healthCalculationService = {
  /**
   * Treatment Start Date + Milk Withdrawal Duration = Milk Hold Until Date
   * Uses UTC components to prevent local timezone calendar day shifting.
   */
  calculateMilkHoldUntil(startDateStr: string, withdrawalDays: number): string {
    if (!startDateStr) return new Date().toISOString().split('T')[0];
    const days = Math.max(0, Number(withdrawalDays) || 0);
    if (days === 0) return startDateStr;

    try {
      const parts = startDateStr.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const d = new Date(Date.UTC(year, month, day));
        d.setUTCDate(d.getUTCDate() + days);
        return d.toISOString().split('T')[0];
      }
      const d = new Date(startDateStr);
      d.setDate(d.getDate() + days);
      return d.toISOString().split('T')[0];
    } catch {
      return startDateStr;
    }
  },

  /**
   * Evaluates if a milk hold is currently active relative to the reference date.
   */
  isHoldActive(holdUntilDateStr: string, referenceDateStr?: string): boolean {
    if (!holdUntilDateStr) return false;
    const ref = referenceDateStr || new Date().toISOString().split('T')[0];
    return holdUntilDateStr >= ref;
  },

  /**
   * Calculates difference in calendar days.
   */
  calculateDaysRemaining(targetDateStr: string, referenceDateStr?: string): number {
    if (!targetDateStr) return 0;
    try {
      const ref = referenceDateStr ? new Date(referenceDateStr) : new Date();
      ref.setHours(0, 0, 0, 0);
      const target = new Date(targetDateStr);
      target.setHours(0, 0, 0, 0);
      const diffMs = target.getTime() - ref.getTime();
      return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    } catch {
      return 0;
    }
  },

  /**
   * Auto-calculates Next Due Date for vaccines based on standard booster intervals.
   */
  calculateVaccineNextDueDate(administeredDateStr: string, boosterIntervalMonths: number = 6): string {
    if (!administeredDateStr) return new Date().toISOString().split('T')[0];
    try {
      const parts = administeredDateStr.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const d = new Date(Date.UTC(year, month + boosterIntervalMonths, day));
        return d.toISOString().split('T')[0];
      }
      const d = new Date(administeredDateStr);
      d.setMonth(d.getMonth() + boosterIntervalMonths);
      return d.toISOString().split('T')[0];
    } catch {
      return administeredDateStr;
    }
  },

  /**
   * Categorizes vaccination status based on current due date.
   */
  evaluateVaccinationStatus(
    nextDueDateStr: string,
    isCompleted: boolean = false,
    referenceDateStr?: string
  ): 'Scheduled' | 'Due Today' | 'Due Soon' | 'Overdue' | 'Completed' {
    if (isCompleted) return 'Completed';
    const days = this.calculateDaysRemaining(nextDueDateStr, referenceDateStr);
    if (days < 0) return 'Overdue';
    if (days === 0) return 'Due Today';
    if (days <= 14) return 'Due Soon';
    return 'Scheduled';
  },

  /**
   * Evaluates medicine expiry status.
   */
  evaluateMedicineExpiry(
    expiryDateStr?: string,
    warningPeriodDays: number = 60,
    referenceDateStr?: string
  ): ExpiryStatusResult {
    if (!expiryDateStr) {
      return { status: 'Optimal', label: 'Valid', daysRemaining: 999 };
    }
    const days = this.calculateDaysRemaining(expiryDateStr, referenceDateStr);
    if (days < 0) {
      return { status: 'Expired', label: `Expired (${Math.abs(days)}d ago)`, daysRemaining: days };
    }
    if (days <= warningPeriodDays) {
      return { status: 'Expiring Soon', label: `Expiring soon (${days}d left)`, daysRemaining: days };
    }
    return { status: 'Optimal', label: `${days}d shelf life`, daysRemaining: days };
  },
};
