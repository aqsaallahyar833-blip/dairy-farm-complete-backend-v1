/**
 * Mock Data Repository
 * Provides read-only snapshots and direct lookup structures for the seed dataset.
 */

import { mockDb } from './mockDb';

export const mockData = {
  get animals() {
    return mockDb.getSnapshot().animals;
  },
  get milkRecords() {
    return mockDb.getSnapshot().milkRecords;
  },
  get breedingRecords() {
    return mockDb.getSnapshot().breedingRecords;
  },
  get healthRecords() {
    return mockDb.getSnapshot().healthRecords;
  },
  get treatments() {
    return mockDb.getSnapshot().treatments;
  },
  get medicines() {
    return mockDb.getSnapshot().medicines;
  },
  get vaccinations() {
    return mockDb.getSnapshot().vaccinations;
  },
  get feedItems() {
    return mockDb.getSnapshot().feedItems;
  },
  get rations() {
    return mockDb.getSnapshot().rations;
  },
  get expenses() {
    return mockDb.getSnapshot().expenses;
  },
  get incomes() {
    return mockDb.getSnapshot().incomes;
  },
  get tasks() {
    return mockDb.getSnapshot().tasks;
  },
  get notifications() {
    return mockDb.getSnapshot().notifications;
  },
  get sheds() {
    return mockDb.getSnapshot().sheds;
  },
  get groups() {
    return mockDb.getSnapshot().groups;
  },
  get users() {
    return mockDb.getSnapshot().users;
  },
};
