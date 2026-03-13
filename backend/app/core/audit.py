import json
from typing import Any

from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog


def write_audit_log(
    db: Session,
    actor_email: str,
    action: str,
    entity_type: str,
    entity_id: str | None = None,
    details: dict[str, Any] | None = None,
) -> None:
    """Queue an audit log row in the current transaction."""
    payload = json.dumps(details or {}, default=str)
    db.add(
        AuditLog(
            actor_email=actor_email,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            details=payload,
        )
    )
