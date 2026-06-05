# Nokia Scrap & Waste Management System

Production-grade internal web application for Nokia's manufacturing facility to manage scrap and waste declarations, approvals, ledger entries, and live Excel reporting.

---

## Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 15 running locally (or connection URL)

### 1. Install dependencies

```bash
npm install          # root (concurrently)
npm --prefix server install
npm --prefix client install
```

### 2. Configure environment

```bash
cp server/.env.example server/.env
# Edit server/.env — set DATABASE_URL at minimum
```

Minimum required:
```
DATABASE_URL="postgresql://postgres:password@localhost:5432/nokia_scrap"
JWT_SECRET="any-long-random-string"
JWT_REFRESH_SECRET="another-long-random-string"
```

### 3. Set up the database

```bash
cd server
npx prisma migrate dev --name init    # creates tables
npx prisma db seed                    # creates default accounts
```

### 4. Run the app

```bash
npm run dev          # starts both server (port 4000) and client (port 5173)
```

Open: **http://localhost:5173**

---

## Default Accounts (after seed)

| Emp No  | Role              | Password    |
|---------|-------------------|-------------|
| EMP001  | Admin             | nokia@123   |
| EMP002  | Facility Manager  | nokia@123   |
| EMP003  | Zone Manager      | nokia@123   |
| EMP004  | Dept Head         | nokia@123   |
| EMP005  | Employee (SMT)    | nokia@123   |

---

## Application Structure

```
scrap-mgmt/
  client/           React 18 + Vite + Tailwind + Recharts
  server/           Node.js + Express + Prisma + PostgreSQL
    prisma/         Schema + migrations + seed
    src/
      routes/       API route handlers
      services/     Business logic (declaration, ledger, excel, graph)
      middleware/   Auth, RBAC, validation, error handler
      jobs/         Nightly Excel export cron
```

---

## API Endpoints

Base: `http://localhost:4000/api/v1`

| Method | Path | Description |
|--------|------|-------------|
| POST | /auth/login | Login |
| POST | /auth/refresh | Refresh token |
| GET | /declarations | List declarations (filtered) |
| POST | /declarations | Create declaration |
| PATCH | /declarations/:id/submit | Submit draft |
| PATCH | /declarations/:id/approve | Approve (role-gated) |
| GET | /declarations/export/excel | Download Excel |
| GET | /dashboard/summary | KPI metrics |
| GET | /dashboard/ledger | Ledger data for charts |
| GET | /dashboard/trends | 30-day trend |
| GET | /live/ledger | Power Query endpoint |
| GET | /live/declarations | Power Query endpoint |
| GET | /live/summary | Power Query endpoint |
| POST | /admin/excel/push-to-onedrive | Manual OneDrive push |
| GET | /admin/excel/export-log | Export history |

---

## Live Excel / Power Query

See **http://localhost:4000/powerquery-setup** for step-by-step instructions on connecting Excel's Power Query to the live data endpoints.

All `/live/*` endpoints return bare JSON arrays (Power Query compatible) and require a Bearer token header.

---

## OneDrive Integration

Set these in `server/.env`:
```
GRAPH_TENANT_ID=
GRAPH_CLIENT_ID=
GRAPH_CLIENT_SECRET=
GRAPH_SHAREPOINT_SITE_ID=
GRAPH_DRIVE_ID=
GRAPH_FOLDER_PATH=/Nokia Scrap Reports
```

When a declaration reaches COMPLETED status, the system auto-generates an Excel report and uploads it to the configured SharePoint folder. A nightly cron job at 23:55 also regenerates and uploads.

---

## Declaration Approval Flow

```
DRAFT → SUBMITTED → ZONE_APPROVED → DEPT_APPROVED → IREP_AUTHORIZED → SECURITY_AUTHORIZED → COMPLETED
```

When status reaches COMPLETED:
1. Ledger entries created for each line item
2. Excel report auto-generated and pushed to OneDrive
3. Action logged to audit_logs

---

## Tech Stack

- **Frontend**: React 18, React Router v6, Recharts, Tailwind CSS, Axios
- **Backend**: Node.js 20, Express.js, Prisma ORM, PostgreSQL 15
- **Auth**: JWT (8h access + 7d refresh)
- **Excel**: ExcelJS + Microsoft Graph API (OneDrive upload)
- **Scheduling**: node-cron
- **Validation**: Zod (server), React Hook Form (client)
