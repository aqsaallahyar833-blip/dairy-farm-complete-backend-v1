import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';

export interface NavigationEntry {
  id: string;
  tab: string; // 'dashboard' | 'animals' | 'milk' | 'breeding' | 'health' | 'feed' | 'inventory' | 'finance' | 'reports' | 'tasks' | 'alerts' | 'settings' | 'validation'
  animalId?: string | null;
  subTab?: string | null;
  title: string;
  state?: Record<string, any>;
  timestamp: number;
}

export interface NavigationTarget {
  tab: string;
  animalId?: string | null;
  subTab?: string | null;
  title?: string;
  state?: Record<string, any>;
}

export const tabReadableNames: Record<string, string> = {
  dashboard: 'Dashboard',
  validation: 'Audit & Validation',
  animals: 'Cattle & Herd',
  milk: 'Milk Production',
  breeding: 'Breeding & AI',
  health: 'Health & Vet',
  feed: 'Feed Management',
  inventory: 'Supplies & Stock',
  finance: 'Financial Ledger',
  reports: 'Reports',
  tasks: 'Tasks & Protocols',
  alerts: 'Critical Alerts',
  settings: 'Settings',
};

export const getSafeFallbackForEntry = (entry: NavigationEntry | null): NavigationTarget => {
  if (!entry) {
    return { tab: 'dashboard', title: 'Dashboard' };
  }
  // If in Animal Profile, safe fallback is Cattle & Herd
  if (entry.animalId) {
    return { tab: 'animals', title: 'Cattle & Herd' };
  }
  // If in a subTab or nested view, fallback is the parent tab
  if (entry.subTab) {
    return { tab: entry.tab, title: tabReadableNames[entry.tab] || entry.tab };
  }
  // If in any module other than dashboard, safe fallback is Dashboard
  if (entry.tab !== 'dashboard') {
    return { tab: 'dashboard', title: 'Dashboard' };
  }
  return { tab: 'dashboard', title: 'Dashboard' };
};

interface NavigationContextType {
  current: NavigationEntry;
  previous: NavigationEntry | null;
  history: NavigationEntry[];
  canGoBack: boolean;
  navigate: (target: NavigationTarget | string) => void;
  goBack: (options?: { fallback?: NavigationTarget; force?: boolean }) => void;
  openAnimalProfile: (animalId: string, customTitle?: string) => void;
  closeAnimalProfile: () => void;
  selectTab: (tab: string, title?: string) => void;
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (dirty: boolean) => void;
  registerDirtyChecker: (checker: () => boolean) => () => void;
  confirmIfDirty: (onConfirm: () => void) => void;
}

const NavigationContext = createContext<NavigationContextType | null>(null);

let entryCounter = 1;
const createEntryId = () => `nav-${Date.now()}-${entryCounter++}`;

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Determine initial state from current URL if available
  const getInitialTab = (): string => {
    if (typeof window === 'undefined') return 'dashboard';
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam && tabReadableNames[tabParam]) {
      return tabParam;
    }
    return 'dashboard';
  };

  const initialTab = getInitialTab();
  const initialEntry: NavigationEntry = {
    id: createEntryId(),
    tab: initialTab,
    animalId: null,
    title: tabReadableNames[initialTab] || 'Dashboard',
    timestamp: Date.now(),
  };

  const [history, setHistory] = useState<NavigationEntry[]>([initialEntry]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [hasUnsavedChanges, setHasUnsavedChangesState] = useState<boolean>(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState<boolean>(false);
  const pendingNavigationActionRef = useRef<(() => void) | null>(null);
  const dirtyCheckersRef = useRef<Set<() => boolean>>(new Set());

  const current = history[currentIndex] || initialEntry;
  const previous = currentIndex > 0 ? history[currentIndex - 1] : null;
  const canGoBack = currentIndex > 0 || current.animalId !== null || current.tab !== 'dashboard';

  const registerDirtyChecker = useCallback((checker: () => boolean) => {
    dirtyCheckersRef.current.add(checker);
    return () => {
      dirtyCheckersRef.current.delete(checker);
    };
  }, []);

  const checkIsDirty = useCallback(() => {
    if (hasUnsavedChanges) return true;
    for (const checker of dirtyCheckersRef.current) {
      try {
        if (checker()) return true;
      } catch (e) {
        console.error('Error running dirty checker:', e);
      }
    }
    return false;
  }, [hasUnsavedChanges]);

  const confirmIfDirty = useCallback(
    (onConfirm: () => void) => {
      if (checkIsDirty()) {
        pendingNavigationActionRef.current = onConfirm;
        setShowUnsavedModal(true);
      } else {
        onConfirm();
      }
    },
    [checkIsDirty]
  );

  const performNavigation = useCallback((target: NavigationTarget) => {
    setHasUnsavedChangesState(false);
    const newEntry: NavigationEntry = {
      id: createEntryId(),
      tab: target.tab,
      animalId: target.animalId || null,
      subTab: target.subTab || null,
      title: target.title || (target.animalId ? `Animal ${target.animalId}` : tabReadableNames[target.tab] || target.tab),
      state: target.state,
      timestamp: Date.now(),
    };

    setHistory((prev) => {
      // Truncate forward history if we are in the middle of stack
      const updated = prev.slice(0, currentIndex + 1);
      // Avoid duplicate consecutive identical state
      const last = updated[updated.length - 1];
      if (last && last.tab === newEntry.tab && last.animalId === newEntry.animalId && last.subTab === newEntry.subTab) {
        return updated;
      }
      setCurrentIndex(updated.length);
      return [...updated, newEntry];
    });

    // Sync with browser history
    try {
      if (typeof window !== 'undefined' && window.history) {
        const url = new URL(window.location.href);
        url.searchParams.set('tab', target.tab);
        if (target.animalId) {
          url.searchParams.set('animalId', target.animalId);
        } else {
          url.searchParams.delete('animalId');
        }
        window.history.pushState(newEntry, '', url.toString());
      }
    } catch {
      // Ignore in restricted environments
    }
  }, [currentIndex]);

  const navigate = useCallback(
    (target: NavigationTarget | string) => {
      const normalizedTarget: NavigationTarget =
        typeof target === 'string'
          ? { tab: target, title: tabReadableNames[target] || target }
          : target;

      confirmIfDirty(() => {
        performNavigation(normalizedTarget);
      });
    },
    [confirmIfDirty, performNavigation]
  );

  const goBack = useCallback(
    (options?: { fallback?: NavigationTarget; force?: boolean }) => {
      const executeGoBack = () => {
        setHasUnsavedChangesState(false);
        if (currentIndex > 0) {
          // Go back to the actual previous entry in history
          const nextIndex = currentIndex - 1;
          setCurrentIndex(nextIndex);
          const prevEntry = history[nextIndex];
          try {
            if (typeof window !== 'undefined' && window.history && prevEntry) {
              const url = new URL(window.location.href);
              url.searchParams.set('tab', prevEntry.tab);
              if (prevEntry.animalId) {
                url.searchParams.set('animalId', prevEntry.animalId);
              } else {
                url.searchParams.delete('animalId');
              }
              window.history.replaceState(prevEntry, '', url.toString());
            }
          } catch {
            // Ignore
          }
        } else {
          // Fallback when no previous history entry exists
          const fallback = options?.fallback || getSafeFallbackForEntry(current);
          if (fallback.tab !== current.tab || fallback.animalId !== current.animalId || fallback.subTab !== current.subTab) {
            performNavigation(fallback);
          }
        }
      };

      if (options?.force) {
        executeGoBack();
      } else {
        confirmIfDirty(executeGoBack);
      }
    },
    [confirmIfDirty, current, currentIndex, history, performNavigation]
  );

  const openAnimalProfile = useCallback(
    (animalId: string, customTitle?: string) => {
      navigate({
        tab: 'animals',
        animalId,
        title: customTitle || `Animal ${animalId} Profile`,
      });
    },
    [navigate]
  );

  const closeAnimalProfile = useCallback(() => {
    goBack({ fallback: { tab: 'animals', title: 'Cattle & Herd' } });
  }, [goBack]);

  const selectTab = useCallback(
    (tab: string, title?: string) => {
      navigate({
        tab,
        animalId: null,
        title: title || tabReadableNames[tab] || tab,
      });
    },
    [navigate]
  );

  // Handle browser popstate
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (e.state && e.state.id) {
        const stateEntry = e.state as NavigationEntry;
        const foundIndex = history.findIndex((h) => h.id === stateEntry.id);
        if (foundIndex >= 0) {
          setCurrentIndex(foundIndex);
        } else {
          setHistory((prev) => [...prev, stateEntry]);
          setCurrentIndex((prev) => prev + 1);
        }
      } else {
        // Fallback for native back button
        if (currentIndex > 0) {
          setCurrentIndex((prev) => Math.max(0, prev - 1));
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentIndex, history]);

  const handleModalConfirmLeave = () => {
    setShowUnsavedModal(false);
    setHasUnsavedChangesState(false);
    if (pendingNavigationActionRef.current) {
      pendingNavigationActionRef.current();
      pendingNavigationActionRef.current = null;
    }
  };

  const handleModalCancelLeave = () => {
    setShowUnsavedModal(false);
    pendingNavigationActionRef.current = null;
  };

  return (
    <NavigationContext.Provider
      value={{
        current,
        previous,
        history,
        canGoBack,
        navigate,
        goBack,
        openAnimalProfile,
        closeAnimalProfile,
        selectTab,
        hasUnsavedChanges,
        setHasUnsavedChanges: setHasUnsavedChangesState,
        registerDirtyChecker,
        confirmIfDirty,
      }}
    >
      {children}

      {/* Unsaved Changes Confirmation Dialog */}
      {showUnsavedModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 sm:p-6 border border-slate-200 animate-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center space-x-3 text-amber-600">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Unsaved Changes</h3>
                <p className="text-xs text-slate-500">You have unsaved changes. Are you sure you want to leave?</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
              If you leave this page now without saving, any details or edits you entered will be lost.
            </p>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={handleModalCancelLeave}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition min-h-[38px] cursor-pointer"
              >
                Cancel / Keep Editing
              </button>
              <button
                type="button"
                onClick={handleModalConfirmLeave}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs transition min-h-[38px] cursor-pointer"
              >
                Discard &amp; Return
              </button>
            </div>
          </div>
        </div>
      )}
    </NavigationContext.Provider>
  );
};

export const useNavigation = (): NavigationContextType => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};
