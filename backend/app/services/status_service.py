from typing import Dict, Set, Tuple
from fastapi import HTTPException, status

# Allowed status transitions: current_status -> set of allowed next_statuses
ALLOWED_TRANSITIONS: Dict[str, Set[str]] = {
    "DRAFT": {"SUBMITTED"},
    "SUBMITTED": {"ASSIGNED", "REJECTED"},
    "ASSIGNED": {"IN_PROGRESS", "REJECTED"},
    "IN_PROGRESS": {"RESOLVED", "REJECTED"},
    "RESOLVED": set(),  # Terminal state
    "REJECTED": set(),  # Terminal state
}

def can_transition(current_status: str, target_status: str) -> bool:
    """Check if transitioning from current_status to target_status is permitted."""
    current = current_status.strip().upper()
    target = target_status.strip().upper()
    
    # If already in the target status, it's considered a no-op or valid idempotent request
    if current == target:
        return True
        
    allowed_next = ALLOWED_TRANSITIONS.get(current, set())
    return target in allowed_next

def validate_transition(current_status: str, target_status: str) -> None:
    """Validate status transition. Raises HTTPException(400) on invalid transitions."""
    current = current_status.strip().upper()
    target = target_status.strip().upper()

    if current == target:
        return

    allowed_next = ALLOWED_TRANSITIONS.get(current, set())
    if target not in allowed_next:
        allowed_list = sorted(list(allowed_next)) if allowed_next else ["None (terminal state)"]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "InvalidStatusTransition",
                "message": f"Cannot transition report status from '{current}' to '{target}'.",
                "current_status": current,
                "target_status": target,
                "allowed_transitions": allowed_list
            }
        )
