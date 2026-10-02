import uuid
import pytest
from app.models.report import Report
from app.models.history import ReportHistory

def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["database"] == "connected"

def test_create_valid_report(client, db_session):
    report_id = str(uuid.uuid4())
    payload = {
        "id": report_id,
        "category": "Broken Water Point",
        "description": "Public water tap in Ward 3 broken valve.",
        "latitude": 9.03,
        "longitude": 38.74,
        "priority": "HIGH",
        "status": "SUBMITTED"
    }

    response = client.post("/api/reports", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["id"] == report_id
    assert data["category"] == "Broken Water Point"
    assert data["priority"] == "HIGH"
    assert data["status"] == "SUBMITTED"

    # Verify persisted in database
    db_report = db_session.query(Report).filter(Report.id == report_id).first()
    assert db_report is not None
    assert db_report.description == payload["description"]

    # Verify history creation (CREATED and SYNCED events)
    history = db_session.query(ReportHistory).filter(ReportHistory.report_id == report_id).all()
    assert len(history) >= 2
    event_types = [h.event_type for h in history]
    assert "CREATED" in event_types
    assert "SYNCED" in event_types

def test_create_report_invalid_inputs(client):
    valid_id = str(uuid.uuid4())

    # Invalid latitude (> 90)
    res_lat = client.post("/api/reports", json={
        "id": valid_id,
        "category": "Broken Water Point",
        "description": "Test description",
        "latitude": 150.0,
        "longitude": 38.0,
        "priority": "LOW"
    })
    assert res_lat.status_code == 422

    # Invalid longitude (< -180)
    res_lon = client.post("/api/reports", json={
        "id": valid_id,
        "category": "Broken Water Point",
        "description": "Test description",
        "latitude": 9.0,
        "longitude": -200.0,
        "priority": "LOW"
    })
    assert res_lon.status_code == 422

    # Invalid Priority
    res_prio = client.post("/api/reports", json={
        "id": valid_id,
        "category": "Broken Water Point",
        "description": "Test description",
        "latitude": 9.0,
        "longitude": 38.0,
        "priority": "SUPER_URGENT"
    })
    assert res_prio.status_code == 422

    # Invalid UUID
    res_uuid = client.post("/api/reports", json={
        "id": "not-a-valid-uuid",
        "category": "Broken Water Point",
        "description": "Test description",
        "latitude": 9.0,
        "longitude": 38.0,
        "priority": "LOW"
    })
    assert res_uuid.status_code == 422

def test_idempotent_duplicate_synchronization(client, db_session):
    """
    Submitting the same report twice with the same client-generated UUID
    must NOT create duplicate records in the database.
    """
    report_id = str(uuid.uuid4())
    payload = {
        "id": report_id,
        "category": "Damaged Equipment",
        "description": "Solar panel connector broken.",
        "latitude": 8.54,
        "longitude": 39.27,
        "priority": "MEDIUM",
        "status": "SUBMITTED"
    }

    # First submission
    res1 = client.post("/api/reports", json=payload)
    assert res1.status_code == 201

    # Second submission (sync retry)
    res2 = client.post("/api/reports", json=payload)
    assert res2.status_code in [200, 201]

    # Verify explicitly with sync endpoint
    res3 = client.post(f"/api/reports/{report_id}/sync", json=payload)
    assert res3.status_code == 200
    assert res3.json()["is_duplicate"] is True

    # Check database: exactly 1 report must exist
    reports_count = db_session.query(Report).filter(Report.id == report_id).count()
    assert reports_count == 1

def test_valid_status_transitions(client, db_session):
    """
    Test workflow:
    SUBMITTED -> ASSIGNED -> IN_PROGRESS -> RESOLVED
    """
    report_id = str(uuid.uuid4())
    payload = {
        "id": report_id,
        "category": "Broken Water Point",
        "description": "Status workflow test",
        "latitude": 9.0,
        "longitude": 38.0,
        "priority": "HIGH",
        "status": "SUBMITTED"
    }
    client.post("/api/reports", json=payload)

    # SUBMITTED -> ASSIGNED
    r_assigned = client.patch(f"/api/reports/{report_id}/status", json={
        "status": "ASSIGNED",
        "note": "Assigned to Team 1"
    })
    assert r_assigned.status_code == 200
    assert r_assigned.json()["status"] == "ASSIGNED"

    # ASSIGNED -> IN_PROGRESS
    r_prog = client.patch(f"/api/reports/{report_id}/status", json={
        "status": "IN_PROGRESS",
        "note": "Repairs ongoing"
    })
    assert r_prog.status_code == 200
    assert r_prog.json()["status"] == "IN_PROGRESS"

    # IN_PROGRESS -> RESOLVED
    r_res = client.patch(f"/api/reports/{report_id}/status", json={
        "status": "RESOLVED",
        "note": "Repairs verified"
    })
    assert r_res.status_code == 200
    assert r_res.json()["status"] == "RESOLVED"

    # Verify history recorded all transitions
    history = client.get(f"/api/reports/{report_id}/history").json()
    assert len(history) >= 4
    events = [h["event_type"] for h in history]
    assert events.count("STATUS_CHANGED") == 3

def test_rejection_transition(client, db_session):
    """Test transitioning to REJECTED from SUBMITTED."""
    report_id = str(uuid.uuid4())
    payload = {
        "id": report_id,
        "category": "Service Interruption",
        "description": "Duplicate power report",
        "latitude": 9.0,
        "longitude": 38.0,
        "priority": "LOW",
        "status": "SUBMITTED"
    }
    client.post("/api/reports", json=payload)

    r_rej = client.patch(f"/api/reports/{report_id}/status", json={
        "status": "REJECTED",
        "note": "Duplicate of ticket #102"
    })
    assert r_rej.status_code == 200
    assert r_rej.json()["status"] == "REJECTED"

def test_invalid_status_transitions_rejected(client, db_session):
    """Backend must reject invalid status jumps (e.g. SUBMITTED directly to RESOLVED)."""
    report_id = str(uuid.uuid4())
    payload = {
        "id": report_id,
        "category": "Safety Concern",
        "description": "Conduit issue",
        "latitude": 9.0,
        "longitude": 38.0,
        "priority": "CRITICAL",
        "status": "SUBMITTED"
    }
    client.post("/api/reports", json=payload)

    # Invalid: SUBMITTED -> RESOLVED (cannot skip ASSIGNED and IN_PROGRESS)
    res_invalid = client.patch(f"/api/reports/{report_id}/status", json={
        "status": "RESOLVED"
    })
    assert res_invalid.status_code == 400
    detail = res_invalid.json()["detail"]
    assert detail["error"] == "InvalidStatusTransition"

    # Transition to ASSIGNED then IN_PROGRESS then RESOLVED
    client.patch(f"/api/reports/{report_id}/status", json={"status": "ASSIGNED"})
    client.patch(f"/api/reports/{report_id}/status", json={"status": "IN_PROGRESS"})
    client.patch(f"/api/reports/{report_id}/status", json={"status": "RESOLVED"})

    # Invalid: RESOLVED -> IN_PROGRESS (RESOLVED is terminal)
    res_terminal = client.patch(f"/api/reports/{report_id}/status", json={
        "status": "IN_PROGRESS"
    })
    assert res_terminal.status_code == 400
    assert res_terminal.json()["detail"]["error"] == "InvalidStatusTransition"

def test_list_reports_with_filters(client):
    id1 = str(uuid.uuid4())
    id2 = str(uuid.uuid4())
    client.post("/api/reports", json={
        "id": id1,
        "category": "Broken Water Point",
        "description": "Item 1",
        "latitude": 9.0,
        "longitude": 38.0,
        "priority": "HIGH",
        "status": "SUBMITTED"
    })
    client.post("/api/reports", json={
        "id": id2,
        "category": "Safety Concern",
        "description": "Item 2",
        "latitude": 9.1,
        "longitude": 38.1,
        "priority": "LOW",
        "status": "SUBMITTED"
    })

    # Filter by priority
    res = client.get("/api/reports?priority=HIGH")
    assert res.status_code == 200
    items = res.json()
    assert all(r["priority"] == "HIGH" for r in items)

    # Filter by category
    res_cat = client.get("/api/reports?category=Safety Concern")
    assert res_cat.status_code == 200
    items_cat = res_cat.json()
    assert all(r["category"] == "Safety Concern" for r in items_cat)
