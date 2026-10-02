# WEDER Strategies — Full Stack Developer Internship Technical Exercise

## Role

You are my senior software development partner working with me inside Antigravity IDE.

We are building a technical exercise for the **WEDER Strategies Full Stack Developer Internship**.

The exercise must be completed within approximately **6 hours**, so prioritize:

1. A functional application
2. Correctness
3. Clear architecture
4. Offline synchronization reliability
5. Meaningful automated tests
6. Professional but simple UI
7. Strong documentation
8. Easy explanation during a live demo

**DO NOT over-engineer the application.**

A smaller, complete, well-tested system is significantly more valuable than a large unfinished system.

---

# 1. Exercise Requirements

Build a small **Offline Field Issue Tracker** for field workers to report infrastructure problems such as:

* Broken water points
* Damaged equipment
* Service interruptions
* Safety concerns
* Maintenance requirements

Connectivity in the field is unreliable.

The application must therefore allow reports to be created and persisted locally while offline and synchronize them with the backend when connectivity returns.

A coordinator must be able to review reports and update their status.

Required functionality:

### Reports

Each report should contain at minimum:

* ID
* Category
* Description
* Location
* Priority
* Status
* Date/time reported
* Synchronization state

Useful additional fields are allowed only when they provide clear value without adding unnecessary complexity.

### Offline operation

A field worker must be able to:

1. Open the application
2. Create a report while offline
3. Refresh the browser
4. Reopen the application
5. Still see the report
6. Clearly see that it has not synchronized

Use **IndexedDB** for persistent local storage.

Do NOT use localStorage as the primary offline database.

### Synchronization

When connectivity becomes available:

* Pending reports should synchronize automatically where practical.
* The user should also have a manual retry option.
* Show synchronization states such as:

  * Pending
  * Syncing
  * Synced
  * Failed

The system must never silently lose a report.

The system must prevent duplicate server records when the same report is retried.

Use a **client-generated UUID** as the report's stable identifier.

The server must treat synchronization as **idempotent**.

Example:

```text
Local report:
ID = 550e8400-e29b-41d4-a716-446655440000

First sync:
POST /reports
→ server creates report

Retry same report:
POST /reports
→ server recognizes the same ID
→ no duplicate report created
```

---

# 2. Status Workflow

Implement this workflow:

```text
DRAFT
  ↓
SUBMITTED
  ↓
ASSIGNED
  ↓
IN_PROGRESS
  ↓
RESOLVED
```

Rejected is also supported:

```text
SUBMITTED → REJECTED
ASSIGNED → REJECTED
IN_PROGRESS → REJECTED
```

Invalid transitions must be rejected clearly by the backend.

Do not allow arbitrary status changes.

The valid transition rules should live in a clear, testable part of the backend rather than being scattered throughout route handlers.

---

# 3. Roles

Authentication is NOT required.

Simulate two roles through a simple UI role selector:

```text
Field Worker
Coordinator
```

### Field Worker

Can:

* Create reports
* View reports
* See synchronization state
* Retry failed synchronization
* View report details

### Coordinator

Can:

* View all reports
* View report details
* Update report status
* View report history

Do not implement authentication unless there is substantial time remaining.

---

# 4. Location

Use browser geolocation as the primary method.

The report should allow:

* Latitude
* Longitude

Provide a simple **"Use My Location"** action if browser geolocation is available.

If geolocation is unavailable or denied, allow manual latitude/longitude entry.

Do NOT introduce maps or external location APIs unless they can be added with almost no complexity.

A map is NOT required.

---

# 5. History / Audit Trail

Maintain a simple history table on the backend.

Suggested structure:

```text
report_history

id
report_id
event_type
old_value
new_value
message
created_at
```

Record at minimum:

* Report created
* Synchronization
* Synchronization failure
* Status changes

Example:

```text
CREATED
SYNCED
STATUS_CHANGED
SYNC_FAILED
```

The report detail page should display a readable history/timeline.

Do not build a complicated event-sourcing architecture.

---

# 6. Conflict Handling

Keep conflict resolution intentionally simple.

Document this assumption:

> Once a report has synchronized, server-side status changes are authoritative. Editing already-submitted reports is not supported in this version.

This means:

* Draft reports can be edited locally.
* Once submitted/synchronized, the report is treated as server-managed.
* Coordinator status changes are authoritative.
* We do not implement complicated bidirectional merge/conflict resolution.

The README must clearly explain this design decision.

---

# 7. Technology Stack

Use the simplest reliable stack.

## Frontend

Use:

* React
* TypeScript
* Vite
* IndexedDB

Avoid unnecessary frontend frameworks or complicated state-management libraries.

Use React state/hooks where sufficient.

A small IndexedDB helper/service is preferred over introducing a large offline framework.

## Backend

Use:

* Python
* FastAPI
* SQLAlchemy
* PostgreSQL

Use Pydantic/FastAPI validation.

Do NOT introduce Alembic initially.

For this six-hour exercise, use a simple database initialization approach that creates the required tables.

If this becomes unreliable or clearly problematic during implementation, then introduce Alembic.

Do not add technology merely because it is commonly used in production.

---

# 8. Suggested Project Structure

Start with a clean structure similar to:

```text
offline-field-issue-tracker/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── db/
│   │   ├── types/
│   │   └── ...
│   ├── package.json
│   └── ...
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── db/
│   │   └── main.py
│   ├── tests/
│   └── requirements.txt
│
├── README.md
├── .gitignore
└── ...
```

You may adjust this structure if there is a simpler and cleaner solution.

Do not create dozens of unnecessary files.

---

# 9. Backend API

Implement a small REST API.

Suggested endpoints:

```text
GET    /health

POST   /api/reports
GET    /api/reports
GET    /api/reports/{id}

POST   /api/reports/{id}/sync
PATCH  /api/reports/{id}/status

GET    /api/reports/{id}/history
```

The exact API design may be adjusted if a simpler approach is better.

The API must:

* Validate input
* Return useful HTTP status codes
* Return clear error messages
* Prevent invalid status transitions
* Prevent duplicate report creation
* Persist reports in PostgreSQL
* Record history

Avoid creating endpoints that are not actually needed.

---

# 10. Database Design

Keep the schema small.

Suggested tables:

### reports

```text
id
category
description
latitude
longitude
priority
status
reported_at
created_at
updated_at
```

### report_history

```text
id
report_id
event_type
old_value
new_value
message
created_at
```

Add fields only when they are genuinely useful.

The synchronization state does NOT necessarily need to be stored on the server because it primarily represents the relationship between local IndexedDB state and the server.

Local IndexedDB records can contain fields such as:

```text
sync_status
last_sync_attempt
sync_error
```

---

# 11. Frontend UX

The interface should look like a **small professional enterprise dashboard**.

It should be visually polished enough to make a good first impression, but UI work must never consume most of the six-hour budget.

Suggested dashboard:

```text
--------------------------------------------------
 Offline Field Issue Tracker

 [Field Worker ▼]          ● Online
--------------------------------------------------

 Reports        Pending Sync       In Progress
    12                3                 5

 [ + New Report ]

 ------------------------------------------------
 | Broken Water Point             HIGH          |
 | Addis Ababa                    IN PROGRESS   |
 | Reported Sep 30, 2026          SYNCED        |
 ------------------------------------------------

 | Damaged Equipment              MEDIUM        |
 | Oromia                         PENDING       |
 ------------------------------------------------
```

Include:

* Dashboard summary
* Report list
* Create report form
* Report detail view
* History/timeline
* Synchronization indicators
* Online/offline indicator
* Role selector

Use clear visual distinctions for:

* Priority
* Status
* Sync state

Avoid excessive animations.

---

# 12. Offline UX

The offline experience is one of the most important parts of the exercise.

The UI should clearly communicate:

```text
● Offline
```

and:

```text
Pending synchronization
```

When a report is created offline:

```text
Report saved locally
Waiting for connection
```

When synchronization succeeds:

```text
✓ Synchronized
```

When it fails:

```text
⚠ Sync failed
[Retry]
```

Never hide synchronization failures.

---

# 13. Synchronization Strategy

Implement synchronization as a clear service/module.

The general process should be:

```text
Create report
     ↓
Generate UUID
     ↓
Save to IndexedDB immediately
     ↓
sync_status = PENDING
     ↓
Attempt synchronization
     ↓
 ┌───────────────┐
 │               │
Success        Failure
 │               │
 ↓               ↓
SYNCED          FAILED
 │               │
 ↓               ↓
Server ID       Keep local data
saved           + error message
                 + retry
```

When connectivity returns:

```text
Check IndexedDB
     ↓
Find PENDING / FAILED reports
     ↓
Send to backend
     ↓
Backend checks report UUID
     ↓
Create if new
Return existing result if already synced
     ↓
Mark local report SYNCED
```

Do not rely only on browser events.

The application should also attempt synchronization when:

* Application starts
* Browser comes back online
* User manually presses retry/sync

Do not implement a complicated background worker/service worker system unless it is genuinely necessary.

---

# 14. Idempotency

This is an important evaluation point.

The backend must guarantee that retrying the same client-generated report does not create duplicates.

For example:

```text
POST report ID ABC
→ create

POST report ID ABC again
→ return existing report
→ do not create another row
```

Implement this using the report UUID as a unique identifier.

The README should explicitly explain:

> Client-generated UUIDs provide stable identity across retries, allowing synchronization to be idempotent and preventing duplicate server records.

---

# 15. Validation

Implement useful validation.

Examples:

* Category required
* Description required
* Description should have a reasonable maximum length
* Priority must be one of the supported values
* Status must be valid
* Latitude must be between -90 and 90
* Longitude must be between -180 and 180
* Date/time must be valid

Frontend validation should provide immediate feedback.

Backend validation must still exist independently.

Never rely solely on frontend validation.

---

# 16. Error Handling

Handle at minimum:

* Backend unavailable
* Network failure
* Offline mode
* Invalid form data
* Failed synchronization
* Invalid status transition
* Duplicate synchronization attempt
* Database errors

Errors should be understandable to the user.

Do not expose raw Python stack traces in the frontend.

---

# 17. Automated Testing

Testing is worth **20% of the evaluation**, so do not leave it until the final few minutes.

Focus on high-value behavior.

## Backend tests

Use pytest.

Test at minimum:

1. Creating a valid report
2. Validation of invalid report data
3. Duplicate/idempotent synchronization
4. Valid status transitions
5. Invalid status transitions
6. History creation

## Frontend tests

Add a small number of meaningful tests around:

* Saving a report locally
* Pending synchronization state
* Successful sync
* Failed sync
* Important UI behavior

Do not chase 100% test coverage.

The goal is to demonstrate that important business behavior is tested.

---

# 18. Seed / Demo Data

Provide a small seed mechanism or demonstration data.

Use realistic examples such as:

```text
Broken Water Point
Damaged Solar Equipment
Service Interruption
Safety Concern
Maintenance Required
```

Include different:

* priorities
* statuses
* synchronization states

The README should explain how to load demonstration data.

---

# 19. Git Workflow

Git history is explicitly part of the assessment.

Develop incrementally.

DO NOT make one huge final commit.

Use meaningful commits such as:

```text
chore: initialize project structure
feat: add report database model
feat: implement report API
feat: add report dashboard
feat: add indexeddb offline storage
feat: implement report synchronization
feat: add status workflow and history
test: add report and sync tests
docs: add setup and architecture documentation
style: polish dashboard UI
```

Only commit changes that actually correspond to the work performed.

Do not artificially manufacture history.

Do not commit:

* `.env`
* passwords
* API keys
* `node_modules`
* Python virtual environments
* generated build folders
* unnecessary IDE files

---

# 20. README Requirements

The README is part of the evaluation.

It must include:

## Project Overview

What the application does and what problem it solves.

## Features

Short list of implemented functionality.

## Architecture

Explain:

```text
React frontend
      ↓
IndexedDB
      ↓
Synchronization service
      ↓
FastAPI
      ↓
SQLAlchemy
      ↓
PostgreSQL
```

## Offline Strategy

Explain:

* Local persistence
* Pending state
* Synchronization
* Retry behavior
* Idempotency
* Duplicate prevention

## Status Workflow

Show the state diagram.

## Conflict Strategy

Explain the server-authoritative approach.

## Setup

Give exact commands for:

* Backend
* PostgreSQL
* Frontend

Make setup understandable for someone cloning the repository for the first time.

## Running Tests

Give exact commands.

## Seed Data

Explain how to create demonstration data.

## Assumptions and Design Decisions

Explicitly document decisions such as:

* No authentication
* Simulated roles
* No map
* Client-generated UUID
* Server-authoritative status
* No editing after submission
* Simple retry-based synchronization

## Known Limitations

Be honest.

Possible limitations:

* No authentication
* No advanced conflict resolution
* No background synchronization when browser is completely closed
* No production deployment
* No real-time updates

Only document limitations that actually exist.

## Manual QA Checklist

Include a checklist such as:

```text
[ ] Create report online
[ ] Create report offline
[ ] Refresh while offline
[ ] Close/reopen application
[ ] Confirm pending state
[ ] Restore connectivity
[ ] Confirm automatic synchronization
[ ] Retry failed synchronization
[ ] Confirm no duplicate records
[ ] Test invalid status transition
[ ] Change status as coordinator
[ ] Verify history
```

## Time Spent

Include approximate development time.

## What I Would Improve With More Time

Briefly describe future improvements.

---

# 21. AI / Development Tool Disclosure

The repository must include an AI development disclosure.

Be transparent.

Document:

* AI tool used
* What it was used for
* What generated code was accepted
* What was modified
* How generated code was verified
* Suggestions that were rejected

Example structure:

```text
AI Development Disclosure

Tool:
Google Gemini through Antigravity IDE

Usage:
- Project scaffolding
- Code generation assistance
- Debugging assistance
- Test generation assistance
- Documentation drafting

Verification:
Generated code was reviewed, manually tested, and validated through
automated tests and manual QA.

Changes:
Generated code was modified where necessary to fit the project's
architecture and requirements.

Rejected suggestions:
Any suggestions that introduced unnecessary complexity or were not
appropriate for the six-hour scope were rejected.
```

Do not claim that we manually wrote code that was generated by AI.

The disclosure must accurately represent the development process.

---

# 22. Scope Control

This is extremely important.

The exercise has an approximate **six-hour limit**.

Do NOT add:

* Authentication
* OAuth
* User registration
* Real-time WebSockets
* Maps
* Push notifications
* Email notifications
* AI features
* Advanced analytics
* Complex role-based authorization
* Microservices
* Redis
* Kubernetes
* Cloud deployment
* Complex offline frameworks
* Complicated state-management libraries
* Advanced conflict-resolution algorithms

unless all required functionality is already complete, tested, documented, and there is significant time remaining.

The goal is not to demonstrate how many technologies we can use.

The goal is to demonstrate that we can design and implement a **small reliable full-stack system**.

---

# 23. Phase-by-Phase Development

Work incrementally.

**DO NOT implement the entire application in one step.**

Each phase has a concrete completion gate. **Do not proceed to the next phase until the current phase passes its acceptance checks.**

---

## Phase 1 — Foundation

Implement:

* Repository/project structure
* React + TypeScript + Vite frontend
* FastAPI backend
* PostgreSQL connection
* Basic configuration
* Basic project structure
* `GET /health`

### Phase 1 Acceptance Test

We must be able to verify:

```text
[ ] Backend starts without errors
[ ] Frontend starts without errors
[ ] PostgreSQL connection works
[ ] GET /health returns successful response
[ ] Frontend loads in browser
[ ] Frontend can reach backend
[ ] No secrets are committed
[ ] .gitignore is present
```

### Manual test

Start backend and frontend.

Open the frontend in the browser.

Open:

```text
/api/health
```

or the appropriate backend health URL.

Expected result:

```text
HTTP 200
```

The frontend should also be able to communicate with the backend.

### Phase 1 Completion Rule

Do not begin Phase 2 until all checks above pass.

Then make a meaningful Git commit.

---

# Phase 2 — Backend Core

Implement:

* Report model
* History model
* Database initialization
* Report creation
* Report retrieval
* Validation
* Basic error handling

### Phase 2 Acceptance Test

Using Swagger/OpenAPI or another API client:

```text
[ ] Create valid report
[ ] Retrieve report
[ ] Retrieve report list
[ ] Invalid category is rejected
[ ] Invalid priority is rejected
[ ] Invalid latitude is rejected
[ ] Invalid longitude is rejected
[ ] Missing required fields are rejected
[ ] Report is actually persisted in PostgreSQL
[ ] Creation history entry is created
```

### Manual test

Create a report through the API.

Then:

1. Retrieve it.
2. Restart the backend.
3. Retrieve it again.

Expected:

**The report still exists.**

This proves server-side persistence.

### Phase 2 Completion Rule

All acceptance tests must pass before moving forward.

Then commit.

---

# Phase 3 — Basic Frontend

Implement:

* Dashboard
* Report list
* Create report form
* Report details
* Backend API integration
* Basic role selector

At this phase, offline synchronization is NOT required yet.

### Phase 3 Acceptance Test

In the browser:

```text
[ ] Dashboard loads
[ ] Reports are displayed
[ ] New report form opens
[ ] Required validation works
[ ] Report can be created
[ ] Created report appears in list
[ ] Report details can be opened
[ ] Priority is visible
[ ] Status is visible
[ ] Location is visible
[ ] Date/time is visible
[ ] Field Worker / Coordinator role selector works
```

### Manual test

Create a report from the frontend.

Refresh the page.

The report should still appear because it currently comes from PostgreSQL through the backend.

### Phase 3 Completion Rule

At this point we must have a **working online full-stack application**.

Do not add offline functionality until this works.

Then commit.

---

# Phase 4 — Offline Storage

Implement:

* IndexedDB
* Local report creation
* Persistent local records
* Offline indicator
* Local synchronization state
* Local report retrieval

### Phase 4 Acceptance Test

Use browser DevTools to simulate offline mode.

Test:

```text
[ ] Open application
[ ] Turn network offline
[ ] Create report
[ ] Report creation succeeds locally
[ ] Report shows PENDING sync state
[ ] Refresh page while offline
[ ] Report still exists
[ ] Close/reopen browser or reload application
[ ] Report still exists
[ ] No report data is silently lost
```

### Critical manual test

```text
Browser offline
      ↓
Create report
      ↓
Refresh
      ↓
Report still visible
```

If this fails, Phase 4 is NOT complete.

### Phase 4 Completion Rule

Offline persistence must work across refresh/reopen.

Then commit.

---

# Phase 5 — Synchronization

Implement:

* Synchronization service
* Startup synchronization
* Browser `online` event synchronization
* Manual retry
* Pending/syncing/synced/failed states
* Client-generated UUID
* Backend idempotency
* Duplicate prevention
* Sync history

### Phase 5 Acceptance Test

Test the following scenarios individually.

#### Scenario A — Successful synchronization

```text
[ ] Create report offline
[ ] Report becomes PENDING
[ ] Restore connectivity
[ ] Report synchronizes
[ ] Report becomes SYNCED
[ ] Report exists in PostgreSQL
```

#### Scenario B — Failed synchronization

```text
[ ] Create report
[ ] Make backend unavailable/offline
[ ] Attempt synchronization
[ ] Report becomes FAILED
[ ] Error is visible
[ ] Local report remains intact
[ ] Retry option is available
```

#### Scenario C — Retry

```text
[ ] Failed report exists locally
[ ] Restore backend connectivity
[ ] Press Retry
[ ] Report synchronizes
[ ] State becomes SYNCED
```

#### Scenario D — Duplicate prevention

This is critical.

```text
[ ] Create one local report
[ ] Synchronize it
[ ] Trigger synchronization again
[ ] Backend does not create another record
[ ] PostgreSQL contains exactly one report
```

#### Scenario E — Refresh during offline state

```text
[ ] Create report offline
[ ] Refresh
[ ] Report remains PENDING
[ ] Restore connection
[ ] Report synchronizes successfully
```

### Phase 5 Completion Rule

All five scenarios must work.

If synchronization works only under ideal conditions but failed reports disappear or duplicate records are created, Phase 5 is NOT complete.

Then commit.

---

# Phase 6 — Coordinator Workflow

Implement:

* Coordinator role
* Status transitions
* Status validation
* History/timeline
* Coordinator report management

### Phase 6 Acceptance Test

Test the valid workflow:

```text
SUBMITTED
    ↓
ASSIGNED
    ↓
IN_PROGRESS
    ↓
RESOLVED
```

Verify each transition succeeds.

Then test invalid transitions.

Examples:

```text
DRAFT → RESOLVED
RESOLVED → ASSIGNED
RESOLVED → IN_PROGRESS
```

Expected:

**Backend rejects the transition with a clear error.**

Also test rejection:

```text
SUBMITTED → REJECTED
```

### History Test

After changing a status:

```text
[ ] History contains the status change
[ ] Old status is recorded
[ ] New status is recorded
[ ] Timestamp is recorded
[ ] History appears in the UI
```

### Phase 6 Completion Rule

Status rules must be enforced by the backend, not only by the frontend.

Then commit.

---

# Phase 7 — Automated Testing

Implement and run meaningful automated tests.

### Backend tests

Verify:

```text
[ ] Valid report creation
[ ] Invalid input validation
[ ] Duplicate/idempotent report handling
[ ] Valid status transitions
[ ] Invalid status transitions
[ ] History creation
```

### Frontend tests

Verify where practical:

```text
[ ] Local report persistence
[ ] Pending sync state
[ ] Successful synchronization
[ ] Failed synchronization
```

### Phase 7 Acceptance Test

Run the complete test suite.

The final output must clearly show:

```text
ALL TESTS PASSED
```

or the equivalent successful result.

Do not simply write tests without running them.

If a test fails, fix the implementation or test appropriately and rerun it.

### Phase 7 Completion Rule

All important automated tests must pass before moving to UI polish.

Then commit.

---

# Phase 8 — UI Polish

Only after the functional system is stable.

Improve:

* Dashboard layout
* Typography
* Cards
* Tables/lists
* Status badges
* Priority indicators
* Sync indicators
* Forms
* Empty states
* Error states
* Responsive behavior
* History timeline
* Online/offline indicator

### Phase 8 Acceptance Test

Manually verify:

```text
[ ] Dashboard looks professional
[ ] Important information is easy to find
[ ] Status is visually clear
[ ] Priority is visually clear
[ ] Sync state is visually clear
[ ] Offline state is obvious
[ ] Forms are understandable
[ ] Error messages are readable
[ ] No obvious broken layouts
[ ] Application works at normal desktop size
[ ] Application remains usable at smaller widths
```

Do not spend excessive time polishing tiny visual details.

### Phase 8 Completion Rule

The application should look professional enough for a technical interview/demo.

Then commit.

---

# Phase 9 — Documentation

Complete:

* README
* Architecture explanation
* Synchronization strategy
* Status workflow
* Assumptions
* Conflict strategy
* Known limitations
* Setup instructions
* Test instructions
* Seed/demo instructions
* Manual QA checklist
* AI disclosure
* Approximate time spent
* Future improvements

### Phase 9 Acceptance Test

Pretend you are a reviewer who just cloned the repository.

Verify:

```text
[ ] README explains the project
[ ] Setup instructions are complete
[ ] Application can be started using README instructions
[ ] Tests can be run using README instructions
[ ] Database setup is explained
[ ] Seed/demo data is explained
[ ] Architecture is explained
[ ] Offline synchronization is explained
[ ] Idempotency is explained
[ ] Status workflow is explained
[ ] Assumptions are documented
[ ] Limitations are documented
[ ] Manual QA checklist exists
[ ] AI disclosure exists
[ ] Approximate time spent is included
```

### Phase 9 Completion Rule

A fresh reviewer should be able to understand and run the project without needing private instructions from us.

Then commit.

---

# 24. Final End-to-End Acceptance Test

Before submission, perform the complete demo from a clean state.

## Test 1 — Create Online

```text
[ ] Start backend
[ ] Start frontend
[ ] Confirm Online indicator
[ ] Create report
[ ] Report appears
[ ] Report is synchronized
```

## Test 2 — Create Offline

```text
[ ] Turn network offline
[ ] Create report
[ ] Report appears
[ ] PENDING state is visible
[ ] Refresh browser
[ ] Report remains
```

## Test 3 — Synchronize

```text
[ ] Restore network
[ ] Synchronization occurs
[ ] State changes to SYNCED
[ ] Report appears on server
```

## Test 4 — Duplicate Protection

```text
[ ] Retry synchronization
[ ] Verify only one server record exists
```

## Test 5 — Coordinator

```text
[ ] Switch to Coordinator
[ ] Open report
[ ] Change status
[ ] Verify valid transition
[ ] Verify history
```

## Test 6 — Invalid Transition

```text
[ ] Attempt invalid status transition
[ ] Verify backend rejects it
[ ] Verify useful error is shown
```

## Test 7 — Failure Recovery

```text
[ ] Cause synchronization failure
[ ] Verify FAILED state
[ ] Verify local data remains
[ ] Restore connectivity
[ ] Retry
[ ] Verify successful synchronization
```

If any of these tests fail, **do not declare the project finished**.

---

# 25. Git Final Check

Before submission:

```text
[ ] Git history shows incremental development
[ ] Commits are meaningful
[ ] No artificial commits
[ ] No secrets
[ ] No node_modules
[ ] No .venv
[ ] No generated build artifacts
[ ] Repository is public
```

Review the entire repository before submission.

---

# 26. Scope Control

If time becomes limited, prioritize in this exact order:

```text
1. Core backend/API
2. Database persistence
3. Basic frontend
4. Offline IndexedDB persistence
5. Synchronization + idempotency
6. Status workflow
7. History
8. Automated tests
9. README
10. UI polish
```

Never sacrifice synchronization correctness or testing just to add visual features.

---

# 27. How You Should Work With Me

Do not assume that I want the largest or most sophisticated implementation.

I am intentionally optimizing for:

**working > complete > understandable > tested > polished > complex**

When a choice has multiple valid solutions, prefer the solution that:

1. Takes less time
2. Has fewer dependencies
3. Is easier to test
4. Is easier to explain
5. Still satisfies the evaluator's requirements

If you identify a feature that is not required, tell me before implementing it.

If you believe a requested implementation introduces unnecessary complexity, propose a simpler alternative.

Do not silently expand the scope.

After each phase, provide:

```text
PHASE COMPLETE

Implemented:
- ...

Verification performed:
- ...

Acceptance checks:
- [PASS/FAIL] ...

Tests:
- ...

Files changed:
- ...

Git commit recommendation:
- ...

Known issues:
- ...

Next phase:
- ...
```

**Do not say a phase is complete unless its acceptance checks have actually been performed.**

---

# 28. Starting Instruction

**Do not start implementing everything immediately.**

First:

1. Inspect the current workspace.
2. Confirm whether this is a new/empty project.
3. Review the requirements in this document.
4. Propose the final architecture briefly.
5. Identify the minimum database schema.
6. Identify the minimum API endpoints.
7. Identify the synchronization flow.
8. Identify the testing strategy.
9. Identify any potential technical risks.
10. Estimate the implementation time for each phase.

Then wait for my confirmation before beginning **Phase 1**.

After I confirm, implement **Phase 1 only**.

At the end of every phase, stop and wait for my confirmation before proceeding.

Remember:

**We have approximately six hours. Build a reliable small system, not a giant system.**
