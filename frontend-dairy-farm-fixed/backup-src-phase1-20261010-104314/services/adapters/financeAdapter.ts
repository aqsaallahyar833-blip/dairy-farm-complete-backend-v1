import { Expense, Income } from '../../types';

export const financeAdapter = {
  formatExpense(expense: Expense) {
    return {
      ...expense,
      formattedAmount: `Rs ${(expense.amount ?? 0).toLocaleString()}`,
    };
  },

  formatIncome(income: Income) {
    return {
      ...income,
      formattedAmount: `Rs ${(income.amount ?? 0).toLocaleString()}`,
    };
  },
};
