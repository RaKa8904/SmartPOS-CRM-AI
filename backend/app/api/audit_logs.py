from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import require_role
from app.db.deps import get_db
from app.models.audit_log import AuditLog

router = APIRouter(prefix="/audit-logs", tags=["Audit Logs"])


@router.get("/list")
def list_audit_logs(
    db: Session = Depends(get_db),
    _=Depends(require_role("admin")),
):
    rows = db.query(AuditLog).order_by(AuditLog.id.desc()).limit(300).all()
    return [
        {
            "id": r.id,
            "actor_email": r.actor_email,
            "action": r.action,
            "entity_type": r.entity_type,
            "entity_id": r.entity_id,
            "details": r.details,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]
