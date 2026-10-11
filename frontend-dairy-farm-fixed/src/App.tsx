import React, { lazy, Suspense, useState, useEffect, useRef } from 'react';
import { Header, MobileBottomNav, MobileDrawer, Sidebar } from './components/layout';
import { QuickHealthEntryModal, QuickMilkEntryModal } from './components/modals';
import { NavigationProvider, useNavigation, tabReadableNames } from './context/NavigationContext';
import { useAuth } from './context/AuthContext';
import { LoginView } from './components/auth';

const DashboardView = lazy(() =>
  import('./components/DashboardView').then((module) => ({ default: module.DashboardView })),
);
const AnimalsView = lazy(() =>
  import('./components/animals/AnimalsView').then((module) => ({ default: module.AnimalsView })),
);
const MilkView = lazy(() =>
  import('./components/MilkView').then((module) => ({ default: module.MilkView })),
);
const BreedingView = lazy(() =>
  import('./components/BreedingView').then((module) => ({ default: module.BreedingView })),
);
const HealthView = lazy(() =>
  import('./components/HealthView').then((module) => ({ default: module.HealthView })),
);
const FeedView = lazy(() =>
  import('./components/FeedView').then((module) => ({ default: module.FeedView })),
);
const InventoryView = lazy(() =>
  import('./components/InventoryView').then((module) => ({ default: module.InventoryView })),
);
const FinanceView = lazy(() =>
  import('./components/FinanceView').then((module) => ({ default: module.FinanceView })),
);
const ReportsView = lazy(() =>
  import('./components/ReportsView').then((module) => ({ default: module.ReportsView })),
);
const TasksView = lazy(() =>
  import('./components/TasksView').then((module) => ({ default: module.TasksView })),
);
const AlertsView = lazy(() =>
  import('./components/AlertsView').then((module) => ({ default: module.AlertsView })),
);
const SettingsView = lazy(() =>
  import('./components/SettingsView').then((module) => ({ default: module.SettingsView })),
);
const AnimalProfileView = lazy(() =>
  import('./components/animals/AnimalProfileView').then((module) => ({ default: module.AnimalProfileView })),
);
const LiveQrAnimalProfile = lazy(() =>
  import('./components/animals/LiveQrAnimalProfile').then((module) => ({ default: module.LiveQrAnimalProfile })),
);
const ValidationView = lazy(() =>
  import('./components/ValidationView').then((module) => ({ default: module.ValidationView })),
);

function ViewLoading() {
  return (
    <div className="flex min-h-48 items-center justify-center" role="status" aria-live="polite">
      <div className="flex items-center gap-3 text-sm text-emerald-700">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600" />
        <span>Loading module...</span>
      </div>
    </div>
  );
}

function MainApp() {
  const { current, navigate, openAnimalProfile, closeAnimalProfile, selectTab } = useNavigation();
  const currentTab = current.tab;
  const selectedAnimalId = current.animalId || null;

  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [reportsKey, setReportsKey] = useState(0);

  // Set of visited tabs to preserve state (Requirement 6: Preserve State)
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(() => new Set(['dashboard', currentTab]));

  useEffect(() => {
    setVisitedTabs((prev) => {
      if (prev.has(currentTab)) return prev;
      const next = new Set(prev);
      next.add(currentTab);
      return next;
    });
  }, [currentTab]);

  // Live QR route detection (e.g. /qr/animal/:token or ?qr=:token or #qr/animal/:token)
  const [scannedQrToken, setScannedQrToken] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const path = window.location.pathname;
    const hash = window.location.hash;
    const searchParams = new URLSearchParams(window.location.search);

    const q = searchParams.get('qr');
    if (q) return q;

    const pathMatch = path.match(/\/qr\/animal\/([^/?#]+)/);
    if (pathMatch && pathMatch[1]) return decodeURIComponent(pathMatch[1]);

    const hashMatch = hash.match(/qr\/animal\/([^/?#]+)/);
    if (hashMatch && hashMatch[1]) return decodeURIComponent(hashMatch[1]);

    return null;
  });

  useEffect(() => {
    const handleUrlChange = () => {
      const path = window.location.pathname;
      const hash = window.location.hash;
      const searchParams = new URLSearchParams(window.location.search);

      const q = searchParams.get('qr');
      if (q) {
        setScannedQrToken(q);
        return;
      }
      const pathMatch = path.match(/\/qr\/animal\/([^/?#]+)/);
      if (pathMatch && pathMatch[1]) {
        setScannedQrToken(decodeURIComponent(pathMatch[1]));
        return;
      }
      const hashMatch = hash.match(/qr\/animal\/([^/?#]+)/);
      if (hashMatch && hashMatch[1]) {
        setScannedQrToken(decodeURIComponent(hashMatch[1]));
        return;
      }
      setScannedQrToken(null);
    };

    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  // Fast entry modals
  const [showQuickMilkModal, setShowQuickMilkModal] = useState(false);
  const [showQuickHealthModal, setShowQuickHealthModal] = useState(false);

  const handleDataRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const handleTabChange = (tab: string) => {
    selectTab(tab);
    if (tab === 'reports') {
      setReportsKey((k) => k + 1);
    }
  };

  const handleSelectAnimal = (animalId: string) => {
    openAnimalProfile(animalId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // If opening via QR scanner direct link (e.g. /qr/animal/:token or ?qr=:token)
  if (scannedQrToken) {
    return (
      <Suspense fallback={<ViewLoading />}>
        <LiveQrAnimalProfile
          qrTokenOrId={scannedQrToken}
          onGoToDashboard={() => {
            setScannedQrToken(null);
            selectTab('dashboard');
            try {
              window.history.pushState({}, '', '/');
            } catch {
              // Ignore
            }
          }}
        />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<ViewLoading />}>
      <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col lg:flex-row font-sans selection:bg-emerald-100 selection:text-emerald-900">
      {/* Desktop Sidebar (lg screens and up) */}
      <Sidebar
        currentTab={currentTab}
        onTabChange={handleTabChange}
        onDataRefresh={handleDataRefresh}
      />

      {/* Mobile & Tablet Slide-Over Drawer (< lg screens) */}
      <MobileDrawer
        isOpen={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        currentTab={currentTab}
        onTabChange={handleTabChange}
        onDataRefresh={handleDataRefresh}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          currentTab={selectedAnimalId ? 'animals' : currentTab}
          onTabChange={handleTabChange}
          onDataRefresh={handleDataRefresh}
          onOpenMobileMenu={() => setMobileDrawerOpen(true)}
          showReturnButton={Boolean(selectedAnimalId)}
        />

        <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 pb-20 lg:pb-8 min-w-0">
          {/* If an animal is selected, render individual AnimalProfileView */}
          {selectedAnimalId && (
            <div className="w-full">
              <AnimalProfileView
                animalId={selectedAnimalId}
                onBack={closeAnimalProfile}
                onNavigate={(tab) => {
                  navigate({
                    tab,
                    title: tabReadableNames[tab] || tab,
                  });
                }}
              />
            </div>
          )}

          <div className={selectedAnimalId ? 'hidden' : 'w-full'}>
            {/* Preserved Views: Keeps visited tabs mounted so search/filters/subtabs/scroll state are retained */}
            {visitedTabs.has('dashboard') && (
              <div className={currentTab === 'dashboard' ? 'block' : 'hidden'}>
                <DashboardView
                  key={refreshKey}
                  isActive={currentTab === 'dashboard'}
                  onNavigate={(tab) => navigate(tab)}
                  onSelectAnimal={handleSelectAnimal}
                  onOpenQuickMilk={() => setShowQuickMilkModal(true)}
                  onOpenQuickHealth={() => setShowQuickHealthModal(true)}
                />
              </div>
            )}

            {visitedTabs.has('validation') && (
              <div className={currentTab === 'validation' ? 'block' : 'hidden'}>
                <ValidationView key={refreshKey} onNavigate={(tab) => navigate(tab)} />
              </div>
            )}

            {visitedTabs.has('animals') && (
              <div className={currentTab === 'animals' ? 'block' : 'hidden'}>
                <AnimalsView
                  key={refreshKey}
                  onSelectAnimal={handleSelectAnimal}
                />
              </div>
            )}

            {visitedTabs.has('milk') && (
              <div className={currentTab === 'milk' ? 'block' : 'hidden'}>
                <MilkView key={refreshKey} isActive={currentTab === 'milk'} />
              </div>
            )}

            {visitedTabs.has('breeding') && (
              <div className={currentTab === 'breeding' ? 'block' : 'hidden'}>
                <BreedingView key={refreshKey} />
              </div>
            )}

            {visitedTabs.has('health') && (
              <div className={currentTab === 'health' ? 'block' : 'hidden'}>
                <HealthView key={refreshKey} />
              </div>
            )}

            {visitedTabs.has('feed') && (
              <div className={currentTab === 'feed' ? 'block' : 'hidden'}>
                <FeedView key={refreshKey} />
              </div>
            )}

            {visitedTabs.has('inventory') && (
              <div className={currentTab === 'inventory' ? 'block' : 'hidden'}>
                <InventoryView key={refreshKey} />
              </div>
            )}

            {visitedTabs.has('finance') && (
              <div className={currentTab === 'finance' ? 'block' : 'hidden'}>
                <FinanceView key={refreshKey} />
              </div>
            )}

            {visitedTabs.has('reports') && (
              <div className={currentTab === 'reports' ? 'block' : 'hidden'}>
                <ReportsView key={`${refreshKey}-${reportsKey}`} />
              </div>
            )}

            {visitedTabs.has('tasks') && (
              <div className={currentTab === 'tasks' ? 'block' : 'hidden'}>
                <TasksView key={refreshKey} />
              </div>
            )}

            {visitedTabs.has('alerts') && (
              <div className={currentTab === 'alerts' ? 'block' : 'hidden'}>
                <AlertsView
                  key={refreshKey}
                  onSelectAnimal={handleSelectAnimal}
                  onNavigate={(tab) => navigate(tab)}
                />
              </div>
            )}

            {visitedTabs.has('settings') && (
              <div className={currentTab === 'settings' ? 'block' : 'hidden'}>
                <SettingsView key={refreshKey} onDataRefresh={handleDataRefresh} />
              </div>
            )}
          </div>
        </main>

        <footer className="bg-white border-t border-slate-200 py-3.5 px-3 sm:px-4 md:px-6 lg:px-8 mt-auto hidden lg:block">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
            <div className="flex items-center space-x-2 text-center sm:text-left flex-wrap justify-center">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
              <span className="font-medium text-slate-700">Centralized Typed Service Layer Active</span>
              <span className="hidden sm:inline">•</span>
              <span className="text-[11px] text-slate-400">Local DB: dairy-farm-mock-db-v1</span>
            </div>
            <div className="text-[11px] text-slate-400 text-center sm:text-right">
              <span>Green Dairy Farm / Punjab Pure Dairy Management System © 2024</span>
            </div>
          </div>
        </footer>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <MobileBottomNav
        currentTab={currentTab}
        onTabChange={handleTabChange}
        onOpenDrawer={() => setMobileDrawerOpen(true)}
      />

      {/* Fast Milk Entry Modal */}
      <QuickMilkEntryModal
        isOpen={showQuickMilkModal}
        onClose={() => setShowQuickMilkModal(false)}
        onSuccess={handleDataRefresh}
      />

      {/* Fast Health Entry Modal */}
      <QuickHealthEntryModal
        isOpen={showQuickHealthModal}
        onClose={() => setShowQuickHealthModal(false)}
        onSuccess={handleDataRefresh}
      />
      </div>
    </Suspense>
  );
}

/**
 * Application shell / authentication gate.
 *
 * The startup order is strictly:
 *     resolving identity  ->  Login  OR  MainApp
 *
 * `MainApp` is NOT mounted while `loading` is true, so the Dashboard can never
 * be rendered for a visitor whose identity has not been confirmed by
 * GET /api/auth/me. There is no default user and no localStorage/local user.
 */
export default function App() {
  const { loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-emerald-50">
        <div className="flex flex-col items-center gap-3" role="status" aria-live="polite">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600" />
          <p className="text-sm text-emerald-800">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginView />;
  }

  return (
    <NavigationProvider>
      <MainApp />
    </NavigationProvider>
  );
}
