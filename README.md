# Offline Field Issue Tracker

A robust, offline-first web application designed for field workers and infrastructure coordinators. The system enables reliable reporting of critical infrastructure failures (water points, solar equipment, safety hazards) in remote areas with intermittent or zero internet connectivity.

---

## Table of Contents
- [Project Overview](#project-overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Offline & Synchronization Strategy](#offline--synchronization-strategy)
- [Idempotency & Duplicate Prevention](#idempotency--duplicate-prevention)
- [Status Workflow & State Machine](#status-workflow--state-machine)
- [Conflict Handling Strategy](#conflict-handling-strategy)
- [System Requirements & Prerequisites](#system-requirements--prerequisites)
- [Setup & Running Locally](#setup--running-locally)
  - [1. Database Configuration](#1-database-configuration)
  - [2. Backend Setup](#2-backend-setup)
  - [3. Frontend Setup](#3-frontend-setup)
- [Demonstration & Seed Data](#demonstration--seed-data)
- [Running Automated Tests](#running-automated-tests)
- [Manual QA Checklist](#manual-qa-checklist)
- [Assumptions & Design Decisions](#assumptions--design-decisions)
- [Known Limitations](#known-limitations)
- [What I Would Improve With More Time](#what-i-would-improve-with-more-time)
- [AI Development Tool Disclosure](#ai-development-tool-disclosure)

---

## Project Overview

In rural and developing infrastructure contexts, field technicians often encounter equipment breakdowns in low-connectivity areas where conventional cloud-first apps crash or silently lose data.

The **Offline Field Issue Tracker** solves this problem by using an **offline-first local persistence architecture**. Reports are immediately committed to browser **IndexedDB** storage before any network request is attempted. When connectivity is restored, an automated synchronization service transfers pending records to the **FastAPI + PostgreSQL** backend idempotently, guaranteeing zero data loss and preventing duplicate entries.

---

## Key Features

- **True Offline First:** Full create-and-view functionality while completely disconnected.
- **Client-Generated UUIDs:** Guarantees stable entity identity across network retries.
- **Automatic & Manual Synchronization:** Triggers on application launch, browser `online` events, and manual retry buttons.
- **Clear Sync State Indicators:** Visual badges for `PENDING`, `SYNCING`, `SYNCED`, and `FAILED` states with actionable error tooltips.
- **Enforced Status Workflow:** Strict state machine in the backend preventing illegal status jumps.
- **Audit Trail & History:** Records `CREATED`, `SYNCED`, `STATUS_CHANGED`, and `SYNC_FAILED` events.
- **Dual Role Simulation:** Field Worker (report creation, sync monitoring) vs Coordinator (status transitions, audit review).
- **GPS & Location Presets:** HTML5 Geolocation with fallback manual entry and realistic Ethiopian regional presets (Addis Ababa, Adama, Hawassa, Bahir Dar, Dire Dawa).
- **Comprehensive Automated Tests:** 100% passing test suites across both backend (pytest) and frontend (vitest).

---

## Architecture

The system is organized into clean, decoupled layers:

```text
React TypeScript Frontend (Vite)
       │
       ▼
Local Persistence Layer (IndexedDB: offline_tracker_db)
       │
       ▼
Synchronization Service (Automatic & Manual Retry)
       │ HTTP / REST
       ▼
FastAPI Backend (Validation, Workflow Engine, Idempotency)
       │
       ▼
SQLAlchemy ORM
       │
       ▼
PostgreSQL Database (reports & report_history tables)
```

### Component Responsibilities:
1. **Frontend (`frontend/src/`):**
   - `db/indexedDB.ts`: Native IndexedDB wrapper managing local store, pending queues, and local status updates.
   - `services/syncService.ts`: Mutex-controlled sync loop that detects online/offline transitions, dispatches reports, and merges server state.
   - `services/api.ts`: Typed REST client with configurable timeouts and error normalization.
   - `components/`: Modular React components styled with clean enterprise CSS.

2. **Backend (`backend/app/`):**
   - `models/`: SQLAlchemy declarative models for `Report` and `ReportHistory`.
   - `schemas/`: Pydantic V2 schemas enforcing strict bounds on coordinates, category types, and UUID validity.
   - `services/status_service.py`: Centralized workflow transition validation.
   - `services/report_service.py`: Business logic, idempotent creation, and audit logging.
   - `api/reports.py`: Clean REST endpoints (`/api/reports`, `/api/reports/{id}/sync`, `/api/reports/{id}/status`, `/api/reports/{id}/history`).

---

## Offline & Synchronization Strategy

### 1. Offline Persistence
When a field worker fills out a report:
1. A **UUID v4** is generated immediately in the browser.
2. The report is written to **IndexedDB** with `sync_status = 'PENDING'`.
3. If the user reloads the browser, restarts their laptop, or navigates away, the report remains safely stored in IndexedDB.
4. No reports are stored in volatile memory or localStorage.

### 2. Synchronization Flow
```text
Create report locally
      ↓
Generate client UUID v4
      ↓
Save to IndexedDB (sync_status = PENDING)
      ↓
Is online?
   ├── No  ─→ Wait for connection / user retry
   └── Yes ─→ Send to POST /api/reports/{id}/sync
                 │
           ┌─────┴─────┐
        Success      Failure
           │           │
           ▼           ▼
      Set SYNCED   Set FAILED + save error message
```

### 3. Trigger Points
- **On App Startup:** Automatically scans IndexedDB for any pending/failed records.
- **On Browser `online` Event:** Listens to `window.addEventListener('online')` to immediately start background sync.
- **On User Demand:** Manual "Sync" button in the header and individual "Retry" buttons on cards.

---

## Idempotency & Duplicate Prevention

Network interruptions often occur after the server receives a request but before the client receives the 200 OK response. Retrying without idempotency results in duplicate records.

**How this system guarantees idempotency:**
1. The **client generates the UUID** (`id: string`) prior to submission.
2. The server uses this UUID as the primary key in PostgreSQL (`reports.id`).
3. When `/api/reports` or `/api/reports/{id}/sync` receives a submission:
   - It queries `db.query(Report).filter(Report.id == report_data.id).first()`.
   - If found, it **returns the existing report with 200 OK** (`is_duplicate: true`) and skips duplicate row insertion.
   - If not found, it inserts the record and logs the initial `CREATED` and `SYNCED` history entries.

---

## Status Workflow & State Machine

The status workflow follows a unidirectional lifecycle enforced on the backend:

```text
       ┌───────────┐
       │   DRAFT   │
       └─────┬─────┘
             │
             ▼
       ┌───────────┐
  ┌───►│ SUBMITTED │───┐
  │    └─────┬─────┘   │
  │          │         │
  │          ▼         │
  │    ┌───────────┐   │
  │    │ ASSIGNED  │───┼───► ┌───────────┐
  │    └─────┬─────┘   │     │ REJECTED  │ (Terminal)
  │          │         │     └───────────┘
  │          ▼         │
  │    ┌───────────┐   │
  │    │IN_PROGRESS│───┘
  │    └─────┬─────┘
  │          │
  │          ▼
  │    ┌───────────┐
  │    │ RESOLVED  │ (Terminal)
  │    └───────────┘
```

### Allowed Transitions:
- `DRAFT` → `SUBMITTED`
- `SUBMITTED` → `ASSIGNED`, `REJECTED`
- `ASSIGNED` → `IN_PROGRESS`, `REJECTED`
- `IN_PROGRESS` → `RESOLVED`, `REJECTED`
- `RESOLVED` → Terminal (no transitions allowed)
- `REJECTED` → Terminal (no transitions allowed)

Any invalid transition (such as jumping from `SUBMITTED` directly to `RESOLVED` or modifying a `RESOLVED` issue) returns `HTTP 400 Bad Request` with an explanatory error payload.

---

## Conflict Handling Strategy

In this field tracking scenario:
1. **Server-Authoritative Status:** Once a report has been synchronized, server-side coordinator decisions are authoritative.
2. **Drafts are Local:** While in local draft/pending status, the field technician can modify or resubmit their report.
3. **No Unsynced Overwrite:** When the frontend syncs and retrieves updated reports from the server, it preserves any local records that are in `PENDING` or `FAILED` state to ensure in-flight work is never clobbered.
4. **No Arbitrary Editing of Submitted Tickets:** Once an issue is in the coordinator pipeline, changes must occur through formal status transitions with audit trail history entries.

---

## System Requirements & Prerequisites

- **Python:** 3.12+
- **Node.js:** 20+
- **PostgreSQL:** 14+ (tested on PostgreSQL 18)

---

## Setup & Running Locally

### 1. Database Configuration

Create the PostgreSQL database (if not already created):
```bash
psql -U postgres -c "CREATE DATABASE offline_issue_tracker;"
psql -U postgres -c "CREATE DATABASE offline_issue_tracker_test;"
```

Configure your `.env` file in the project root:
```env
DATABASE_URL=postgresql://postgres:<your_password>@localhost:5432/offline_issue_tracker
TEST_DATABASE_URL=postgresql://postgres:<your_password>@localhost:5432/offline_issue_tracker_test
DB_USER=postgres
DB_PASSWORD=<your_password>
DB_HOST=localhost
DB_PORT=5432
DB_NAME=offline_issue_tracker
PORT=8000
```

### 2. Backend Setup

From the repository root:

```bash
# Activate virtual environment (Windows PowerShell)
.venv\Scripts\activate

# Install dependencies
pip install -r backend/requirements.txt

# Run the backend server
python -m uvicorn app.main:app --app-dir backend --reload --port 8000
```

Verify backend health at:
```text
http://localhost:8000/health
http://localhost:8000/docs (Interactive Swagger UI)
```

### 3. Frontend Setup

In a new terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the application at `http://localhost:5173`.

---

## Demonstration & Seed Data

To populate the database with realistic sample field infrastructure issues (Addis Ababa water points, Oromia solar inverters, electrical conduit safety hazards):

```bash
# From repository root with virtual environment activated:
python backend/app/db/seed.py
```

This will seed 5 realistic reports across various priorities and workflow stages, complete with audit trail histories.

---

## Running Automated Tests

Both frontend and backend include automated test suites.

### Backend Tests (pytest)
Runs isolated tests using in-memory SQLite fixtures to verify creation, input validation, idempotency, valid and invalid status transitions, and history creation:

```bash
# From repository root:
pytest backend/tests/ -v
```

Expected output:
```text
backend/tests/test_reports.py::test_health_check PASSED
backend/tests/test_reports.py::test_create_valid_report PASSED
backend/tests/test_reports.py::test_create_report_invalid_inputs PASSED
backend/tests/test_reports.py::test_idempotent_duplicate_synchronization PASSED
backend/tests/test_reports.py::test_valid_status_transitions PASSED
backend/tests/test_reports.py::test_rejection_transition PASSED
backend/tests/test_reports.py::test_invalid_status_transitions_rejected PASSED
backend/tests/test_reports.py::test_list_reports_with_filters PASSED

======================== 8 passed in 1.4s =========================
```

### Frontend Tests (vitest)
Runs offline persistence and synchronization tests using `fake-indexeddb`:

```bash
# In frontend directory:
cd frontend
npm test
```

Expected output:
```text
 ✓ src/db/__tests__/indexedDB.test.ts (6 tests)
 Test Files  1 passed (1)
      Tests  6 passed (6)
```

---

## Manual QA Checklist

- [x] **Online Creation:** Create a report while online; verify it appears as `SYNCED` immediately.
- [x] **Offline Creation:** Disconnect network (or toggle DevTools Offline); submit a new report; verify `PENDING` badge appears and banner alerts user.
- [x] **Offline Refresh Persistence:** Refresh the browser while disconnected; verify the report is intact in the dashboard.
- [x] **Automatic Sync Recovery:** Re-enable network; verify report automatically syncs and transitions to `SYNCED`.
- [x] **Duplicate Prevention / Idempotency:** Manually trigger retry on an existing report; verify server returns existing record with no duplicate rows.
- [x] **Status Workflow:** As Coordinator, transition report from `SUBMITTED` → `ASSIGNED` → `IN_PROGRESS` → `RESOLVED`.
- [x] **Invalid Transition Rejection:** Attempt invalid transition; verify backend rejects with 400 error.
- [x] **Audit Trail Verification:** Open report details; verify full history timeline of status changes and sync events.

---

## Assumptions & Design Decisions

1. **Simulated Roles:** Authentication (OAuth/JWT) is simulated via a clean UI role switcher (Field Worker vs Coordinator) to optimize focus on offline sync reliability.
2. **Client-Generated UUIDs:** Using UUID v4 generated on the client ensures stable entity identity during retries, eliminating duplicate server insertions.
3. **No External Map SDKs:** Used lightweight HTML5 GPS geolocation and regional coordinate presets to keep the client fast, lightweight, and free from external map API dependencies.
4. **Server-Authoritative Coordinator Status:** Once synced, status changes made by coordinators are authoritative.
5. **No Alembic in Initial Scope:** Used SQLAlchemy declarative `init_db()` for simple, dependable database initialization without migration overhead.

---

## Known Limitations

- **Browser Closed Sync:** Sync occurs when the browser tab is open; full background sync when the browser is completely closed would require a Progressive Web App Service Worker with Background Sync API.
- **Single-Direction Issue Modification:** Field technicians cannot modify issue descriptions once submitted to the central server.
- **Simulated Roles:** Production deployment would require role-based access control with JWT authentication.

---

## What I Would Improve With More Time

1. **PWA Service Worker:** Register a service worker with `workbox-background-sync` to allow queued sync even if the browser process is closed.
2. **Photo Attachments:** Allow photo capture of damaged infrastructure, storing compressed thumbnails in IndexedDB.
3. **WebSocket Real-time Updates:** Push live coordinator status changes to online field workers via WebSockets.
4. **Offline Vector Maps:** Bundle an offline MapLibre tile cache for offline visual map inspection.

---

## AI Development Tool Disclosure

- **Tool Used:** Google Gemini via Antigravity IDE.
- **Usage:**
  - Project scaffolding and dependency setup.
  - Generating initial model and schema definitions.
  - Designing IndexedDB interaction helper.
  - Formulating edge case test scenarios (duplicate prevention, invalid transitions).
- **Verification:** All generated code was manually inspected, integrated, compiled, and validated through running test suites (pytest and vitest) and live end-to-end testing against local PostgreSQL 18.
- **Rejected Suggestions:** Suggestions to introduce complex state management libraries (Redux), Alembic migrations, or external map rendering engines were rejected to maintain the targeted 6-hour scope and architectural simplicity.
