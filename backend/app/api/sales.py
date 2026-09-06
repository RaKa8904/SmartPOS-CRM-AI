import os
from fastapi import APIRouter, Depends, Header, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.db.deps import get_db
from app.models.company import Company
from app.models.contact import Contact
from app.models.lead import Lead, LeadStatus
from app.models.user import User
from app.schemas.sales import (
    CompanyCreate, CompanyUpdate, CompanyOut,
    ContactCreate, ContactUpdate, ContactOut,
    LeadCreate, LeadUpdate, LeadOut,
    ExternalLeadCreate,
)
from app.core.dependencies import require_role
from app.core.audit import write_audit_log

router = APIRouter(prefix="/sales", tags=["Sales"])

VALID_LEAD_STATUSES = {s.value for s in LeadStatus}


def _clean_text(value: str | None) -> str:
    return (value or "").strip()


def _clean_optional_text(value: str | None) -> str | None:
    cleaned = _clean_text(value)
    return cleaned or None


def get_next_round_robin_sales_user(db: Session) -> Optional[int]:
    """Find active sales users and return the one due for the next lead in Round-Robin order."""
    sales_users = (
        db.query(User)
        .filter(User.role == "sales", User.is_active == True)
        .order_by(User.id)
        .all()
    )
    if not sales_users:
        # Fallback to active admin users if no sales reps exist
        sales_users = (
            db.query(User)
            .filter(User.role == "admin", User.is_active == True)
            .order_by(User.id)
            .all()
        )
    if not sales_users:
        return None

    # Count existing leads assigned to each candidate user
    user_lead_counts = []
    for user in sales_users:
        count = db.query(Lead).filter(Lead.assigned_user_id == user.id).count()
        user_lead_counts.append((count, user.id))

    # Pick user with minimum lead count (ties broken by lower user.id)
    user_lead_counts.sort(key=lambda x: (x[0], x[1]))
    return user_lead_counts[0][1]


# ═══════════════════════════════════════════════════════════
#  COMPANIES
# ═══════════════════════════════════════════════════════════

@router.post("/companies", response_model=CompanyOut)
def create_company(
    payload: CompanyCreate,
    db: Session = Depends(get_db),
    current=Depends(require_role("admin", "sales")),
):
    name = _clean_text(payload.name)
    if not name:
        raise HTTPException(status_code=400, detail="Company name is required")

    existing = (
        db.query(Company)
        .filter(Company.name.ilike(name))
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Company name already exists")

    company = Company(
        name=name,
        industry=_clean_optional_text(payload.industry),
        website=_clean_optional_text(payload.website),
        address=_clean_optional_text(payload.address),
    )
    db.add(company)
    db.commit()
    db.refresh(company)

    write_audit_log(
        db,
        actor_email=current["email"],
        action="company_created",
        entity_type="company",
        entity_id=str(company.id),
        details={"name": company.name},
    )
    return company


@router.get("/companies", response_model=list[CompanyOut])
def list_companies(
    db: Session = Depends(get_db),
    _=Depends(require_role("admin", "sales")),
):
    return db.query(Company).order_by(Company.name).all()


@router.get("/companies/{company_id}", response_model=CompanyOut)
def get_company(
    company_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_role("admin", "sales")),
):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return company


@router.put("/companies/{company_id}", response_model=CompanyOut)
def update_company(
    company_id: int,
    payload: CompanyUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_role("admin", "sales")),
):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    if payload.name is not None:
        name = _clean_text(payload.name)
        if not name:
            raise HTTPException(status_code=400, detail="Name cannot be empty")
        dup = db.query(Company).filter(Company.name.ilike(name), Company.id != company_id).first()
        if dup:
            raise HTTPException(status_code=400, detail="Company name already exists")
        company.name = name
    if payload.industry is not None:
        company.industry = _clean_optional_text(payload.industry)
    if payload.website is not None:
        company.website = _clean_optional_text(payload.website)
    if payload.address is not None:
        company.address = _clean_optional_text(payload.address)

    db.commit()
    db.refresh(company)
    return company


@router.delete("/companies/{company_id}")
def delete_company(
    company_id: int,
    db: Session = Depends(get_db),
    current=Depends(require_role("admin", "sales")),
):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    has_contacts = db.query(Contact).filter(Contact.company_id == company_id).first()
    if has_contacts:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete company with existing contacts",
        )

    write_audit_log(
        db,
        actor_email=current["email"],
        action="company_deleted",
        entity_type="company",
        entity_id=str(company.id),
        details={"name": company.name},
    )
    db.delete(company)
    db.commit()
    return {"message": "Company deleted"}


# ═══════════════════════════════════════════════════════════
#  CONTACTS
# ═══════════════════════════════════════════════════════════

@router.post("/contacts", response_model=ContactOut)
def create_contact(
    payload: ContactCreate,
    db: Session = Depends(get_db),
    current=Depends(require_role("admin", "sales")),
):
    company = db.query(Company).filter(Company.id == payload.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    first_name = _clean_text(payload.first_name)
    last_name = _clean_text(payload.last_name)
    if not first_name or not last_name:
        raise HTTPException(status_code=400, detail="First name and last name are required")

    email = _clean_optional_text(payload.email)
    if email:
        dup = db.query(Contact).filter(Contact.email.ilike(email)).first()
        if dup:
            raise HTTPException(status_code=400, detail="Contact email already exists")

    contact = Contact(
        company_id=payload.company_id,
        first_name=first_name,
        last_name=last_name,
        email=email,
        phone=_clean_optional_text(payload.phone),
        designation=_clean_optional_text(payload.designation),
    )
    db.add(contact)
    db.commit()
    db.refresh(contact)

    write_audit_log(
        db,
        actor_email=current["email"],
        action="contact_created",
        entity_type="contact",
        entity_id=str(contact.id),
        details={"name": f"{contact.first_name} {contact.last_name}", "company_id": payload.company_id},
    )
    return contact


@router.get("/contacts", response_model=list[ContactOut])
def list_contacts(
    company_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    _=Depends(require_role("admin", "sales")),
):
    q = db.query(Contact)
    if company_id is not None:
        q = q.filter(Contact.company_id == company_id)
    return q.order_by(Contact.first_name).all()


@router.put("/contacts/{contact_id}", response_model=ContactOut)
def update_contact(
    contact_id: int,
    payload: ContactUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_role("admin", "sales")),
):
    contact = db.query(Contact).filter(Contact.id == contact_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    if payload.company_id is not None:
        company = db.query(Company).filter(Company.id == payload.company_id).first()
        if not company:
            raise HTTPException(status_code=404, detail="Company not found")
        contact.company_id = payload.company_id
    if payload.first_name is not None:
        first_name = _clean_text(payload.first_name)
        if not first_name:
            raise HTTPException(status_code=400, detail="First name cannot be empty")
        contact.first_name = first_name
    if payload.last_name is not None:
        last_name = _clean_text(payload.last_name)
        if not last_name:
            raise HTTPException(status_code=400, detail="Last name cannot be empty")
        contact.last_name = last_name
    if payload.email is not None:
        email = _clean_optional_text(payload.email)
        if email:
            dup = db.query(Contact).filter(Contact.email.ilike(email), Contact.id != contact_id).first()
            if dup:
                raise HTTPException(status_code=400, detail="Contact email already exists")
        contact.email = email
    if payload.phone is not None:
        contact.phone = _clean_optional_text(payload.phone)
    if payload.designation is not None:
        contact.designation = _clean_optional_text(payload.designation)

    db.commit()
    db.refresh(contact)
    return contact


@router.delete("/contacts/{contact_id}")
def delete_contact(
    contact_id: int,
    db: Session = Depends(get_db),
    current=Depends(require_role("admin", "sales")),
):
    contact = db.query(Contact).filter(Contact.id == contact_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    has_leads = db.query(Lead).filter(Lead.contact_id == contact_id).first()
    if has_leads:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete contact with existing leads",
        )

    write_audit_log(
        db,
        actor_email=current["email"],
        action="contact_deleted",
        entity_type="contact",
        entity_id=str(contact.id),
        details={"name": f"{contact.first_name} {contact.last_name}"},
    )
    db.delete(contact)
    db.commit()
    return {"message": "Contact deleted"}


# ═══════════════════════════════════════════════════════════
#  LEADS
# ═══════════════════════════════════════════════════════════

def _enrich_lead(lead: Lead, db: Session) -> dict:
    contact = db.query(Contact).filter(Contact.id == lead.contact_id).first()
    company_name = None
    contact_name = None
    if contact:
        contact_name = f"{contact.first_name} {contact.last_name}"
        company = db.query(Company).filter(Company.id == contact.company_id).first()
        company_name = company.name if company else None

    assigned_email = None
    if lead.assigned_user_id:
        user = db.query(User).filter(User.id == lead.assigned_user_id).first()
        assigned_email = user.email if user else None

    return {
        "id": lead.id,
        "title": lead.title,
        "contact_id": lead.contact_id,
        "assigned_user_id": lead.assigned_user_id,
        "status": lead.status,
        "estimated_value": lead.estimated_value,
        "notes": lead.notes,
        "created_at": lead.created_at,
        "updated_at": lead.updated_at,
        "contact_name": contact_name,
        "company_name": company_name,
        "assigned_user_email": assigned_email,
    }


@router.post("/leads", response_model=LeadOut)
def create_lead(
    payload: LeadCreate,
    db: Session = Depends(get_db),
    current=Depends(require_role("admin", "sales")),
):
    title = _clean_text(payload.title)
    if not title:
        raise HTTPException(status_code=400, detail="Lead title is required")

    contact = db.query(Contact).filter(Contact.id == payload.contact_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    if payload.status not in VALID_LEAD_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(VALID_LEAD_STATUSES)}")

    assigned_user_id = payload.assigned_user_id
    if assigned_user_id is not None:
        user = db.query(User).filter(User.id == assigned_user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="Assigned user not found")
    else:
        # Automatic Round-Robin distribution if unassigned
        assigned_user_id = get_next_round_robin_sales_user(db)

    lead = Lead(
        title=title,
        contact_id=payload.contact_id,
        assigned_user_id=assigned_user_id,
        status=payload.status,
        estimated_value=payload.estimated_value or 0.0,
        notes=_clean_optional_text(payload.notes),
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)

    write_audit_log(
        db,
        actor_email=current["email"],
        action="lead_created",
        entity_type="lead",
        entity_id=str(lead.id),
        details={"title": lead.title, "status": lead.status, "assigned_user_id": assigned_user_id},
    )
    return _enrich_lead(lead, db)


@router.post("/leads/external", response_model=LeadOut)
def create_external_lead(
    payload: ExternalLeadCreate,
    x_api_key: Optional[str] = Header(None, alias="x-api-key"),
    db: Session = Depends(get_db),
):
    """External API endpoint for automated lead ingestion (Webforms, Zapier, Ads) with Round-Robin assignment."""
    expected_key = os.getenv("LEADS_EXTERNAL_API_KEY", "smartpos_leads_live_sec_key_2026")
    if not x_api_key or x_api_key != expected_key:
        raise HTTPException(status_code=401, detail="Invalid or missing X-API-Key header")

    c_name = _clean_text(payload.company_name)
    if not c_name:
        raise HTTPException(status_code=400, detail="Company name is required")
    
    company = db.query(Company).filter(Company.name.ilike(c_name)).first()
    if not company:
        company = Company(name=c_name)
        db.add(company)
        db.commit()
        db.refresh(company)

    first_name = _clean_text(payload.contact_first_name)
    last_name = _clean_text(payload.contact_last_name)
    email = _clean_optional_text(payload.contact_email)
    contact = None
    if email:
        contact = db.query(Contact).filter(Contact.email.ilike(email)).first()
    if not contact:
        contact = Contact(
            company_id=company.id,
            first_name=first_name,
            last_name=last_name,
            email=email,
            phone=_clean_optional_text(payload.contact_phone),
            designation=_clean_optional_text(payload.designation),
        )
        db.add(contact)
        db.commit()
        db.refresh(contact)

    assigned_user_id = get_next_round_robin_sales_user(db)

    lead = Lead(
        title=_clean_text(payload.title),
        contact_id=contact.id,
        assigned_user_id=assigned_user_id,
        status=LeadStatus.NEW.value,
        estimated_value=payload.estimated_value or 0.0,
        notes=_clean_optional_text(payload.notes),
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)

    write_audit_log(
        db,
        actor_email="system_api@external.leads",
        action="external_lead_ingested",
        entity_type="lead",
        entity_id=str(lead.id),
        details={"title": lead.title, "assigned_user_id": assigned_user_id},
    )

    return _enrich_lead(lead, db)


@router.get("/leads", response_model=list[LeadOut])
def list_leads(
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _=Depends(require_role("admin", "sales")),
):
    q = db.query(Lead)
    if status is not None:
        if status not in VALID_LEAD_STATUSES:
            raise HTTPException(status_code=400, detail=f"Invalid status filter")
        q = q.filter(Lead.status == status)

    leads = q.order_by(Lead.created_at.desc()).all()
    return [_enrich_lead(l, db) for l in leads]


@router.get("/leads/{lead_id}", response_model=LeadOut)
def get_lead(
    lead_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_role("admin", "sales")),
):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return _enrich_lead(lead, db)


@router.put("/leads/{lead_id}", response_model=LeadOut)
def update_lead(
    lead_id: int,
    payload: LeadUpdate,
    db: Session = Depends(get_db),
    current=Depends(require_role("admin", "sales")),
):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    if payload.title is not None:
        title = _clean_text(payload.title)
        if not title:
            raise HTTPException(status_code=400, detail="Lead title cannot be empty")
        lead.title = title
    if payload.contact_id is not None:
        contact = db.query(Contact).filter(Contact.id == payload.contact_id).first()
        if not contact:
            raise HTTPException(status_code=404, detail="Contact not found")
        lead.contact_id = payload.contact_id
    if payload.assigned_user_id is not None:
        user = db.query(User).filter(User.id == payload.assigned_user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="Assigned user not found")
        lead.assigned_user_id = payload.assigned_user_id
    if payload.status is not None:
        if payload.status not in VALID_LEAD_STATUSES:
            raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(VALID_LEAD_STATUSES)}")
        lead.status = payload.status
    if payload.estimated_value is not None:
        lead.estimated_value = payload.estimated_value
    if payload.notes is not None:
        lead.notes = _clean_optional_text(payload.notes)

    db.commit()
    db.refresh(lead)

    write_audit_log(
        db,
        actor_email=current["email"],
        action="lead_updated",
        entity_type="lead",
        entity_id=str(lead.id),
        details={"title": lead.title, "status": lead.status},
    )
    return _enrich_lead(lead, db)


@router.delete("/leads/{lead_id}")
def delete_lead(
    lead_id: int,
    db: Session = Depends(get_db),
    current=Depends(require_role("admin", "sales")),
):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    write_audit_log(
        db,
        actor_email=current["email"],
        action="lead_deleted",
        entity_type="lead",
        entity_id=str(lead.id),
        details={"title": lead.title},
    )
    db.delete(lead)
    db.commit()
    return {"message": "Lead deleted"}
