import { FeedItem, Ration } from '../../types';

export const feedAdapter = {
  formatFeedItem(item: FeedItem) {
    const isLowStock = (item.currentStockKg ?? 0) <= (item.minStockThresholdKg ?? 0);
    return {
      ...item,
      isLowStock,
      formattedStock: `${(item.currentStockKg ?? 0).toLocaleString()} ${item.unit}`,
      stockStatus: isLowStock ? 'Low Stock Warning' : 'Optimal',
    };
  },

  formatRation(ration: Ration) {
    return {
      ...ration,
      formattedCostPerCow: `Rs ${(ration.costPerCowPerDay ?? 0).toLocaleString()} / cow / day`,
      formattedTotalKg: `${ration.totalKgPerCow ?? 0} kg / cow`,
    };
  },
};
