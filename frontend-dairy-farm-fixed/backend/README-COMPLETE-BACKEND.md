# Dairy Farm Management Backend — Complete V1

This backend implements the Version 1 dairy-management scope supplied in the Software Requirements Specification. It is intentionally independent of PLC, SCADA, sensors, MQTT, AI CCTV and other automation.

## Stack

- ASP.NET Core / .NET 10
- Entity Framework Core
- MySQL 8.4+
- JWT bearer authentication
- Optional X-API-Key authentication for integrations
- Swagger/OpenAPI in Development
- REST API
- Company → Farm → Shed/Group data model
- Audit logging and role-based access foundations

## Database

The supplied SQL creates `dairy_farm` and the V1 tables.

Run:

```sql
SOURCE backend/SQL/001_complete_schema.sql;
```

For an existing production database, review the script before execution. It uses `CREATE TABLE IF NOT EXISTS` but does not automatically alter incompatible existing tables.

## Configuration

Do not put passwords or JWT signing keys in source control.

Required environment variables:

```text
ConnectionStrings__DairyFarm=Server=localhost;Port=3306;Database=dairy_farm;User ID=dairy_app;Password=YOUR_PASSWORD;
Jwt__Key=GENERATE_A_RANDOM_SECRET_AT_LEAST_32_BYTES
Jwt__Issuer=PunjabPureDairy.Api
Jwt__Audience=PunjabPureDairy.Frontend
Jwt__ExpiryMinutes=60
```

CORS is configured for the existing React development ports 3000 and 5173.

## Initial Owner

Set these environment variables only for the explicit bootstrap command:

```text
INITIAL_OWNER_EMAIL=owner@yourfarm.pk
INITIAL_OWNER_PASSWORD=<12+ character password>
INITIAL_OWNER_NAME=Farm Owner
INITIAL_OWNER_COMPANY_ID=1
```

Then:

```powershell
dotnet run -- --bootstrap-owner
```

The bootstrap is never executed during ordinary startup.

## Run

From `backend`:

```powershell
dotnet restore
dotnet build
dotnet run
```

For the existing frontend, set:

```text
VITE_API_BASE_URL=http://localhost:5064/api
```

The actual port can be changed with `ASPNETCORE_URLS`.

## Authentication

Normal frontend authentication:

```http
POST /api/auth/login
Content-Type: application/json

{"email":"owner@yourfarm.pk","password":"your-password"}
```

Use the returned bearer token:

```http
Authorization: Bearer <token>
```

Integration clients may use:

```http
X-API-Key: dfk_...
```

API keys are stored as SHA-256 hashes. The raw key is returned only once when created.

## API Areas

### Core / identity
- `GET /health`
- `GET /api/health`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/staff`
- `POST /api/staff`
- `PUT /api/staff/{id}/roles`
- `PATCH /api/staff/{id}/status`
- `GET /api/api-keys`
- `POST /api/api-keys`
- `POST /api/api-keys/{id}/revoke`

### Farm / animal
Existing frontend-compatible endpoints are retained:
- `/api/animals`
- `/api/breeds`
- `/api/farms`
- `/api/animal-groups`
- `/api/sheds`
- `/api/animals/{id}/identifications`
- `/api/animals/{id}/status-history`
- `/api/animals/{id}/photo`
- `/api/animals/{id}/qr`
- `/api/animals/qr/{token}`

### Dashboard / reporting
- `GET /api/dashboard?farmId=1`
- `GET /api/reports/farm?farmId=1&from=2026-01-01&to=2026-01-31`
- `GET /api/reports/milk?farmId=1&from=2026-01-01&to=2026-01-31`

### V1 modules

Each module supports authenticated GET/GET-by-id/POST/PUT and owner/manager DELETE where appropriate:

- `/api/milk-records`
- `/api/lactations`
- `/api/breeding-events`
- `/api/pregnancies`
- `/api/calvings`
- `/api/growth-records`
- `/api/health-records`
- `/api/diseases`
- `/api/medicines`
- `/api/treatments`
- `/api/vaccinations`
- `/api/feeds`
- `/api/rations`
- `/api/ration-items`
- `/api/feed-consumption`
- `/api/feed-purchases`
- `/api/animal-purchases`
- `/api/animal-sales`
- `/api/mortalities`
- `/api/expenses`
- `/api/income`
- `/api/customers`
- `/api/milk-sales`
- `/api/customer-payments`
- `/api/suppliers`
- `/api/supplier-payments`
- `/api/tasks`
- `/api/notifications`
- `/api/attachments`
- `/api/audit-logs`

List endpoints support `farmId`, `search`, `from`, `to`, `page` and `pageSize` where applicable.

## Important V1 rules implemented

- Animal IDs remain permanent; there is no animal delete endpoint.
- Negative milk, feed, expense and income amounts are rejected.
- A dead animal cannot be sold.
- Animal sale changes the animal status to `SOLD`.
- Mortality changes the animal status to `DEAD`.
- Milk total is calculated from morning + evening + third milking.
- Milk sale total is calculated from quantity × price.
- Animal purchase landed cost is calculated from purchase + transport + veterinary cost.
- Medicine stock is reduced when a treatment consumes medicine.
- Notifications support individual read and mark-all-read operations.
- Audit rows record create/update/delete actions from the V1 module controller.
- QR tokens use cryptographically random values and are separate from the human-readable Animal ID.
- Historical animal records are preserved through lifecycle statuses.
- API keys are hashed and revocable.
- No production credential or secret is hard-coded.

## Scope boundary

This package does not implement PLC, SCADA, MQTT, environmental sensors, automated cooling, AI CCTV, UWB/BLE gateways or other automation. The REST/API-key architecture leaves a controlled integration boundary for future versions.

## Offline mobile

The backend exposes idempotent numeric records and permanent animal IDs suitable for a future offline synchronization layer. A full client-side offline queue/conflict resolver belongs in the mobile/frontend layer; it is not silently represented as server-side offline behavior.

## API documentation

In Development, Swagger is available at:

```text
/swagger
```

Do not expose Development Swagger publicly in production without appropriate access controls.
