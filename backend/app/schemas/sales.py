from pydantic import BaseModel
from typing import Optional
from datetime import datetime


# ── Company ─────────────────────────────────────────────────

class CompanyCreate(BaseModel):
    name: str
    industry: Optional[str] = None
    website: Optional[str] = None
    address: Optional[str] = None


class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    industry: Optional[str] = None
    website: Optional[str] = None
    address: Optional[str] = None


class CompanyOut(BaseModel):
    id: int
    name: str
    industry: Optional[str] = None
    website: Optional[str] = None
    address: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ── Contact ─────────────────────────────────────────────────

class ContactCreate(BaseModel):
    company_id: int
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    designation: Optional[str] = None


class ContactUpdate(BaseModel):
    company_id: Optional[int] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    designation: Optional[str] = None


class ContactOut(BaseModel):
    id: int
    company_id: int
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    designation: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ── Lead ────────────────────────────────────────────────────

class LeadCreate(BaseModel):
    title: str
    contact_id: int
    assigned_user_id: Optional[int] = None
    status: str = "New"
    estimated_value: Optional[float] = 0.0
    notes: Optional[str] = None


class LeadUpdate(BaseModel):
    title: Optional[str] = None
    contact_id: Optional[int] = None
    assigned_user_id: Optional[int] = None
    status: Optional[str] = None
    estimated_value: Optional[float] = None
    notes: Optional[str] = None


class LeadOut(BaseModel):
    id: int
    title: str
    contact_id: int
    assigned_user_id: Optional[int] = None
    status: str
    estimated_value: Optional[float] = 0.0
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    # Joined fields populated by the API layer
    contact_name: Optional[str] = None
    company_name: Optional[str] = None
    assigned_user_email: Optional[str] = None

    class Config:
        from_attributes = True


# ── External Lead Ingestion ─────────────────────────────────

class ExternalLeadCreate(BaseModel):
    title: str
    company_name: str
    contact_first_name: str
    contact_last_name: str
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    designation: Optional[str] = None
    estimated_value: Optional[float] = 0.0
    notes: Optional[str] = None
