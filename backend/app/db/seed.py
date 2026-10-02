from datetime import datetime, timedelta
import uuid
from app.db.session import SessionLocal, init_db
from app.models.report import Report
from app.models.history import ReportHistory

SEED_REPORTS = [
    {
        "id": "e4f8d9b1-7a6c-4e88-9123-111111111111",
        "category": "Broken Water Point",
        "description": "Main community borehole pump handle broken. Approximately 350 households in Sector 4 currently lack direct water access.",
        "latitude": 9.0320,
        "longitude": 38.7460,
        "priority": "HIGH",
        "status": "IN_PROGRESS",
        "days_ago": 3,
        "history": [
            ("CREATED", "SUBMITTED", "Report registered from mobile field terminal."),
            ("SYNCED", "SYNCED", "Synchronized to central server."),
            ("STATUS_CHANGED", "ASSIGNED", "Assigned to Water Engineering Team Alpha."),
            ("STATUS_CHANGED", "IN_PROGRESS", "Replacement seals and handle dispatched with technician.")
        ]
    },
    {
        "id": "a1b2c3d4-e5f6-4a5b-8c9d-222222222222",
        "category": "Damaged Equipment",
        "description": "Solar PV array inverter unit overheating and shutting down periodically at primary health post refrigeration unit.",
        "latitude": 8.5400,
        "longitude": 39.2700,
        "priority": "CRITICAL",
        "status": "ASSIGNED",
        "days_ago": 2,
        "history": [
            ("CREATED", "SUBMITTED", "Urgent field report logged by clinic supervisor."),
            ("SYNCED", "SYNCED", "Synchronized successfully."),
            ("STATUS_CHANGED", "ASSIGNED", "Assigned to Solar Tech Rapid Response team.")
        ]
    },
    {
        "id": "f5e4d3c2-b1a0-4987-9876-333333333333",
        "category": "Service Interruption",
        "description": "Fiber conduit damaged during road grading near District Office junction. Temporary cellular fallback active.",
        "latitude": 9.0100,
        "longitude": 38.7600,
        "priority": "MEDIUM",
        "status": "SUBMITTED",
        "days_ago": 1,
        "history": [
            ("CREATED", "SUBMITTED", "Report created during routine network survey."),
            ("SYNCED", "SYNCED", "Synchronized successfully.")
        ]
    },
    {
        "id": "d7c6b5a4-9876-4321-1234-444444444444",
        "category": "Safety Concern",
        "description": "Exposed high-voltage conduit near primary school perimeter fence after recent rainstorm erosion.",
        "latitude": 9.0450,
        "longitude": 38.7200,
        "priority": "CRITICAL",
        "status": "RESOLVED",
        "days_ago": 5,
        "history": [
            ("CREATED", "SUBMITTED", "Urgent safety report submitted."),
            ("SYNCED", "SYNCED", "Synchronized."),
            ("STATUS_CHANGED", "ASSIGNED", "Dispatched electrical hazard team."),
            ("STATUS_CHANGED", "IN_PROGRESS", "Site secured with warning tape and conduit re-insulated."),
            ("STATUS_CHANGED", "RESOLVED", "Underground conduit re-buried and safety compliance certified.")
        ]
    },
    {
        "id": "c9b8a7d6-1234-4567-8901-555555555555",
        "category": "Maintenance Required",
        "description": "Diesel generator routine filter replacement and oil check required prior to rainy season backup cycle.",
        "latitude": 8.9800,
        "longitude": 38.8000,
        "priority": "LOW",
        "status": "SUBMITTED",
        "days_ago": 4,
        "history": [
            ("CREATED", "SUBMITTED", "Scheduled maintenance ticket entered."),
            ("SYNCED", "SYNCED", "Synchronized.")
        ]
    }
]

def seed_database():
    init_db()
    db = SessionLocal()
    try:
        print("Seeding database with realistic demonstration reports...")
        for item in SEED_REPORTS:
            existing = db.query(Report).filter(Report.id == item["id"]).first()
            if existing:
                print(f"Report {item['id']} already exists, skipping.")
                continue

            report_time = datetime.utcnow() - timedelta(days=item["days_ago"])
            report = Report(
                id=item["id"],
                category=item["category"],
                description=item["description"],
                latitude=item["latitude"],
                longitude=item["longitude"],
                priority=item["priority"],
                status=item["status"],
                reported_at=report_time,
                created_at=report_time,
                updated_at=report_time + timedelta(hours=2)
            )
            db.add(report)

            # Insert history entries
            for i, h in enumerate(item["history"]):
                event_type, val, msg = h
                entry = ReportHistory(
                    report_id=report.id,
                    event_type=event_type,
                    old_value=None if i == 0 else item["history"][i-1][1],
                    new_value=val,
                    message=msg,
                    created_at=report_time + timedelta(minutes=i * 45)
                )
                db.add(entry)

        db.commit()
        print("Database seeding completed successfully!")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
