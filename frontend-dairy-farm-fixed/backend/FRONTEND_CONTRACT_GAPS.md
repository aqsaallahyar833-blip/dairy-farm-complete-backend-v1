# Frontend Contract Gap Report

**Generated:** after the backend reached `Build succeeded / 0 errors / 0 warnings`
against the 49-table canonical schema in `dairy farm 1`.

**Scope:** backend routes only. No frontend file was read, modified, or executed.
Every claim is traced to backend source or to an observed HTTP result.

**Canonical database:** `dairy farm 1` (49 tables).
**Legacy database:** `dairy_farm` (51 tables) — protected, untouched.

---

## A. Routes returning 404 "Unknown module" (intentional)

These are **not present** in `FarmModulesController.Types`. Because the generic
endpoint resolves the route through that map first, each returns
`404 {"success":false,"message":"Unknown module."}`. **Runtime verified** with an
authenticated Owner.

| Route | Old entity | Status | Nearest canonical table |
|---|---|---|---|
| `customer-payments` | `CustomerPayment` | no such table | `milk-buyers` + `milk-sales` |
| `supplier-payments` | `SupplierPayment` | no such table | `suppliers` + `feed_transactions` |
| `growth-records` | `GrowthRecord` | no such table | *(none — no growth/weight tracking exists)* |
| `customers` | `Customer` | **renamed** to `milk-buyers` | `milk_buyers` |
| `feed-purchases` | `FeedPurchase` | **renamed** to `feed-transactions` | `feed_transactions` |

**The last two are a rename, not a deletion.** The old route name is gone; the
new route name serves the consolidated table. `growth-records` is the only one
with no replacement at all — a weight/growth feature would need a new table and
a schema change.

---

## B. Routes remapped to a different canonical table

Same URL, **different entity and different JSON shape**. These return `200` but
the payload fields will not match what the old entity produced.

| Route | Was | Now | Shape change to expect |
|---|---|---|---|
| `feeds` | `Feed` | `FeedItem` | catalogue item; **stock is no longer a column** — derived from `feed_transactions`. |
| `feed-transactions` | `FeedPurchase` | `FeedTransaction` | signed ledger row: `transaction_type` (`PURCHASE`/`CONSUMPTION`/`ADJUSTMENT`) + `quantity_signed` + `stock_after`, instead of a purchase header + line items. |
| `milk-buyers` | `Customer` | `MilkBuyer` | milk-buyer fields only. No generic customer/address model. |
| `vaccinations` | `Vaccination` | `VaccinationRecord` | `record_date` + `next_due_date` instead of the old administered/next fields. |
| `health-events` | `HealthEvent` | `HealthRecord` | unified health table; `recovery_date` nullable, drives the open-case test. |
| `mortalities` | `Mortality` | `AnimalMortality` | — |
| `expenses` | `Expense` | `FinanceTransaction` | **both** `expenses` and `income` now read the **same** table, discriminated by `transaction_type`. Filtering is now the caller's job. |
| `income` | `Income` | `FinanceTransaction` | same table as above. |
| `rations` | `Ration` | `RationPlan` | plan header; `calf_min_days`–`calf_max_days` replaces the old fields. |
| `ration-items` | `RationItem` | `RationPlanItem` | — |

Newly present in the map (previously unmapped): `alerts`, `inventory-items`,
`inventory-transactions`, `finance-categories`, `feed-transactions`, `calves`,
`milk-buyers`.


---

## C. DTO / field renames on dedicated controllers

Endpoints are unchanged, but **request/response property names** moved to the
canonical column names.

| Endpoint | Old name | Canonical name |
|---|---|---|
| `POST/PUT /api/animals` | `dob` | `dateOfBirth` |
| `POST/PUT /api/animals` | `purchaseDate` | `acquisitionDate` |
| animal responses | `photo` | `photoUrl` |
| animal identifiers | `animal_identifications` rows | flat `tagNumber` / `rfidNumber` / `qrToken` |
| `POST /api/auth/login` | `email` | `username` |

`GET /api/animals/{id}/identifications` is **preserved** and still returns a list;
it now projects the canonical animal columns instead of reading a separate table.

---

## D. Authorization gaps found during smoke testing

**Highest-priority item. Pre-existing — not introduced by the schema repair.**
No `[Authorize]` attribute is present on these controllers, and they were
confirmed to serve **unauthenticated HTTP 200**:

| Controller | Observed unauthenticated result |
|---|---|
| `AnimalsController` | `GET /api/animals` → **200** `[]` |
| `AnimalsController` | `GET /api/animals/1` → 404 (query executed, no row) |
| `BreedsController` | `GET /api/breeds` → **200** with real seed data |
| `FarmsController` | `GET /api/farms` → **200** `[]` |
| `ShedsController` | `GET /api/sheds` → **200** `[]` |
| `AnimalGroupsController` | `GET /api/animal-groups` → **200** `[]` |

All other controllers carry `[Authorize]` and correctly returned `401`.

Not a gap, by design:
- `HealthController` — liveness/readiness, intentionally public.
- `GET /api/animals/qr/{token}` — explicitly `[AllowAnonymous]` so a QR tag can be
  scanned before sign-in.

**Frontend dependency was NOT checked** (no frontend file was read), so whether
adding `[Authorize]` would break the app cannot be asserted here. This needs an
explicit product decision, not a silent fix.

---

## E. Summary

1. **Blocking:** three routes now 404 by design (A) — `growth-records` has no
   replacement at all.
2. **Breaking:** `customers`, `feed-purchases`, `feeds`, `vaccinations` return 200
   with a different payload shape (B).
3. **Breaking:** `expenses` and `income` are now the same table (B).
4. **Breaking:** several animal and login field renames (C).
5. **Security:** five controllers serve data without authentication (D).
