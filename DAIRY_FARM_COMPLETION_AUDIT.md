# Dairy Farm Management Software

# Complete Implementation Audit

## Version 1.0 — Requirements 1–42

**Audit date:** 30 September 2026
**Project root:** `c:\Users\allah\Downloads\dairy-farm-complete-backend-v1\frontend-dairy-farm-fixed`
**Frontend:** React 19 + TypeScript + Vite 6 (SPA) + Express dev server (`server.ts`)
**Backend:** ASP.NET Core (net10.0), EF Core 9 + Pomelo MySQL, JWT Bearer + API Key
**Databases inspected (live):** `dairy_farm` and `dairy farm 1`

**Audit method:** Full source read of all 114 tracked files, live `dotnet build`, live `npm install`, live `tsc --noEmit`, live `vite build`, and direct `information_schema` inspection of both MySQL schemas. No code, database, or configuration was modified.

---

## ⚠️ HEADLINE FINDING — READ THIS FIRST

**The ASP.NET Core backend does not compile.** `dotnet build` fails with **49 errors**. No backend DLL is produced, so the API cannot start, no endpoint can be reached, and no database write can occur through the .NET application.

```
Build FAILED.
    2 Warning(s)
   49 Error(s)
Time Elapsed 00:00:25.94
```

**Second headline finding:** Even if the backend compiled, **the EF Core entity models match NEITHER live database.** The models are written against a `milk_records` table with `Morning`/`Evening`/`Third`/`Total` columns. The live `dairy farm 1` database has `session`/`quantity_l`; the live `dairy_farm` database has `record_date`/`milk_liters`. Every module query would throw an `Unknown column` MySQL error at runtime.

**Third headline finding:** The React application renders **100% of its business modules from an in-browser `mockApi` backed by `localStorage`**, not from the backend. Only the Animals read/write path and QR paths call the real API — and those calls fail because the backend does not exist as a running service. The animal read path then *silently falls back to mock data*.

**Fourth headline finding:** There is **no login screen anywhere in the frontend.** `authApi.login()` is defined in `apiClient.ts` and is never called by any component. `setUnauthorizedHandler()` is exported and never registered. Since the backend rejects all protected writes, **every animal create/edit/status/photo/QR action is impossible in the running app.**

Consequently, a very large amount of high-quality UI and calculation code exists, but almost none of it is wired to a working, persistent backend.

---

## 1. Overall Completion

Counting the 42 Version 1.0 requirements by end-to-end working state (UI + API + DB persistence + validation + calculations all functioning together):

| Bucket | Count | % |
| --- | ---: | ---: |
| Fully Complete | 1 | 2% |
| Partially Complete | 11 | 26% |
| Not Implemented | 23 | 55% |
| Broken / Blocked | 7 | 17% |

**Notes on classification** (counts verified directly against the table in §2, which contains exactly 42 numbered rows):
- **Fully Complete (1): Req 41 only** — and this is a *negative* requirement (PLC/SCADA/sensors/MQTT/AI-CCTV/UWB must be **excluded**). Nothing was wrongly built, so it is complete. **This means ZERO functional requirements are complete end-to-end.**
- **Partially Complete (11):** Req 2, 3, 4, 18, 24, 25, 26, 30, 33, 38, 40. These have real, substantial implementation, but the end-to-end path is broken.
- **Broken/Blocked (7):** Req 1, 5, 7, 9, 19, 20, 42. These have code paths that actively fail rather than merely being absent.
- **Not Implemented (23):** Req 6, 8, 10, 11, 12, 13, 14, 15, 16, 17, 21, 22, 23, 27, 28, 29, 31, 32, 34, 35, 36, 37, 39. No working code path at all.

**Why nothing functional is complete:** the backend does not compile and no business module persists to MySQL. Every functional requirement depends on the API tier.

---

## 2. Requirement-by-Requirement Status

| Req | Requirement | Frontend | Backend/API | Database | E2E | Status | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Main Dashboard (20 metrics) | UI complete | `DashboardController` **fails to compile** | Tables exist, 0 rows | No | BROKEN | `DashboardView.tsx:66` → `services/index.ts:680` → `mockApi.getDashboardSummary()`. Real `/api/dashboard` **never called**. 3 compile errors (`AppDbContext.Income`, `AppDbContext.Tasks` missing). `open` counts `Status=="ACTIVE"` (line 34), conflating Open with Active. |
| 2 | Animal Master Database | UI complete | `AnimalsController` + `AnimalsWriteController` | `animals`: 5 rows `dairy_farm`, 0 `dairy farm 1` | No | PARTIAL | Only module with real API calls (`services/index.ts:334-500`). **But** backend does not compile → calls fail → `catch` at lines 349/357 silently returns `mockApi.listAnimals()`. `location` not settable; `colorMarkings`/`source` have no column. |
| 3 | Animal Profile | UI complete (78 KB) | `GET /api/animals/{id}` + `/identifications` + `/status-history` | Tables exist, 0 rows | No | PARTIAL | `AnimalProfileView.tsx` renders 9 tabs. Milk/Breeding/Health/Feed tabs call services that are **100% mockApi**. Only Identity + status-history are real-backed, and those fail to compile. |
| 4 | Animal Search & Filtering | UI complete | `GetAnimals` (status/sex/breedId/groupId/search) | Indexed | No | PARTIAL | Backend supports 6 filters. **Missing:** age range, milk threshold, HF/lactating/not-pregnant composite filter. Breed resolved name→id at `apiClient.ts:442`. |
| 5 | Milk Management | UI complete (96 KB) | **None used** | `milk_records` exists both DBs, **0 rows** | No | BROKEN | `milkService` entirely `mockApi.*`. Express `POST /api/milk` stores into a **module-level `const inMemoryRecords: MilkRecordRow[] = []`** — lost on restart, never touches MySQL. No third-milking persistence, no lactation totals, no SNF/SCC aggregation. |
| 6 | Milk Alerts & Lactation | UI partial | None used | `lactations` 0 rows | No | NOT IMPLEMENTED | `listLactations` → `mockApi`. **No production-drop detection, no configurable threshold, no DIM, no peak milk/date, no dry-date logic** anywhere. `config.json` thresholds consumed by nothing server-side. |
| 7 | Breeding Management | UI complete (84 KB) | **None used** | `breeding_events` 0 rows | No | BROKEN | `breedingService` → `mockApi` entirely. `Pregnancy`/`Calving` unused by frontend. `ReportsController:24` uses `x.EventDate`; live column is `event_date` — compile error. |
| 8 | Calving & Calf Management | UI complete | `TryCreateCalfAsync` (`FarmModulesController:173`) | `calvings`, `calves` 0 rows | No | NOT IMPLEMENTED | Auto-calf code references undefined field `_codes` (line 177) — **compile error**. Frontend `recordCalving` → `mockApi`. Automatic calf creation never runs. |
| 9 | Growth Management | UI partial | None used | `growth_records` 0 rows | No | BROKEN | `GrowthRecord` model exists. No weight/height chart, no date-based querying, no frontend module at all. |
| 10 | Health Management | UI complete (58 KB modals) | **None used** | `health_records` 0 rows | No | NOT IMPLEMENTED | `healthService` → `mockApi` (lines 520-549). Express `healthApiHandler.ts` is in-memory. `diseases` has 0 rows; custom-disease CRUD not wired. |
| 11 | Medication & Withdrawal | UI complete | `ApplySideEffectsBeforeSave` | `medicines`, `treatments` 0 rows | No | NOT IMPLEMENTED | Logic at `FarmModulesController.cs:158-170` — controller does not compile, frontend never calls it. Live `treatments` has `withdrawal_days`/`withdrawal_end`; model has `quantity_used`/`milk_withdrawal_until` — **column mismatch**. No saleability flag reaches milk. |
| 12 | Vaccination | UI complete | None used | `vaccinations`, `vaccines` 0 rows | No | NOT IMPLEMENTED | `listVaccinations` → `mockApi`. No next-due computation, no due/overdue reminders from DB. |
| 13 | Feed Management | UI complete (46 KB) | **None used** | `feed_items` (6 rows legacy) | No | NOT IMPLEMENTED | `feedService` → `mockApi` (lines 552-561). `Feed` model maps table `feeds`; live DB has `feed_items` — **table name mismatch**. No nutritional info persisted. |
| 14 | Feed Consumption & Ration | UI partial | None used | `rations`, `feed_consumption` 0 rows | No | NOT IMPLEMENTED | No ration engine, no high/medium/dry/heifer/calf templates, no feed cost/liter. `listRations` → `mockApi`. |
| 15 | Feed Inventory | UI complete | None used | `feed_stock` 0 rows | No | NOT IMPLEMENTED | `inventoryService` → `mockApi` (lines 563-607). No opening/purchased/consumed/closing ledger in DB. Low-stock alerts mock-only. |
| 16 | Animal Purchases | UI in Finance | None used | `animal_purchases` 0 rows | No | NOT IMPLEMENTED | `listPurchases` → `mockApi`. Landed-cost trigger exists, but model `veterinary_cost` vs live `inspection_cost` — **mismatch**. No quarantine workflow, no documents. |
| 17 | Animal Sales | UI in Finance | `ApplySideEffectsBeforeSave` sets SOLD | `animal_sales` 0 rows | No | NOT IMPLEMENTED | `recordSale` → `mockApi`. No profit/loss. "Cannot sell dead animal" rule at `FarmModulesController:142` unreachable. |
| 18 | Mortality | UI present | `ApplySideEffectsBeforeSave` sets DEAD | `mortalities` 0 rows | No | PARTIAL | `recordMortality` → `mockApi`. Live DB has **both** `animal_deaths` and `animal_mortalities` — competing tables, neither used. No post-mortem notes field in the EF model. |
| 19 | Farm Expenses | UI complete | **None used** | `expenses` 0 rows | No | BROKEN | `listExpenses/createExpense` → `mockApi` (lines 610-611). No payment method, payee, or receipt persisted. |
| 20 | Income | UI complete | **None used** | `income` 0 rows | No | BROKEN | `listIncomes/createIncome` → `mockApi`. No milk qty × price computation server-side. |
| 21 | Milk Customers | UI in Finance | None used | `milk_buyers` (3 rows), `customers` 0 | No | NOT IMPLEMENTED | `listCustomers` → `mockApi`. Two competing customer tables. No delivery/payment/balance ledger wired. |
| 22 | Accounts Receivable | UI in Finance | None used | `payments` 0 rows | No | NOT IMPLEMENTED | `recordCustomerPayment` → `mockApi`. No outstanding balance, credit period, payment-date persistence. |
| 23 | Supplier Management | UI in Finance | None used | `suppliers` 0 rows (4 legacy) | No | NOT IMPLEMENTED | `listSuppliers/createSupplier/recordSupplierPayment` → `mockApi`. No purchase history or outstanding payable. |
| 24 | Farm Profitability | UI complete | None used | n/a | No | PARTIAL | `dairyCalculations.js` (25 KB) and `financialCalculationService.ts` (12.7 KB) contain **real, audited** cost/liter, cost/cow/day, revenue/cow/day, profit/cow/day logic with a `CalculationAuditTrail`. But they run on mock data; `handleCalculateProfit` is an in-memory Express route. |
| 25 | Animal Profitability | UI partial | None used | n/a | No | PARTIAL | `animalCalculationService.ts` (3.4 KB) exists (milk revenue − feed − medicine − allocated cost). No configurable allocation methodology UI; no visible input panel wired to DB. |
| 26 | Tasks & Reminders | UI complete (27 KB) | `TaskItem` model + `/api/tasks` route | `tasks` 0 rows | No | PARTIAL | `taskService` → `mockApi` (lines 626-630). Task types exist in UI dropdowns only. Live `tasks.due_date` is `datetime`, model uses `DateOnly` — **type mismatch**. |
| 27 | Notifications | UI complete (17 KB) | `NotificationsController` — **does not compile** | `notifications` 0 rows | No | NOT IMPLEMENTED | `notificationService` → `mockApi` (lines 632-636); the real controller is never called. **No `BackgroundService`/`IHostedService` exists anywhere** — nothing ever generates a calving-due, vaccination-due, withdrawal or milk-drop notification from the database. |
| 28 | Reports | UI complete (20 KB + 105 KB tables) | `ReportsController` — **does not compile** | Tables exist, 0 rows | No | NOT IMPLEMENTED | `reportService` → `mockApi` (lines 683-686). Missing report types: daily, weekly, mortality, calf, pregnancy. Only milk + financial exist, both from mock. |
| 29 | Search & Filters | UI partial | None | n/a | No | NOT IMPLEMENTED | Per-view filter boxes exist. **No sorting, no saved views, no combined-filter builder** anywhere. No sort/orderBy on `FarmModulesController.List`. |
| 30 | Import & Export | **Export only** (PDF/CSV/Word) | None | n/a | Export only | PARTIAL | `pdfExport.ts`, `milkReportExport.ts`, `ReportExporter.ts` produce genuine jsPDF/CSV/Word output — from mock data. **Excel import entirely absent**: no `xlsx`/`SheetJS` dependency, no `FileReader`, no `<input type="file">` in the codebase. No pre-commit validation. |
| 31 | Multi-Farm | UI hardcoded "Green Dairy Farm" | `FarmsController` (read-only) | `farms` **0 rows** in both DBs | No | NOT IMPLEMENTED | `companies` has 1 row, `farms` has 0. `GET /api/farms` returns empty. No farm switcher. No shed/group create UI. `farm_user_access` has 0 rows and is never queried by any controller. |
| 32 | User Roles & Permissions | **No UI** | `StaffController` — **does not compile** | `roles` 6, `users` **0 rows** | No | NOT IMPLEMENTED | Only 3 controllers use `[Authorize(Roles=...)]`. The 28-row `permissions` and 39-row `role_permissions` tables are **never read by any code**. No user-management screen. |
| 33 | Mobile | Responsive UI + 2 quick modals | None used | n/a | No | PARTIAL | `MobileBottomNav`, `MobileDrawer`, `QuickMilkEntryModal`, `QuickHealthEntryModal` exist. **Fast breeding entry and fast calving entry do not exist**, and both modals post to `mockApi`. |
| 34 | QR Identification | UI complete (24 KB card) | `AnimalQrController` (3 endpoints) | `animal_identifications` 0 rows | No | NOT IMPLEMENTED | UI is real and well-built, but: (a) backend does not compile; (b) `POST /api/animals/{id}/qr` requires `[Authorize]` and **no token can ever be obtained**; (c) `GET /api/animals/qr/{token}` is `[AllowAnonymous]` and returns 404 for every animal because 0 QR rows exist. |
| 35 | Offline Mobile | **None** | None | n/a | No | NOT IMPLEMENTED | Grep for `serviceWorker`, `navigator.onLine`, `indexedDB` returns **zero results**. No sync queue, no client UUIDs, no conflict handling, no idempotency keys. |
| 36 | Data Integrity | Scattered | Partial, in `FarmModulesController` | Triggers present | No | NOT IMPLEMENTED | Duplicate animal code implemented in `AnimalWriteService` (unreachable). No-negative-milk at `FarmModulesController:136` (unreachable). **Date validation, cannot-sell-dead and required-field checks unreachable**. No unique constraint on milk records. |
| 37 | Audit Trail | "Audit & Validation" view | `WriteAudit` — **does not compile** | `audit_logs` 0 rows; columns differ | No | NOT IMPLEMENTED | EF `AuditLog` expects `id`, `farm_id`, `old_value`, `new_value`, `ip_address`. Live `dairy farm 1.audit_logs` has `audit_id`, `old_value_json`, `new_value_json` and **no** `farm_id`/`ip_address` — **guaranteed runtime failure** even after compiling. Only the generic V1 module controller writes audit rows; **animal, milk, breeding, health, medicine, finance, user and permission changes write none**. |
| 38 | Attachments | Animal photo upload UI | `AnimalPhotoService` (magic-byte validation, 2 MB cap) | `animal_photos` (LONGBLOB) | No | PARTIAL | The **only** genuinely well-engineered file-upload implementation: real magic-byte sniffing (not trusting declared MIME), 413 on oversize, `RequestSizeLimit`, `AllowAnonymous` GET. Blocked by: no login screen → cannot authenticate the POST; and `animal_photos` has **0 rows** and no CREATE in `001_complete_schema.sql`. Receipts, vet and purchase documents: **not implemented**. |
| 39 | Security & Backup | No login screen | JWT + API key infra good | n/a | No | NOT IMPLEMENTED | **HTTPS not configured anywhere** — no `UseHttpsRedirection`, no Kestrel cert; CORS allows only `http://`. Password policy: 12-char minimum on `StaffController.Create` (unreachable). **No backup script, no restore procedure, no mysqldump** anywhere. API-key hashing (SHA-256) is correct. |
| 40 | API-First Architecture | Good service abstraction | REST shape correct | n/a | No | PARTIAL | Architectural intent is right: `IApiClient`, `ApiResponse` envelope, Swagger, JWT policy scheme, module dictionary. But the API **does not compile**, so "integration separation" is theoretical. `FarmModulesController` uses `System.Linq` in-memory filtering after `ToListAsync()` — a scaling anti-pattern. |
| 41 | Version 1 Scope | Correctly excluded | n/a | n/a | n/a | COMPLETE | No PLC, SCADA, sensor, MQTT, automated-cooling, AI-CCTV or UWB/BLE code exists. Scope discipline is correct. |
| 42 | Overall Integration | Compiles (Vite ✓) | **Build FAILS** | **Schema mismatch** | No | BROKEN | `npm run build` ✓, `tsc --noEmit` ✓, `dotnet build` ✗ (49 errors). Frontend points at `http://192.168.18.66:5080/api` (`.env`) but `launchSettings.json` binds **5064** — **port mismatch, connection refused**. Dashboard, reports and all modules read mock data. |

---

## 3. Frontend Audit

Global verdict: **the frontend builds and runs, but it is a mock-driven single-page app with a real-API veneer over one module (Animals) that cannot connect.**

- **Dashboard** (`DashboardView.tsx`, 31.6 KB) — UI: Yes (hero, stat cards, Recharts 7-day milk/expense bars, top-producers, quick actions). Save/Edit: N/A. **Persistence: None** — `dashboardService.getSummary()` → `services/index.ts:680` → `mockApi`. **API connected: No.** Errors: only `console.error`. *Fabricated data:* `topProducers` hardcodes `daysInMilk: 180` and `status: 'Lactating'` (lines 107-108). *Good:* the `hasFinancialData` guard (line 120) correctly refuses to render "Rs 0" as revenue.
- **Animals** (`AnimalsView.tsx`, 58 KB) — UI/Forms: Yes. Save → `animalWritesApi.create`; Edit → `animalWritesApi.update`. **API connected: Partially** — the only module that genuinely tries, but `.env` uses port **5080** while `launchSettings.json` binds **5064**. **Persistence: attempted but unreachable**; falls back to mock. Validation: good (`[Required]`, `[Range]`, `[RegularExpression]` on sex/status). Missing: age range, milk threshold, composite HF filter. `getNextId()`/`getNextTag()` still use `mockApi` (lines 407-408), so the ID preview is fake while the server allocates a real one.
- **Milk** (`MilkView.tsx`, 96 KB) — largest module; UI + all forms present. **Persistence: None** — all `milkService` methods → `mockApi`. **API connected: No**; the Express `/api/milk` route is never called by the React app. Missing: rolling 7/30-day averages, lactation totals, SNF/SCC persistence, rejected-milk enforcement.
- **Breeding** (`BreedingView.tsx`, 84 KB) — UI: Yes (heat, AI, PD, calving, pregnancy). **Persistence: None** — `breedingService` → `mockApi`. Missing: follow-up reminders, expected-calving from a real PD date.
- **Calving** (inside `BreedingView`) — UI: Yes. Save → `recordCalving` → `mockApi`. No automatic calf creation; no colostrum/complications persistence.
- **Health** (`HealthView.tsx` 57 KB + `health/HealthModals.tsx` 58 KB) — UI: Yes, 5 modals (treatment, complete-hold, health event, vaccination, quarantine). **Persistence: None** — all 20+ `healthService` methods → `mockApi` (lines 520-549). **API connected: No**; Express `healthApiHandler.ts` is in-memory and unmounted from the React path. Missing: disease master CRUD, custom diseases, withdrawal-driven saleability.
- **Feed** (`FeedView.tsx`, 46 KB) — UI: Yes. **Persistence: None** — `mockApi`. No ration engine, no cost/liter.
- **Inventory** (`InventoryView.tsx` 70 KB + 3 modal files, 85 KB) — the most elaborate UI in the project (feed, medicines, vaccines, semen, warehouses, transactions, metrics). **Persistence: None** — all 24 `inventoryService` methods → `mockApi` (lines 563-607). **API connected: No.** Missing: real stock ledger, DB-driven min-stock alerts.
- **Purchases / Sales / Mortality** (in `FinanceView.tsx` + `HerdTransactionsView.tsx`) — UI: Present. All → `mockApi`. No landed-cost, no profit/loss, no post-mortem.
- **Expenses / Income / Customers / Suppliers** (`FinanceView.tsx` 51 KB + 3 finance modals, 39 KB) — UI: Present and well-built (ledger, invoice, supplier-ledger modals). **Persistence: None** — all 12 `financeService` methods → `mockApi` (lines 609-624). **API connected: No.**
- **Profitability** — the calc library is **real and high quality**: `dairyCalculations.js`, `financialCalculationService.ts`, `animalCalculationService.ts`, `inventoryCalculationService.ts`, `milkCalculationService.ts`, `healthCalculationService.ts`. All operate on mock inputs; `handleValidateDashboard` / `handleCalculateProfit` are in-memory Express routes that read the POST body, never MySQL.
- **Tasks** (`TasksView.tsx`, 27 KB) — UI: Yes. `taskService` → `mockApi`. No DB-driven due/overdue, no assigned user, no completion date persisted.
- **Notifications** (`AlertsView.tsx`, 17 KB) — UI: Yes. `alertService` is an alias of `notificationService` → `mockApi`. 10 hard-coded seed notifications in `feedFinanceData.ts:605-715`.
- **Reports** (`ReportsView.tsx` 20 KB + `ReportTables.tsx` 105 KB) — the most extensive report surface. **Persistence: None** — `reportService` → `mockApi`. **Export genuinely works** (`exportReportToCsv`, `exportReportToPdf`, `downloadMilkSummaryReportPDF`, `downloadMilkSummaryReportWordPress`) but from mock data. Missing: daily, weekly, mortality, calf, pregnancy; Excel import.
- **Settings** (`SettingsView.tsx`, 37 KB) — ships a live **mock-service control panel** (latency slider, error-rate simulator, "Reset all mock data"). Dev tooling in the product UI. No user/RBAC settings, no farm/shed/group management, no backup controls.
- **Users / RBAC** — **No UI exists.** `Sidebar.tsx` has no users or permissions entry.
- **QR** (`AnimalQrCard.tsx` 24 KB, `LiveQrAnimalProfile.tsx` 22 KB, `QrAnimalLookupModal.tsx` 9 KB) — **the best-implemented frontend feature.** Scan → `?qr=`/path/hash → `LiveQrAnimalProfile` → `animalWritesApi.resolveQrToken` with a clean 3-state result (`found`/`notFound`/`unavailable`). **API connected in code**, but 0 QR rows exist, the backend does not compile, and issuing a token needs an unobtainable JWT. *Credit:* the code documents that a previous version fell back to `mockApi.getAnimalQrProfile()` and rendered a **fabricated animal** under a "LIVE ANIMAL DIGITAL PASSPORT" heading — correctly removed.
- **Import / Export** — Export: PDF (jsPDF + autoTable), CSV, Word-compatible XML. Real implementations. Import: **completely absent** — no `xlsx` package, no `FileReader`, no file input element anywhere.
- **Mobile** — `MobileBottomNav`, `MobileDrawer`, `QuickMilkEntryModal`, `QuickHealthEntryModal` present. Missing: fast breeding, fast calving, fast task entry. Both modals write to mock.
## 4. Backend/API Audit

15 controllers. **All protected endpoints are unreachable because the project does not compile.**

| Endpoint | Method | Purpose | Auth | Permission | DB Operation | Status | Problems |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/health` | GET | Liveness | No | None | None | Would work | — |
| `/api/health` | GET | Readiness + DB probe | No | None | `CanConnectAsync` | Would work | — |
| `/api/auth/login` | POST | Issue JWT | No | None | Read `users`+`user_roles`+`roles` | Would work | **0 users in DB → nobody can ever log in.** `dairy farm 1.users` matches the model; `dairy_farm.users` does not (has `farm_id`/`role_id`/`username`/`full_name`, no `company_id`). |
| `/api/auth/me` | GET | Current user | `[Authorize]` | None | Read `users` | Would work | Same column-mismatch risk. |
| `/api/animals` | GET | List animals | **No** | None | Read `animals` + joins | Would work | **Unauthenticated data exposure.** Falls back to mock client-side. |
| `/api/animals/by-code/{code}` | GET | By animal code | **No** | None | Read | Would work | Unauthenticated. |
| `/api/animals/{id}` | GET | Detail | **No** | None | Read + identifications + status history | Would work | Unauthenticated. |
| `/api/animals/{id}/identifications` | GET | Ear tag / RFID / QR | **No** | None | Read | Would work | Unauthenticated. |
| `/api/animals/{id}/status-history` | GET | Status audit | **No** | None | Read | Would work | Unauthenticated. |
| `/api/animals` | POST | Create animal | `[Authorize]` | **None** | Insert + sequence + identifications | **BROKEN** | Any valid token can create animals — no `animals.create` check. Reachable code, but no backend. |
| `/api/farms`, `/api/farms/{id}` | GET | Farm lookup | **No** | None | Read `farms` | Would work | Returns **empty** — `farms` has 0 rows. Unauthenticated. |
| `/api/sheds`, `/api/sheds/{id}` | GET | Shed lookup | **No** | None | Read `sheds` | Would work | 0 rows in `dairy farm 1`. Unauthenticated. |
| `/api/animal-groups`, `/{id}` | GET | Group lookup | **No** | None | Read | Would work | 0 rows in `dairy farm 1`. Unauthenticated. |
| `/api/breeds`, `/by-name/{name}`, `/{id}` | GET | Breed lookup | **No** | None | Read `breeds` | Would work | 0 rows in `dairy farm 1`. Unauthenticated. |
| `/api/dashboard` | GET | Dashboard metrics | `[Authorize]` | **None** | Aggregate 6 sets | **BUILD ERROR** | 3 errors: `AppDbContext.Income`, `AppDbContext.Tasks` missing, generic `FarmId`. Also no feed/stock warning, no financial summary detail. |
| `/api/reports/farm` | GET | Farm report | `[Authorize]` | **None** | Aggregate | **BUILD ERROR** | 7 errors incl. `_db.Income` missing and `x.Date` on generic. |
| `/api/reports/milk` | GET | Milk report | `[Authorize]` | **None** | `GroupBy` | **BUILD ERROR** | `Result` unresolved. |
| `/api/notifications` | GET | List | `[Authorize]` | **None** | Read | **BUILD ERROR** | `Result` unresolved. **No generator exists** — the table is never written. |
| `/api/notifications/{id}/read` | POST | Mark read | `[Authorize]` | **None** | Update | **BUILD ERROR** | `Result` unresolved. |
| `/api/notifications/read-all` | POST | Mark all read | `[Authorize]` | **None** | Update | **BUILD ERROR** | `Result` unresolved. |
| `/api/staff` | GET | List staff | `[Authorize(Roles="Owner,Manager")]` | Role | Read `users` | **BUILD ERROR** | 8 errors. |
| `/api/staff` | POST | Create staff | `[Authorize(Roles="Owner")]` | Role | Insert user + roles | **BUILD ERROR** | 12-char password policy is good. Unreachable. |
| `/api/staff/{id}/status` | PATCH | Activate/deactivate | `[Authorize(Roles="Owner,Manager")]` | Role | Update | **BUILD ERROR** | Unreachable. |
| `/api/staff/{id}/roles` | PUT | Set roles | `[Authorize(Roles="Owner")]` | Role | Replace `user_roles` | **BUILD ERROR** | Unreachable. |
| `/api/api-keys` | GET/POST | API key mgmt | `[Authorize(Roles="Owner")]` | Role | Read/Insert `api_keys` | **BUILD ERROR** | 5 errors. `api_keys` table does not exist in either live DB. |
| `/api/api-keys/{id}/revoke` | POST | Revoke key | `[Authorize(Roles="Owner")]` | Role | Update | **BUILD ERROR** | Unreachable. |
| `/api/{module}` | GET | Generic list (27 modules) | `[Authorize]` | **None** | `ToListAsync()` then LINQ-to-Objects | **BUILD ERROR** | `DbContext.Set(type)` type inference fails (2 errors). **Loads entire tables into memory.** No `farm_id` scoping by the caller's authorization. |
| `/api/{module}/{id}` | GET | Generic get | `[Authorize]` | **None** | `FindAsync` | **BUILD ERROR** | `Result` unresolved. |
| `/api/{module}` | POST | Generic create | `[Authorize]` | **None** | Deserialize + insert | **BUILD ERROR** | 8 errors incl. undefined `_codes`. **No field whitelist** — raw client JSON is bound straight to the entity, so a caller can set `FarmId` on any row and write to any farm. |
| `/api/{module}/{id}` | PUT | Generic update | `[Authorize]` | **None** | `SetValues` | **BUILD ERROR** | Same mass-assignment risk. |
| `/api/{module}/{id}` | DELETE | Generic delete | `[Authorize(Roles="Owner,Manager")]` | Role | Remove | **BUILD ERROR** | **Hard delete on `audit_logs`, `attachments`, `notifications`** — violates Req 36 "historical records retained". No soft-delete/archive. |
---
## 5. Database Audit

### Two databases exist, and the application targets neither

| Database | Tables | Rows | Schema lineage |
| --- | ---: | ---: | --- |
| `dairy_farm` | 48 | `animals`=5, `companies`=1, `groups`=5, `feed_items`=6, `inventory_items`=6, `milk_buyers`=3, `suppliers`=4, `finance_categories`=11, `permissions`=28, `role_permissions`=39, `roles`=6, `sheds`=3. **Everything else 0.** | **Legacy/original.** `animals` has `gender`, `date_of_birth`, `tag_number`, `rfid_number`, `color`, `acquisition_date`. `users` has `farm_id`, `role_id`, `username`, `full_name` — **no `company_id`**. |
| `dairy farm 1` | 55 | **All 0** (all 55 tables, incl. `animals`, `users`, `farms`, `companies`, `breeds`) | **Target of the EF models and all 20 triggers.** `animals` has `sex`, `dob`, `breed_id`, `purchase_date`. `users` has `company_id`, `name`, `email`, `password_hash`. Has the `animal_*`-prefixed module tables. |

**The code contradicts itself on which database it uses:**
- `backend/.env.example:16` → `Database=dairy_farm`
- `backend/Models/Animal.cs:8` → *"Maps 1:1 to `dairy farm 1`.animals"*
- `server.ts:97` → *"ASP.NET Core backend... MySQL 'Dairy Farm 1'"*
- `apiClient.ts:9` → *"reads the real `Dairy Farm 1` MySQL database"*
- `config.json:4` → references the `'dairy farm 1'` database

**`dairy farm 1` is entirely empty** (0 rows in all 55 tables). **`dairy_farm` holds the only data** (5 animals) but has a **completely different schema**. Neither can satisfy the EF models as written.

### The `companies` table (as requested — do not drop)

```sql
-- dairy_farm
CREATE TABLE companies(company_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                        name VARCHAR(200) NOT NULL) ENGINE=InnoDB;   -- 1 row
```

- The EF `Company` model maps `company_id` + `name` — **this one table matches in both databases.**
- It is mapped in `AppDbContext` only because `users.company_id` is `NOT NULL` with an FK, so the owner bootstrap needs a resolvable company.
- `Program.cs` and `AppDbContext` never create or alter it. `OwnerBootstrapService` only *reads* it.
- **No recommendation to drop, truncate, or modify any production data.** Any remediation must use additive `ALTER TABLE` / `CREATE TABLE IF NOT EXISTS` and must not touch the 1 existing row.

### Schema/API mismatches (would cause runtime SQL errors even after the build is fixed)

| EF model expects | Live `dairy farm 1` actual | Live `dairy_farm` actual |
| --- | --- | --- |
| `milk_records.id`, `FarmId`, `Morning`, `Evening`, `Third`, `Total` | `milk_record_id`, **no `farm_id`**, `session`, `quantity_l`, **no `total`** | `milk_record_id`, `farm_id`, `record_date`, `milk_liters` |
| `treatments.id`, `FarmId`, `QuantityUsed`, `MilkWithdrawalUntil`, `MeatWithdrawalUntil` | `treatment_id`, `health_id`, `withdrawal_days`, `withdrawal_end`, `dose`, `unit`, `route`, `cost` — **no farm_id, no quantity_used** | table absent |
| `health_records.id` | `health_id` (PK name differs) | table absent |
| `audit_logs.id`, `farm_id`, `old_value`, `new_value`, `ip_address` | `audit_id`, `old_value_json`, `new_value_json` — **no farm_id, no ip_address** | `id`, `farm_id`, `old_value`, `new_value`, `timestamp`, `ip_address` (closer) |
| `tasks.due_date` as `DateOnly` | `due_date` is **`datetime`** | `due_date` is `date` |
| `Feed` → table `feeds` | table is `feed_items` | `feed_items` |
| `AnimalPurchase.VeterinaryCost` | `inspection_cost` | table absent |
| `api_keys` | **table does not exist** | **table does not exist** |
| `animal_photos` | **table does not exist** (only in a separate script, 0 rows) | **table does not exist** |
| `customer_payments`, `supplier_payments`, `farm_user_access` | **do not exist** | do not exist |
| `Attachment`, `RationItem` → `ration_items` | `ration_lines` | do not exist |
---

## 6. Save/Persistence Audit

Chain: **FORM → FRONTEND HANDLER → API → CONTROLLER → SERVICE/EF → DATABASE → RELOAD**

| # | Form | Frontend handler | API called | Controller | Service/EF | Database | Reload | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Add Animal | `animalService.create` → `animalWritesApi.create` | `POST /api/animals` | `AnimalsWriteController.Create` ✓ | `AnimalWriteService.CreateAsync` ✓ | ✗ build fails | mock fallback | **FAIL** — no DLL; also `farmId` defaults to `Number(input.farmId) \|\| 1` while `farms` has 0 rows, so the FK would reject it even after compiling |
| 2 | Edit Animal | `animalService.update` → `animalWritesApi.update` | `PUT /api/animals/{id}` | `AnimalsWriteController.Update` ✓ | `AnimalWriteService.UpdateAsync` ✓ | ✗ build fails | — | **FAIL** — build |
| 3 | Change Animal Status | `animalService.archive` → `animalWritesApi.changeStatus` | `PATCH /api/animals/{id}/status` | `AnimalsWriteController.ChangeStatus` ✓ | `AnimalStatusService` ✓ | ✗ build fails | — | **FAIL** — build; also requires a JWT that cannot be obtained |
| 4 | Upload Animal Photo | `AnimalsView` / `AnimalProfileView` → `animalWritesApi.uploadPhoto` | `POST /api/animals/{id}/photo` | `AnimalsWriteController.UploadPhoto` ✓ | `AnimalPhotoService` ✓ (magic bytes, 2 MB) | ✗ build fails + table missing | — | **FAIL** — build + no `animal_photos` table + no token |
| 5 | **Add Milk Record** | `MilkView` → `milkService.create` | **`mockApi` only** | none | none | **localStorage** | mock reload | **FAIL** — never leaves the browser |
| 6 | Add Breeding Event | `BreedingView` → `breedingService.create` | **`mockApi` only** | none | none | localStorage | mock | **FAIL** |
| 7 | Record Calving | `breedingService.recordCalving` | **`mockApi` only** | none (`TryCreateCalfAsync` unused) | none | localStorage | mock | **FAIL** |
| 8 | Add Health Event | `healthService.createHealth` | **`mockApi` only** | none | none | localStorage | mock | **FAIL** |
| 9 | Add Treatment | `healthService.createTreatment` | **`mockApi` only** | none | none | localStorage | mock | **FAIL** — no medicine stock decrement |
| 10 | Complete Treatment (clear hold) | `healthService.completeTreatment` | **`mockApi` only** | none | none | localStorage | mock | **FAIL** |
| 11 | Add Vaccination | `healthService.createVaccination` | **`mockApi` only** | none | none | localStorage | mock | **FAIL** |
| 12 | Add Feed Item | `feedService.createFeedItem` | **`mockApi` only** | none | none | localStorage | mock | **FAIL** |
| 13 | Feed Transaction | `feedService.recordTransaction` | **`mockApi` only** | none | none | localStorage | mock | **FAIL** — no stock movement |
| 14 | Inventory Purchase | `inventoryService.recordPurchase` | **`mockApi` only** | none | none | localStorage | mock | **FAIL** |
| 15 | Inventory Consumption | `inventoryService.recordConsumption` | **`mockApi` only** | none | none | localStorage | mock | **FAIL** |
| 16 | Add Expense | `financeService.createExpense` | **`mockApi` only** | none | none | localStorage | mock | **FAIL** |
| 17 | Add Income | `financeService.createIncome` | **`mockApi` only** | none | none | localStorage | mock | **FAIL** |
| 18 | Add Customer | `financeService.createCustomer` | **`mockApi` only** | none | none | localStorage | mock | **FAIL** |
| 19 | Record Customer Payment | `financeService.recordCustomerPayment` | **`mockApi` only** | none | none | localStorage | mock | **FAIL** |
| 20 | Add Supplier | `financeService.createSupplier` | **`mockApi` only** | none | none | localStorage | mock | **FAIL** |
| 21 | Record Supplier Payment | `financeService.recordSupplierPayment` | **`mockApi` only** | none | none | localStorage | mock | **FAIL** |
| 22 | Create Task | `taskService.create` | **`mockApi` only** | none | none | localStorage | mock | **FAIL** |
| 23 | Update Task Status | `taskService.updateStatus` | **`mockApi` only** | none | none | localStorage | mock | **FAIL** |
| 24 | Mark Notification Read | `notificationService.markRead` | **`mockApi` only** | none | none | localStorage | mock | **FAIL** |
| 25 | Mark All Read | `notificationService.markAllRead` | **`mockApi` only** | none | none | localStorage | mock | **FAIL** |
---
## 7. Authentication & RBAC Audit

| Check | Result | Evidence |
| --- | --- | --- |
| Sign In screen | **NOT IMPLEMENTED** | `authApi.login` defined at `apiClient.ts:592` and **never called**. No `Login.tsx`, no auth route, no form. `App.tsx` renders `<NavigationProvider><MainApp/></NavigationProvider>` with no auth gate. |
| Sign Up | NOT IMPLEMENTED | No endpoint, no UI. (Intended: Owner-only via `POST /api/staff`.) |
| Password hashing | **CORRECT** | `PasswordHasher<User>` (PBKDF2, ASP.NET Core) in `AuthService` and `StaffController`. Null-hash explicitly rejected (line 76) rather than treated as empty. Timing-equaliser `_dummyHash` prevents user enumeration. `SuccessRehashNeeded` upgrade path present. |
| Session / JWT | **CORRECT design** | HMAC-SHA256, validates issuer + audience + signing key + lifetime, 30 s clock skew. Key from `Jwt__Key` env var; `JwtOptions.Validate()` fails fast at startup if < 32 bytes. No hard-coded secret. |
| Token storage | **CORRECT** | In-memory + `sessionStorage` mirror; explicitly **never** `localStorage` (`apiClient.ts:457-460`). Cleared on 401. |
| 401 handling | **INCOMPLETE** | `requestWrite` clears the token and calls `onUnauthorized?.()` — but `setUnauthorizedHandler()` is **never registered**, so `onUnauthorized` is permanently `null`. A 401 silently stops working rather than returning the user to a sign-in screen. |
| API keys | **CORRECT design, unreachable** | `dfk_` + 32 random bytes, SHA-256 at rest, prefix stored, expiry + revocation checked, `X-API-Key` policy-scheme routing. But the controller does not compile and the `api_keys` table does not exist. |
| Owner | **ENFORCED on 3 endpoints only** | `[Authorize(Roles="Owner")]` on `POST /api/staff`, `PUT /api/staff/{id}/roles`, all `/api/api-keys`. |
| Manager | Partially | `Owner,Manager` on `GET /api/staff`, `PATCH /api/staff/{id}/status`, `DELETE /api/{module}/{id}`. |
| Veterinarian / Feed Manager / Worker / Accountant | **NOT ENFORCED** | Roles are seeded in SQL and modelled in `User.Roles`, but **no endpoint restricts by them**. A Worker with a valid token can call `POST /api/animals` (only `[Authorize]`). |
---

## 8. Calculations Audit

| Calculation | Where implemented | State | Evidence |
| --- | --- | --- | --- |
| Daily milk total | `DashboardController:25`, `mockDb` | **BROKEN** | `milk.Where(x=>x.Date==d).Sum(x=>x.Total)` — `MilkRecord.Total` **does not exist** in either live table. Compile error. The frontend never calls it either. |
| Morning + Evening + Third | `FarmModulesController:149` | **PARTIAL** | Logic correct (`Morning+Evening+Third`), but `milk_records` has no such columns and the controller does not compile. |
| 7-day rolling average | `mockDb`, `financialCalculationService` | **PARTIAL** | Computed in the calculation library, but on mock records. No SQL window function or `GROUP BY` on the server. |
| 30-day rolling average | `mockDb` | **PARTIAL** | Same — mock only. |
| Lactation totals | `mockDb` | **NOT IMPLEMENTED** server-side | `lactations` table 0 rows; no aggregation endpoint. |
| Peak milk / DIM / lactation no. | — | **NOT IMPLEMENTED** | No code anywhere computes DIM, peak, or lactation number. `topProducers` **hardcodes** `daysInMilk: 180` (`DashboardView.tsx:107`). |
| Milk revenue (qty × price) | `FarmModulesController:150`, `financialCalculationService` | **PARTIAL** | `Quantity * PricePerLiter` is correct; the controller does not compile. A `trg_milk_sales_total_insert` trigger exists but in the wrong table shape. |
| Feed cost | `inventoryCalculationService.ts` | **PARTIAL** | Real algorithm, mock inputs. |
| Feed cost / liter | `dairyCalculations.js` | **PARTIAL** | Real algorithm, mock inputs. |
| Expenses total | `DashboardController:40`, `ReportsController:22` | **BROKEN** | Both reference `_db.Income`, which does not exist on `AppDbContext` (compile error). |
| Profit | `DashboardController:41`, `handleCalculateProfit` | **BROKEN / PARTIAL** | Controller broken. `handleCalculateProfit` is an in-memory Express route that takes figures from the POST body — **it never reads the database**. |
| Animal profitability | `animalCalculationService.ts` (3.4 KB) | **PARTIAL** | Real calculation; mock inputs; no configurable allocation methodology; no visible input panel wired to DB. |
| Landed purchase cost | `FarmModulesController:151` + DB trigger | **PARTIAL** | `PurchasePrice+TransportCost+VeterinaryCost` — the live column is `inspection_cost`, not `veterinary_cost`. Wrong column name → runtime failure even after the build is fixed. |
| Sale profit / loss | — | **NOT IMPLEMENTED** | No revenue-vs-cost computation for animal sales anywhere. |
| Withdrawal dates | `FarmModulesController:167-168` + 2 DB triggers | **PARTIAL** | `StartDate + MilkWithdrawalDays` is correct. But the model reads `quantity_used`/`milk_withdrawal_until` while live has `withdrawal_days`/`withdrawal_end`. The triggers already exist and are correct — the C# duplication is both wrong and redundant. |
| Expected calving | — | **NOT IMPLEMENTED** | No gestation (+280 days) computation. The 4 SQL views include `vw_upcoming_calvings`, which would solve this — **unused**. |
| Dashboard herd counts | `DashboardController:32-37` | **BROKEN** | Compile errors. Logic also wrong: `open = Status=="ACTIVE"` (line 34) counts every non-special animal as "Open", conflating Open with Active. `totalAnimals` excludes SOLD/DEAD ✓. |
---
## 9. Known Build Errors

### Backend — `dotnet build` → **BUILD FAILED, 2 warnings, 49 errors**

SDKs available: 10.0.112, 10.0.401. Target framework `net10.0` resolves. Restore succeeds. Compilation fails.

**Root causes (6 distinct defects):**

**(a) Missing `using DairyFarm.Api.Infrastructure;` — 30 instances of `error CS0103: The name 'Result' does not exist in the current context`**
`Result` is defined in `Infrastructure/ApiResponse.cs` (namespace `DairyFarm.Api.Infrastructure`). Six controllers use it without importing the namespace.

| File | Error lines |
| --- | --- |
| `Controllers/ApiKeysController.cs` | 26, 32, 37, 43, 45 |
| `Controllers/StaffController.cs` | 24, 31, 32, 39, 45, 47, 54, 57 |
| `Controllers/NotificationsController.cs` | 30, 31, 39 |
| `Controllers/ReportsController.cs` | 19, 25, 38 |
| `Controllers/FarmModulesController.cs` | 42, 102, 109, 111, 114 |

**(b) `error CS0411: The type arguments for method 'DbContext.Set<TEntity>(string)' cannot be inferred` — 2 instances**
`FarmModulesController.cs:44` and `:110` call `_db.Set(type)` on a non-generic `Type`. Needs a cast to a non-generic `IQueryable` or a non-generic accessor.

**(c) `error CS1061: 'AppDbContext' does not contain a definition for 'Income'` / `'Tasks'` — 4 instances**
- `DashboardController.cs:24` — `_db.Income` (the DbSet is named `Incomes`; `DairyFarm.Api.Models.Modules` IS imported, so this is a naming bug)
- `DashboardController.cs:42` — `_db.Tasks` (the DbSet is named `TaskItems`)
- `ReportsController.cs:21` — `_db.Income`

**(d) `error CS1061` on the generic lambda parameter — 8 instances**
`ReportsController.cs:21,63,81,95` and `DashboardController.cs:24,63` — `FarmId` / `Date` not resolvable on `TEntity` because the DbSet type failed to bind (cascade from (c)).

**(e) `error CS0103: The name '_codes' does not exist in the current context` — 1 instance**
`FarmModulesController.cs:177` — `TryCreateCalfAsync` calls `_codes.NextCodeAsync(...)` but `FarmModulesController` has no `_codes` field and no `AnimalCodeGenerator` dependency. **This is a genuinely unfinished feature: automatic calf creation was never wired up.**

**(f) `error CS1061: 'DbContextOptionsBuilder' does not contain a definition for 'UseSnakeCaseNamingConvention'` — 1 instance**
`Program.cs:42`. `UseSnakeCaseNamingConvention()` comes from the **`EFCore.NamingConventions`** NuGet package, which is **not referenced** in `DairyFarm.Api.csproj`. Without it EF would emit PascalCase column names (`AnimalCode`, `FarmId`) matching **no** table in either database. This is a **latent runtime-breaking bug** that the compiler is correctly surfacing.

**Warnings (2, both `ApiKeyAuthenticationHandler.cs` lines 16-17):** `CS0618: 'ISystemClock' is obsolete: 'Use TimeProvider instead.'`

### Frontend — **NO ERRORS**

```
npm install      → added 338 packages, 0 vulnerabilities   ✓
npx tsc --noEmit → 0 errors                                 ✓
npm run build    → ✓ built in 46.43s                       ✓
```

Bundle warning only: `index-CUi2_71Y.js` is 2,151 kB (>500 kB advisory). Not an error.

**Net effect:** the entire backend tier is unavailable. Every real API call from the React app fails with `ApiUnavailableError`, and the animal service silently substitutes mock data.

---

## 10. Database Errors

| Category | Finding |
| --- | --- |
| SQL syntax errors | **None found.** `001_complete_schema.sql` (19.6 KB) is well-formed: balanced `CREATE TABLE IF NOT EXISTS`, correct `ENGINE=InnoDB`, correct `FOREIGN KEY` syntax, `USE dairy_farm;` at the top. Idempotent and safe to re-run. |
| Existing-table conflicts | **Yes — severe, but from competing lineages rather than from the script.** `dairy_farm` has 48 tables, `dairy farm 1` has 55. Tables with the same name but different columns: `animals`, `users`, `milk_records`, `medicines`, `feed_items`, `groups` vs `animal_groups`, `tasks`, `notifications`, `roles`, `permissions`, `suppliers`, `sheds`. The script's `CREATE TABLE IF NOT EXISTS` would **silently skip** every conflicting table and create only the missing ones — leaving a schema matching neither the C# models nor the existing data. |
| Invalid indexes | **None found.** All `INDEX(...)` and `UNIQUE KEY uq_breeds_name(name)` declarations are valid. `uq_animal_farm_code(farm_id, animal_code)` is correct and does the required duplicate-prevention job. |
| Invalid foreign keys | **None found** in either live DB (FKs validate). But the **EF models would violate them**: `Animal` maps `farm_id` NOT NULL, and `farms` has **0 rows** in both databases, so every animal insert would fail on FK. |
| Missing columns | **14 confirmed** — see the mismatch table in §5. Most severe: `milk_records` lacks `farm_id`/`total`/`morning`/`evening`/`third`; `treatments` lacks `quantity_used`/`milk_withdrawal_until`; `audit_logs` lacks `farm_id`/`ip_address`. |
| Missing tables | **7** referenced by EF models but absent from both live DBs: `api_keys`, `customer_payments`, `supplier_payments`, `farm_user_access`, `animal_photos`, `attachments`, and `feeds` (live name is `feed_items`). |
| View errors | **None.** All 4 views exist in `dairy farm 1` and are valid. **They are simply never queried.** `vw_upcoming_calvings` would have delivered the expected-calving and calving-reminder requirements for free. |
| Stored procedure errors | **No stored procedures exist** in either database. All business logic is in triggers (20, all valid) and application code. |
| Migration errors | **No EF migrations exist.** `DairyFarm.Api.csproj` has no `Migrations` folder and no `Microsoft.EntityFrameworkCore.Design`. `Program.cs` deliberately performs no `EnsureCreated`/`Migrate` (documented as intentional and correct for safety). Consequence: **there is no mechanism to evolve the schema** — every fix must be a hand-written SQL script. |
| Trigger reachability | All 20 triggers in `dairy farm 1` are valid but **unreachable** because the calling code does not compile. |


---

## 11. Critical Problems

### Critical — prevents application from working

1. **The ASP.NET Core backend does not compile — 49 errors.** No API can start. Root causes: 6 controllers missing `using DairyFarm.Api.Infrastructure;`, a non-generic `DbContext.Set(type)` call, two DbSet naming bugs (`Income`/`Tasks`), an undeclared `_codes` dependency, and a missing `EFCore.NamingConventions` package.
2. **The EF entity models match neither live database.** `dairy farm 1` uses `session`/`quantity_l`; `dairy_farm` uses `record_date`/`milk_liters`; the models expect `Morning`/`Evening`/`Third`/`Total`. Every module query would throw a MySQL `Unknown column` error. 14 confirmed column mismatches, 7 missing tables.
3. **The configured connection string points at the wrong database.** `.env.example` says `dairy_farm`; every code comment, the XML docs and the triggers target `dairy farm 1`. `dairy farm 1` is 100% empty (0 rows in all 55 tables).
4. **The application ships as a mock.** `services/index.ts` routes milk, breeding, health, medicines, vaccinations, feed, rations, inventory, expenses, income, customers, suppliers, tasks, notifications, dashboard and reports to `mockApi` backed by `localStorage`. **0 of 30 audited save paths reach the database.**
5. **There is no login screen, so no authenticated action is possible.** `authApi.login` is never called; `setUnauthorizedHandler` is never registered. Every `[Authorize]` endpoint — all animal writes, photo upload, QR issue/rotate, staff, API keys — is permanently unreachable. `dairy farm 1.users` also has **0 rows**.
6. **`farms` has 0 rows in both databases while `animals.farm_id` is NOT NULL with a foreign key.** Even after a successful build, every animal create would fail on FK, and `GET /api/farms` returns an empty array.
7. **API base URL port mismatch.** `.env` sets `VITE_API_BASE_URL=http://192.168.18.66:5080/api`; `launchSettings.json` binds `http://0.0.0.0:5064`. The frontend cannot reach the backend even if it ran.

### High — major feature broken

8. **Dashboard is entirely fake.** All 20 required metrics come from `mockApi.getDashboardSummary()`. The real controller does not compile and is never called. `topProducers` additionally hardcodes `daysInMilk: 180` and `status: 'Lactating'`.
9. **No RBAC enforcement.** 12 of 15 controllers use bare `[Authorize]`. The 28 `permissions` and 39 `role_permissions` rows are read by **zero lines of code**. A Worker can create animals and write finance records.
10. **No farm-level tenant isolation.** `/api/{module}?farmId=X` accepts any farm id from the client. `farm_user_access` is never queried. **Any authenticated user can read and write any farm's data** — a cross-tenant data breach in a multi-farm product.

### Medium — feature partially works

16. **Reports are mock-only.** `reportService` → `mockApi`. Five of eleven required report types (daily, weekly, mortality, calf, pregnancy) have no implementation at all.
17. **Excel import does not exist.** No `xlsx`/`SheetJS` dependency, no `FileReader`, no file input anywhere. Export (PDF/CSV/Word) is genuinely implemented but operates on mock data.
18. **Growth management (Req 9) has no frontend module** and no charting, despite the `GrowthRecord` model existing.
19. **Medication withdrawal is implemented twice and incorrectly in C#** (`quantity_used`/`milk_withdrawal_until`) while the correct `trg_treatments_withdrawal_*` triggers already exist in the live DB.
20. **Milk saleability is never enforced.** No code marks milk from an animal under withdrawal as unsaleable; the `vw_active_withdrawals` view is unused.
21. **No offline capability whatsoever.** Zero matches for `serviceWorker`, `navigator.onLine`, `indexedDB`. No sync queue, no client UUIDs, no conflict handling, no idempotency.
22. **Mobile fast-entry is 40% built.** Fast milk and fast health exist; fast breeding, fast calving and fast task entry do not. Both existing modals post to mock.
23. **Two competing customer tables** (`milk_buyers` with 3 rows in `dairy_farm`, `customers` with 0 in `dairy farm 1`) and **two mortality tables** (`animal_deaths`, `animal_mortalities`) — data-model ambiguity that must be resolved before either can be wired.
24. **Search/sort/filter (Req 29) is minimal.** No sorting parameters, no saved views, no combined-filter builder.
25. **`FarmModulesController` loads entire tables into memory.** `await set.ToListAsync()` then LINQ-to-Objects filtering — a scaling anti-pattern that will fail on real data volumes.
26. **No EF migrations exist** and no `Microsoft.EntityFrameworkCore.Design`. Every schema change must be a hand-written script.

### Low — cosmetic / non-critical

27. **Dev tooling is exposed in the product UI.** `Sidebar.tsx` ships a latency slider and an "error rate" simulator that mutate `mockConfig`; `SettingsView.tsx` ships a "Reset all mock data" control. `App.tsx:281` prints `Local DB: dairy-farm-mock-db-v1` in the footer.
28. **No HTTPS.** No `UseHttpsRedirection`, no Kestrel certificate configuration; CORS origins are all `http://`.
29. **Bundle size 2,151 kB** (544 kB gzipped) with no code splitting.
30. **`ISystemClock` obsolete warnings** (2) in `ApiKeyAuthenticationHandler.cs`.
31. **Herd name hardcoded** to "Green Dairy Farm" in `DashboardView.tsx` and the Sidebar, while `config.json` says "Punjab Pure Dairy" — inconsistent branding.
32. **`getNextId()` / `getNextTag()` still use `mockApi`** (`services/index.ts:407-408`) while the server allocates the real code from `animal_code_sequences` — the UI will preview the wrong ID.
33. **`mockSeedData` uses Unsplash stock photos** for animal and staff avatars — clearly non-production data shipped in the bundle.

11. **The generic module controller has a mass-assignment vulnerability.** `JsonSerializer.Deserialize(body, type)` binds client JSON directly onto the entity with **no field whitelist**, so any caller can overwrite `FarmId`, `Total`, or any column on any of the 27 modules.
12. **Generic DELETE performs a hard delete on history tables.** `DELETE /api/{module}/{id}` calls `_db.Remove(entity)` with no soft-delete/archive, which would erase `audit_logs`, `attachments` and `notifications` rows — directly violating Req 36 "historical records retained".
13. **No notification generation exists.** `NotificationsController` only reads and marks read. There is no `BackgroundService`/`IHostedService` anywhere, so nothing ever creates a calving-due, vaccination-due, withdrawal or milk-drop notification from the database.
14. **Milk write path is a process-local array.** `server/apiHandler.ts:21` is `const inMemoryRecords: MilkRecordRow[] = []`. All milk data is lost on server restart and never touches MySQL.
15. **Unauthenticated read exposure.** All 9 animal/farm/shed/group/breed read endpoints and the photo GET are public with no `[Authorize]`.

---

## 12. What Is Actually Done

Genuinely working end-to-end today: **almost nothing that touches the database.** What is real:

1. **Frontend production build.** `npm run build` ✓, `tsc --noEmit` ✓, 0 TS errors, 0 vulnerabilities across 338 packages.
2. **A very large, well-designed UI.** 25 components, 12 navigation modules, ~380 KB of TSX. Responsive with a mobile drawer and bottom nav. Recharts visualisations. This is real, polished work.
3. **A genuinely good calculation library.** `dairyCalculations.js` (25 KB) with a `CalculationAuditTrail` that records every substituted value, refuses to substitute unsupplied inputs, and returns `INSUFFICIENT_DATA` rather than a fabricated number. Plus 6 focused TS calculation services. Above-average engineering — it just runs on mock inputs.
4. **Genuine PDF/CSV/Word export.** `jsPDF` + `jspdf-autotable` + `Blob` downloads. Real, working file generation.
5. **Correct JWT/auth *infrastructure* (server side).** PBKDF2 hashing, timing-equalised failures, null-hash rejection, rehash upgrade, HMAC-SHA256 signing, issuer/audience/lifetime validation, fail-fast config, `sessionStorage` (never `localStorage`) token storage, 401 auto-clear. All of this would work the moment the build is fixed.
6. **A genuinely good photo-upload implementation.** Magic-byte sniffing (rejects a PNG declared as `image/jpeg`), 2 MB cap with a readable 413, `RequestSizeLimit`, transaction-wrapped LONGBLOB insert. The best-engineered single feature in the backend.
7. **A thoughtful database design.** 20 valid triggers including `trg_animals_no_delete` (hard delete blocked at the DB), parentage validation (blocks self-parent and dam==sire), automatic status-history auditing, withdrawal computation, landed-cost and milk-sale totals. `UNIQUE(farm_id, animal_code)` correctly prevents duplicate animal IDs.
8. **4 unused SQL views** (`vw_daily_milk_summary`, `vw_upcoming_calvings`, `vw_active_withdrawals`, `vw_active_herd_summary`) that already solve several reporting requirements.
9. **A correct animal API design.** Read/write split, `[Authorize]` on writes only, status changes routed through `PATCH .../status` so the trigger records them, explicit rejection of `status` in `PUT` with a pointer to the right endpoint, 409 on duplicate code, animal-code allocation under `SELECT ... FOR UPDATE` inside a retry-execution-strategy transaction, and correct connection-pool hygiene (clearing `@app_user_id` before release).
10. **A clean QR implementation.** Cryptographically random tokens stored in `animal_identifications`, a public scan-resolve endpoint, and a documented removal of a previous version that had rendered a **fabricated animal** under a "LIVE ANIMAL DIGITAL PASSPORT" heading.
11. **Correct V1 scope discipline.** No PLC, SCADA, sensor, MQTT, cooling, AI-CCTV or UWB/BLE code.

**Working but only over mock data:** every UI module, every calculation, every export.

---

## 13. What Is NOT Done

- **The backend does not compile.** 49 errors. No API exists at runtime.
- **No database is connected.** The EF models match neither `dairy_farm` nor `dairy farm 1`.
- **No login screen.** No authenticated action is reachable.
- **No business module persists to MySQL.** 0 of 30 save paths verified.
- **No RBAC.** 28 permissions and 39 role-permissions are read by zero code.
- **No farm-level tenant isolation.** Cross-farm read/write is unrestricted.
- **No notification generation.** No background service of any kind.
- **No Excel import.** No parser, no file input, no validation-before-commit.
- **No offline mode.** No service worker, no IndexedDB, no sync queue, no conflict handling.
- **No database backup or restore procedure.**
- **No HTTPS.**
- **No multi-farm UI** (farm switcher, shed/group creation).
- **No user/RBAC management screen.**
- **No growth module, no weight/height charts.**
- **No lactation engine** (DIM, peak, lactation number, lactation totals).
- **No milk-drop detection** and no configurable threshold.
- **No expected-calving computation.**
- **No medicine saleability flag** on milk.
- **No ration engine** and no feed-cost-per-liter server calculation.
- **No stock ledger** (opening → purchases → consumption → closing).
- **No AR/AP ledgers**, credit periods, or outstanding balances.
- **No animal purchase/sale workflow** (quarantine, documents, landed cost, profit/loss).
- **No post-mortem notes**, no disease master CRUD.
- **No vaccination due-date computation** or reminders.
- **No 5 of 11 report types** (daily, weekly, mortality, calf, pregnancy).
- **No sorting, no saved views, no combined filters.**
- **No general attachment system** (only animal photos).
- **No audit trail for animals, milk, breeding, health, medicines, finance, users or permissions** — only the generic V1 module controller, which does not compile and would fail on column mismatch anyway.

---

## 14. Recommended Implementation Order

*(Recommendation only — nothing has been implemented.)*

**Phase 0 — Make the system run (nothing else matters until this is done)**
1. Fix the 6 build-error classes: add the missing `using` to 6 controllers; fix the 2 `DbContext.Set(type)` calls; correct the `Income`/`Tasks` DbSet names; inject `AnimalCodeGenerator` as `_codes`; add the `EFCore.NamingConventions` package for `UseSnakeCaseNamingConvention`.
2. Re-run `dotnet build` → 0 errors.
3. **Decide the single source-of-truth database.** This is a business decision, not a technical one, and everything downstream depends on it.
4. Align the EF models and `001_complete_schema.sql` to that database, using **additive** `CREATE TABLE IF NOT EXISTS` / `ALTER TABLE ... ADD COLUMN` only. **Do not drop, truncate, or modify any existing data**, including the 1 row in `companies` and the 5 rows in `dairy_farm.animals`.
5. Reconcile the 14 column mismatches and 7 missing tables; use the existing correct triggers instead of duplicating their logic in C#.
6. Seed the reference data the FKs require: at least one `company`, one `farm`, breeds, and the 6 roles. `farms` being empty blocks every insert.
7. Align the frontend base URL with the backend's actual bound port.

**Phase 1 — Close the loop for Animals (the one module already architected correctly)**
8. Build a login screen; call `authApi.login`; register `setUnauthorizedHandler`.
9. Create the first Owner account (the bootstrap service already exists and is properly guarded).
10. End-to-end verify: create → reload → edit → status change → photo → QR issue → QR scan.
11. Add permission enforcement to the animal endpoints using the existing `permissions` / `role_permissions` tables.

**Phase 2 — Convert modules from mock to real, one at a time**
12. Wire **Milk** (highest farm value) to `/api/milk-records`, using the real `session`/`quantity_l` shape. Remove the `mockApi` fallback so failures are visible.
13. Wire **Health, Treatments, Medicines, Vaccinations** — this is where withdrawal, stock decrement and saleability live.
14. Wire **Breeding, Pregnancy, Calving, Calves** and add gestation (+280 d) expected-calving. Consider the existing `vw_upcoming_calvings` view.
15. Wire **Feed, Rations, Consumption, Inventory** and build the stock ledger.
16. Wire **Finance**: expenses, income, customers, suppliers, payments. Resolve the `milk_buyers` vs `customers` and `animal_deaths` vs `animal_mortalities` ambiguity first.
17. Wire **Purchases, Sales, Mortality**.

**Phase 3 — Cross-cutting correctness**
18. Implement farm-level tenant isolation using `farm_user_access` on **every** endpoint; stop trusting a client-supplied `farmId`.
19. Add a field whitelist to the generic module controller; convert its DELETE to soft-delete/archive.
20. Fix the audit-trail column mismatch; add audit writes for animals, milk, breeding, health, medicines, finance, users and permissions.
21. Add a `BackgroundService` that generates notifications from calving dates, vaccination due dates, active withdrawals and milk-drop detection.
22. Add the configurable milk-drop percentage threshold and wire `config.json` thresholds to the server.


---

## 15. Final Completion Matrix

Percentages reflect **verified working end-to-end state**, not code or UI volume. Because the backend does not compile and no module persists to MySQL, the ceiling for every data-dependent area is low. Areas that are genuinely strong (UI, calculations, export, auth/DB *design*) are scored on what they actually deliver.

| Area             | Completion |
| ---------------- | ---------: |
| Dashboard        |       5% |
| Animals          |      15% |
| Milk             |       5% |
| Breeding         |       5% |
| Calving/Calves   |       2% |
| Health           |       5% |
| Medication       |       3% |
| Vaccination      |       3% |
| Feed             |       5% |
| Inventory        |       5% |
| Purchases        |       2% |
| Sales            |       2% |
| Mortality        |       3% |
| Finance          |       5% |
| Customers        |       3% |
| Suppliers        |       3% |
| Tasks            |       5% |
| Notifications    |       3% |
| Reports          |       8% |
| Import/Export    |      15% |
| Multi-Farm       |       3% |
| RBAC             |       3% |
| QR               |       8% |
| Offline          |       0% |
| Audit Trail      |       2% |
| Attachments      |       5% |
| Security         |      12% |
| API Architecture |      20% |

**Scoring notes:**
- **Animals 15%** — highest data score: read + write + status + photo + QR are all correctly architected, validated and coded. Blocked solely by the build failure, the wrong-port config and the missing `animal_photos` table.
- **API Architecture 20%** — the REST design, `ApiResponse` envelope, Swagger, JWT policy scheme and module dictionary are genuinely sound. Penalised because the API cannot compile or run, and `FarmModulesController` uses in-memory filtering.
- **Security 12%** — PBKDF2, JWT, API-key hashing and `sessionStorage` token handling are all correct. No login screen, no HTTPS, no backup, no working RBAC.
- **Import/Export 15%** — export is real (PDF/CSV/Word) but from mock data; import is 0%.
- **Offline 0%** — zero implementation, verified by search.
- **Everything else ≤ 8%** — the UI and calculation work exists and is competent, but no path reaches the database.

---

# OVERALL REAL IMPLEMENTATION COMPLETION: 6%

**Basis for this number:** Of the 42 requirements, **exactly one is marked COMPLETE (Req 41) and it is a negative scope requirement** — the correct answer there is to *not* build PLC/SCADA/sensor/MQTT/AI-CCTV/UWB code, and none exists. **Zero functional requirements are complete end-to-end.** The frontend compiles and ships a large, polished UI, and a meaningful amount of backend *design* (auth, triggers, views, photo service, animal API) is sound — but the backend produces **49 compile errors and no runnable API**, the EF models match **neither** live database, there is **no login screen**, and **0 of 30 audited save paths reach MySQL**. The shipped product is a high-fidelity mock with a non-compiling real API behind it.

This percentage measures working implementation, not the amount of code or UI that exists.
