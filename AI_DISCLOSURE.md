# AI Development Tool Disclosure

### Assessment Context
- **Candidate:** Leoul Teferi
- **Position:** Full Stack Developer Internship — WEDER Strategies
- **Project:** Offline Field Issue Tracker

---

### Tooling Details
- **AI Tool:** Google Gemini via Antigravity IDE
- **Operating Environment:** Windows 11, PowerShell, Python 3.12, Node.js 24, PostgreSQL 18

---

### Scope of Assistance
1. **Scaffolding:** Rapid generation of initial boilerplate for FastAPI, SQLAlchemy session management, and Vite React TypeScript.
2. **Schema & Validation:** Drafting Pydantic V2 schemas with custom validators for coordinates (-90 to 90 lat, -180 to 180 lon) and client-generated UUIDs.
3. **Workflow State Machine:** Structuring the state transition map in `backend/app/services/status_service.py` to enforce the requested lifecycle (`DRAFT` → `SUBMITTED` → `ASSIGNED` → `IN_PROGRESS` → `RESOLVED`, plus `REJECTED`).
4. **Offline Persistence Logic:** Architecting the native IndexedDB wrapper (`indexedDB.ts`) to avoid external framework bloat while providing transactional storage and pending sync status tracking.
5. **Test Scenarios:** Formulating test cases for idempotency, invalid transitions, and local IndexedDB conflict safety.
6. **Documentation:** Structuring the comprehensive README following all WEDER technical exercise guidelines.

---

### Verification and Quality Assurance
Every generated artifact was actively verified:
- **Backend Tests:** Executed via `pytest` to confirm 8/8 tests passing (including idempotency and invalid transition rejections).
- **Frontend Tests:** Executed via `vitest` to confirm 6/6 tests passing on IndexedDB operations.
- **TypeScript Strictness:** Built using `tsc -b && vite build` with zero errors.
- **Database Persistence:** Confirmed through direct `psql` queries on local PostgreSQL 18.

---

### Rejected Suggestions
- **Heavy Offline Sync Frameworks (e.g., RxDB, WatermelonDB):** Rejected in favor of a lean, transparent native IndexedDB wrapper to avoid unnecessary dependencies and preserve fast boot times.
- **Alembic Migrations:** Rejected in favor of `init_db()` to keep database setup clean and direct within the 6-hour timeline.
- **External Map SDKs (Leaflet / Google Maps API):** Rejected because internet connectivity cannot be assumed in the field; instead, lightweight GPS coordinate capture with regional presets was implemented.
- **Complex Auth / OAuth:** Rejected per project prompt guidelines to prioritize offline sync reliability and core business logic.
