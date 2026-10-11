import { TreatmentRecord, HealthRecord } from '../../types';

export const healthAdapter = {
  formatTreatment(treatment: TreatmentRecord) {
    const isUnderWithdrawal = treatment.isWithdrawalActive;
    return {
      ...treatment,
      withdrawalStatusLabel: isUnderWithdrawal
        ? `Milk withdrawal active until ${treatment.milkUsableDate}`
        : 'Safe for milking',
      badgeColor: isUnderWithdrawal ? 'red' : 'green',
    };
  },

  formatHealth(health: HealthRecord) {
    return {
      ...health,
      statusVariant:
        health.status === 'In Treatment'
          ? 'warning'
          : health.status === 'Recovered'
          ? 'success'
          : 'neutral',
    };
  },
};
