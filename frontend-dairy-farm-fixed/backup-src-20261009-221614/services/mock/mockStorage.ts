/**
 * Mock Storage Layer
 * Manages localStorage synchronization, development reset, and error/latency configs.
 */

export const STORAGE_KEY = 'dairy-farm-mock-db-v1';

export interface MockConfig {
  simulateErrors: boolean;
  errorRate: number; // 0 to 1
  latencyMs: number;
}

export const mockConfig: MockConfig = {
  simulateErrors: false,
  errorRate: 0,
  latencyMs: 180,
};

export async function simulateNetwork(): Promise<void> {
  if (mockConfig.latencyMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, mockConfig.latencyMs));
  }

  if (mockConfig.simulateErrors && Math.random() < mockConfig.errorRate) {
    throw new Error('SIMULATED_NETWORK_ERROR: Development simulated API failure');
  }
}

export const mockStorage = {
  get<T>(key: string = STORAGE_KEY): T | null {
    try {
      const serialized = localStorage.getItem(key);
      if (!serialized) return null;
      return JSON.parse(serialized) as T;
    } catch (err) {
      console.error('Failed to read from localStorage:', err);
      return null;
    }
  },

  set<T>(data: T, key: string = STORAGE_KEY): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (err) {
      console.error('Failed to save to localStorage:', err);
    }
  },

  reset(key: string = STORAGE_KEY): void {
    try {
      localStorage.removeItem(key);
      window.location.reload();
    } catch (err) {
      console.error('Failed to reset mock storage:', err);
    }
  },

  exists(key: string = STORAGE_KEY): boolean {
    return localStorage.getItem(key) !== null;
  },
};
