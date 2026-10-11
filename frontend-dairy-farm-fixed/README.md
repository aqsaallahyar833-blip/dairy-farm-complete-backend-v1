# Punjab Pure Dairy Management System

React + TypeScript + Vite frontend for the Punjab Pure Dairy management
system, backed by the ASP.NET Core API in [`backend/`](./backend/).

## Current status

This repository is suitable for staging and client user-acceptance testing.
It is not a hosting-provider-specific production deployment package. Before
final handover, configure the production API, database, HTTPS, CORS origins,
backups, monitoring, and client accounts.

The application uses real authenticated API data. When the backend does not
support an operation, the UI shows an unavailable state instead of inventing
records or totals. See [`backend/FRONTEND_CONTRACT_GAPS.md`](./backend/FRONTEND_CONTRACT_GAPS.md)
for known API scope gaps.

## Local development

### 1. Install frontend dependencies

```powershell
npm install
```

### 2. Configure the frontend

Copy [`.env.example`](./.env.example) to `.env` and set:

```text
VITE_API_BASE_URL=http://127.0.0.1:5064/api
VITE_QR_BASE_URL=http://<farm-lan-address>:3000
```

`VITE_*` values are public and are compiled into the browser bundle. Never
place database passwords, JWT signing keys, API keys, or other secrets in
them.

### 3. Configure and run the backend

Set the required backend environment variables described in
[`backend/.env.example`](./backend/.env.example), then run:

```powershell
dotnet restore backend/DairyFarm.Api.csproj
dotnet build backend/DairyFarm.Api.csproj
dotnet run --project backend/DairyFarm.Api.csproj
```

The API refuses to start when its database connection string, JWT settings, or
CORS origins are missing. Owner creation is an explicit bootstrap operation;
normal startup never seeds an account or resets data.

### 4. Run the frontend

```powershell
npm run dev
```

Open `http://localhost:3000`.

## Validation commands

```powershell
npm run lint
npm run build
node testSuite.js
dotnet build backend/DairyFarm.Api.csproj
```

The current regression suite contains 105 assertions covering calculations,
data sufficiency, validation behavior, and protection against fabricated
figures.

## Production build

Build the static frontend with:

```powershell
npm run build
```

Deploy the generated `dist/` directory behind HTTPS and set
`VITE_API_BASE_URL` to the production ASP.NET Core API before building.
Configure the API's `Cors:AllowedOrigins` to contain only the deployed
frontend origin. Do not expose Development Swagger publicly.

## Handover checklist

- [ ] Production API and frontend URLs configured
- [ ] HTTPS certificate and secure headers configured
- [ ] Production database created or approved
- [ ] Database backup and restore verified
- [ ] Owner and staff accounts created securely
- [ ] API CORS restricted to the frontend origin
- [ ] JWT signing key supplied outside source control
- [ ] Full browser user-acceptance testing completed
- [ ] Known unsupported operations reviewed with the client
- [ ] Admin guide, backup procedure, and support contacts delivered

## Scope

The system covers authenticated dairy-farm operations including animals,
milk, breeding, pregnancy, health, feed, inventory, finance, customers,
suppliers, tasks, notifications, and reports according to the current API
contract. PLC, SCADA, MQTT, sensor, AI-camera, and offline-sync features are
outside the current release scope.
