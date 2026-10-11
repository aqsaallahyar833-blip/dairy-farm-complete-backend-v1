import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  handleSaveMilkRecord,
  handleGetMilkRecords,
} from './server/apiHandler';
// ---------------------------------------------------------------------------
// PHASE 2A: the legacy JSON animal handlers are no longer mounted.
//
// They read fabricated records from server/data/mysql_animals.json and are
// replaced by the ASP.NET Core API backed by MySQL `Dairy Farm 1`. The module
// is kept in the tree so the history is not lost, but it is unreferenced so it
// cannot be accidentally re-mounted as a second animal backend.
//
// import {
//   handleGetAnimals,
//   handleGetAnimalById,
//   handleGetAnimalByQrToken,
//   handleGetAnimalDossier,
//   handleUpdateAnimalStatus,
//   handleRegenerateQrToken,
// } from './server/animalApiHandler';
// ---------------------------------------------------------------------------

import {
  handleGetInventory,
  handleGetFeed,
  handleGetMedicines,
  handleGetVaccines,
  handleGetSemen,
  handlePostInventory,
  handlePutInventory,
  handleDeleteInventory,
} from './server/inventoryApiHandler';
import {
  handleGetHealthEvents,
  handlePostHealthEvent,
  handleGetTreatments,
  handlePostTreatment,
  handleCompleteTreatment,
  handleGetActiveWithdrawals,
  handleGetVaccinations,
  handlePostVaccination,
  handleGetQuarantine,
  handlePostQuarantine,
  handleGetHealthDashboard,
} from './server/healthApiHandler';
import {
  handleValidateDashboard,
  handleCalculateProfit,
  handleValidateBatch,
  handleGetAuditTrail,
  handleAuditDataReadiness,
} from './server/validationApiHandler';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Enable CORS for LAN devices (phones, tablets on farm network)
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  app.use(express.json());

  // API routes FIRST
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'Dairy Farm Management API',
      database: 'MySQL / Persistent Dairy Store',
      lanSupport: true,
      timestamp: new Date().toISOString(),
    });
  });

  // Milk endpoints
  app.post('/api/milk', handleSaveMilkRecord);
  app.get('/api/milk', handleGetMilkRecords);

  // ==========================================================================
  // ANIMAL ENDPOINTS RETIRED (Phase 2A)
  //
  // These routes used to serve ANIMALS from server/data/mysql_animals.json -
  // 26 fabricated records with Unsplash stock photos and QR tokens that were
  // deterministic SHA-256 hashes of the animal code. They were never backed by
  // the database, and they would have shadowed the real API:
  //
  //     React -> ASP.NET Core -> MySQL "Dairy Farm 1"
  //
  // The single authoritative animal API is now the ASP.NET Core backend:
  //     GET    /api/animals
  //     GET    /api/animals/{id}
  //     GET    /api/animals/by-code/{code}
  //     POST   /api/animals
  //     PUT    /api/animals/{id}
  //     PATCH  /api/animals/{id}/status
  //     POST   /api/animals/{id}/photo
  //     GET    /api/animals/{id}/photo
  //     GET    /api/animals/{id}/identifications
  //     GET    /api/animals/{id}/status-history
  //     POST   /api/animals/{id}/qr
  //     GET    /api/animals/qr/{token}
  //
  // The remaining modules on this dev server (milk, inventory, health,
  // validation/audit) are NOT migrated yet and intentionally keep working, so
  // no unrelated functionality is broken by this change.
  //
  // A request to a retired path gets an explicit, actionable error rather than
  // a silent 404, so a stale client is diagnosable.
  // ==========================================================================
  app.all(/^\/api\/animals(\/.*)?$/, (_req, res) => {
    res.status(410).json({
      success: false,
      message:
        'The legacy JSON animal API has been retired. Animal data is served by the ' +
        'ASP.NET Core API backed by MySQL "Dairy Farm 1".',
      data: null,
    });
  });

  // Supplies & Warehouse Stock Endpoints (MySQL & ASP.NET Core ERP Spec)
  app.get('/api/inventory', handleGetInventory);
  app.get('/api/feed', handleGetFeed);
  app.get('/api/medicines', handleGetMedicines);
  app.get('/api/vaccines', handleGetVaccines);
  app.get('/api/semen', handleGetSemen);
  app.post('/api/inventory', handlePostInventory);
  app.put('/api/inventory/:id', handlePutInventory);
  app.delete('/api/inventory/:id', handleDeleteInventory);

  // Herd Health & Veterinary Endpoints (ASP.NET Core & MySQL Specification)
  app.get('/api/health/events', handleGetHealthEvents);
  app.post('/api/health/events', handlePostHealthEvent);
  app.get('/api/treatments', handleGetTreatments);
  app.post('/api/treatments', handlePostTreatment);
  app.post('/api/treatments/:id/complete', handleCompleteTreatment);
  app.get('/api/health/active-withdrawals', handleGetActiveWithdrawals);
  app.get('/api/vaccinations', handleGetVaccinations);
  app.post('/api/vaccinations', handlePostVaccination);
  app.get('/api/quarantine', handleGetQuarantine);
  app.post('/api/quarantine', handlePostQuarantine);
  app.get('/api/health/dashboard', handleGetHealthDashboard);

  // SaaS Validation System & Audit API Endpoints
  app.post('/api/validate/dashboard', handleValidateDashboard);
  app.post('/api/calculate/profit', handleCalculateProfit);
  app.post('/api/validate/batch', handleValidateBatch);
  app.get('/api/audit/trail/:farmId', handleGetAuditTrail);
  app.get('/api/audit/data-readiness', handleAuditDataReadiness);

  // Vite middleware for development / static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
