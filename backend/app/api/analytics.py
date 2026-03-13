import json
from collections import defaultdict
from datetime import date, datetime, time, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.deps import get_db
from sqlalchemy import text
from app.core.dependencies import require_role
from app.models.audit_log import AuditLog
from app.models.invoice import Invoice
from app.models.product import Product
from app.models.customer import Customer

router = APIRouter(prefix="/analytics", tags=["Analytics"])


def _as_utc(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _parse_json(raw: str | None) -> dict:
    if not raw:
        return {}
    try:
        parsed = json.loads(raw)
        return parsed if isinstance(parsed, dict) else {}
    except json.JSONDecodeError:
        return {}


def _safe_pct(current: float, previous: float) -> float:
    if previous <= 0:
        return 100.0 if current > 0 else 0.0
    return round(((current - previous) / previous) * 100.0, 2)


@router.get("/kpis")
def get_kpis(
    db: Session = Depends(get_db),
    _=Depends(require_role("admin", "manager")),
):
    total_revenue = db.execute(
        text("SELECT COALESCE(SUM(total_amount), 0) FROM invoices")
    ).scalar()

    total_customers = db.execute(
        text("SELECT COUNT(*) FROM customers")
    ).scalar()

    total_products = db.execute(
        text("SELECT COUNT(*) FROM products")
    ).scalar()

    return {
        "revenue": total_revenue,
        "customers": total_customers,
        "products": total_products,
    }


@router.get("/revenue-trend")
def revenue_trend(
    db: Session = Depends(get_db),
    _=Depends(require_role("admin", "manager")),
):
    rows = db.execute(
        text("""
            SELECT 
                DATE(created_at) AS date,
                SUM(total_amount) AS revenue
            FROM invoices
            GROUP BY DATE(created_at)
            ORDER BY DATE(created_at)
        """)
    ).fetchall()

    return [
        {
            "date": str(row.date),
            "revenue": float(row.revenue)
        }
        for row in rows
    ]

@router.get("/top-products")
def top_products(
    db: Session = Depends(get_db),
    _=Depends(require_role("admin", "manager")),
):
    rows = db.execute(
        text("""
            SELECT
                p.id AS product_id,
                p.name AS name,
                SUM(ii.quantity) AS units_sold,
                SUM(ii.quantity * ii.price_at_purchase) AS revenue
            FROM invoice_items ii
            JOIN products p ON p.id = ii.product_id
            GROUP BY p.id, p.name
            ORDER BY revenue DESC
            LIMIT 10
        """)
    ).fetchall()

    return [
        {
            "product_id": row.product_id,
            "name": row.name,
            "units_sold": int(row.units_sold or 0),
            "revenue": float(row.revenue or 0),
        }
        for row in rows
    ]


@router.get("/dashboard-v2")
def dashboard_v2(
    days: int = Query(default=7, ge=1, le=90),
    start_date: str | None = Query(default=None),
    end_date: str | None = Query(default=None),
    db: Session = Depends(get_db),
    _=Depends(require_role("admin", "manager")),
):
    now_utc = datetime.now(timezone.utc)
    today_start = datetime.combine(now_utc.date(), time.min, tzinfo=timezone.utc)

    if start_date and end_date:
        start_day = datetime.strptime(start_date, "%Y-%m-%d").date()
        end_day = datetime.strptime(end_date, "%Y-%m-%d").date()
        if end_day < start_day:
            start_day, end_day = end_day, start_day
        range_days = (end_day - start_day).days + 1
    else:
        range_days = days
        end_day = now_utc.date()
        start_day = end_day - timedelta(days=range_days - 1)

    range_start = datetime.combine(start_day, time.min, tzinfo=timezone.utc)
    range_end = datetime.combine(end_day, time.max, tzinfo=timezone.utc)
    prev_end = range_start - timedelta(microseconds=1)
    prev_start = prev_end - timedelta(days=range_days - 1)

    invoices = db.query(Invoice).all()
    customers = db.query(Customer).all()
    products = db.query(Product).filter(Product.is_active.is_(True)).all()
    audit_rows = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(1200).all()

    invoices_range = []
    invoices_prev = []
    invoices_today = []
    week_start = datetime.combine((now_utc.date() - timedelta(days=now_utc.weekday())), time.min, tzinfo=timezone.utc)
    invoices_week = []
    for inv in invoices:
        created = _as_utc(inv.created_at)
        if created is None:
            continue
        if range_start <= created <= range_end:
            invoices_range.append(inv)
        if prev_start <= created <= prev_end:
            invoices_prev.append(inv)
        if created >= today_start:
            invoices_today.append(inv)
        if created >= week_start:
            invoices_week.append(inv)

    revenue_today = round(sum(float(i.total_amount or 0.0) for i in invoices_today), 2)
    invoices_today_count = len(invoices_today)
    avg_bill_today = round((revenue_today / invoices_today_count), 2) if invoices_today_count else 0.0

    customers_today = 0
    for c in customers:
        created = _as_utc(c.created_at)
        if created and created >= today_start:
            customers_today += 1
    conversion_today = round((invoices_today_count / max(customers_today, 1)) * 100.0, 2)

    refunded_today = 0
    for row in audit_rows:
        created = _as_utc(row.created_at)
        if not created or created < today_start:
            continue
        if row.action in {"invoice_refunded", "refund_created"}:
            refunded_today += 1
    refund_rate_today = round((refunded_today / max(invoices_today_count, 1)) * 100.0, 2)

    # 7-day sparkline series for KPI cards.
    spark_days = [now_utc.date() - timedelta(days=x) for x in range(6, -1, -1)]
    invoices_by_day: defaultdict[date, int] = defaultdict(int)
    revenue_by_day: defaultdict[date, float] = defaultdict(float)
    customer_by_day: defaultdict[date, int] = defaultdict(int)
    refunds_by_day: defaultdict[date, int] = defaultdict(int)

    for inv in invoices:
        created = _as_utc(inv.created_at)
        if not created:
            continue
        d = created.date()
        if d in spark_days:
            invoices_by_day[d] += 1
            revenue_by_day[d] += float(inv.total_amount or 0.0)

    for c in customers:
        created = _as_utc(c.created_at)
        if not created:
            continue
        d = created.date()
        if d in spark_days:
            customer_by_day[d] += 1

    for row in audit_rows:
        created = _as_utc(row.created_at)
        if not created:
            continue
        d = created.date()
        if d in spark_days and row.action in {"invoice_refunded", "refund_created"}:
            refunds_by_day[d] += 1

    sparkline = {
        "revenue": [round(revenue_by_day[d], 2) for d in spark_days],
        "invoices": [invoices_by_day[d] for d in spark_days],
        "avg_bill": [round((revenue_by_day[d] / invoices_by_day[d]), 2) if invoices_by_day[d] else 0.0 for d in spark_days],
        "conversion": [round((invoices_by_day[d] / max(customer_by_day[d], 1)) * 100.0, 2) for d in spark_days],
        "refund": [round((refunds_by_day[d] / max(invoices_by_day[d], 1)) * 100.0, 2) for d in spark_days],
        "labels": [d.isoformat() for d in spark_days],
    }

    # Time intelligence panel and period comparison.
    daily_map: defaultdict[date, dict] = defaultdict(lambda: {"revenue": 0.0, "invoices": 0})
    for inv in invoices_range:
        created = _as_utc(inv.created_at)
        if not created:
            continue
        d = created.date()
        daily_map[d]["revenue"] += float(inv.total_amount or 0.0)
        daily_map[d]["invoices"] += 1

    trend = []
    cur = start_day
    while cur <= end_day:
        row = daily_map[cur]
        trend.append(
            {
                "date": cur.isoformat(),
                "revenue": round(row["revenue"], 2),
                "invoices": row["invoices"],
            }
        )
        cur += timedelta(days=1)

    cur_revenue = round(sum(float(i.total_amount or 0.0) for i in invoices_range), 2)
    cur_invoices = len(invoices_range)
    prev_revenue = round(sum(float(i.total_amount or 0.0) for i in invoices_prev), 2)
    prev_invoices = len(invoices_prev)

    # Sales heatmap (day x hour) from selected period.
    heat: defaultdict[tuple[int, int], int] = defaultdict(int)
    for inv in invoices_range:
        created = _as_utc(inv.created_at)
        if not created:
            continue
        key = (created.weekday(), created.hour)
        heat[key] += 1

    heatmap = []
    max_heat = 0
    for day_idx in range(7):
        for hour in range(24):
            count = heat[(day_idx, hour)]
            max_heat = max(max_heat, count)
            heatmap.append({"day": day_idx, "hour": hour, "count": count})

    # Cashier performance matrix from audit invoice_created in selected period.
    cashier_totals: defaultdict[str, float] = defaultdict(float)
    cashier_counts: defaultdict[str, int] = defaultdict(int)
    for row in audit_rows:
        created = _as_utc(row.created_at)
        if not created or created < range_start or created > range_end:
            continue
        if row.action != "invoice_created":
            continue
        details = _parse_json(row.details)
        total_amount = float(details.get("total_amount") or 0.0)
        email = row.actor_email or "unknown"
        cashier_totals[email] += total_amount
        cashier_counts[email] += 1

    cashier_matrix = []
    for email, total in sorted(cashier_totals.items(), key=lambda kv: kv[1], reverse=True)[:12]:
        inv_count = cashier_counts[email]
        cashier_matrix.append(
            {
                "cashier_email": email,
                "invoice_count": inv_count,
                "avg_bill": round((total / inv_count), 2) if inv_count else 0.0,
                "revenue": round(total, 2),
                "bubble": max(8, min(42, int(total / 250))),
            }
        )

    # Inventory risk block.
    total_products = len(products)
    out_of_stock = [p for p in products if int(p.stock or 0) <= 0]
    low_stock = [p for p in products if 0 < int(p.stock or 0) <= 10]
    risk_score = 0
    if total_products > 0:
        risk_score = round(min(100.0, ((len(out_of_stock) * 2 + len(low_stock)) / total_products) * 40.0), 2)

    likely_stockouts = []
    for p in sorted(products, key=lambda x: int(x.stock or 0))[:8]:
        stock = int(p.stock or 0)
        if stock <= 0:
            severity = "critical"
        elif stock <= 3:
            severity = "high"
        elif stock <= 10:
            severity = "medium"
        else:
            severity = "low"
        likely_stockouts.append(
            {
                "id": p.id,
                "name": p.name,
                "sku": p.sku,
                "stock": stock,
                "severity": severity,
            }
        )

    # Alerts + activity rail.
    important_actions = {
        "login_failed",
        "user_role_changed",
        "user_status_changed",
        "user_session_revoked",
        "price_updated",
        "product_deleted",
        "category_deleted",
    }
    alerts = []
    for row in audit_rows:
        if row.action not in important_actions:
            continue
        details = _parse_json(row.details)
        alerts.append(
            {
                "id": row.id,
                "time": row.created_at.isoformat() if row.created_at else None,
                "actor": row.actor_email,
                "action": row.action,
                "entity": row.entity_type,
                "message": details.get("target_email") or details.get("reason") or "Action recorded",
            }
        )
        if len(alerts) >= 15:
            break

    for p in likely_stockouts[:4]:
        if p["severity"] in {"critical", "high"}:
            alerts.append(
                {
                    "id": -p["id"],
                    "time": now_utc.isoformat(),
                    "actor": "system",
                    "action": "inventory_risk",
                    "entity": "product",
                    "message": f"{p['name']} ({p['sku']}) stock={p['stock']}",
                }
            )

    # Goal tracking.
    recent_14_start = now_utc - timedelta(days=14)
    rev_14 = 0.0
    for inv in invoices:
        created = _as_utc(inv.created_at)
        if created and created >= recent_14_start:
            rev_14 += float(inv.total_amount or 0.0)
    avg_daily_rev = rev_14 / 14.0
    daily_goal = round(max(4000.0, avg_daily_rev * 1.12), 2)
    weekly_goal = round(daily_goal * 7.0, 2)
    week_revenue = round(sum(float(i.total_amount or 0.0) for i in invoices_week), 2)

    hours_elapsed = max(1.0, (now_utc - today_start).total_seconds() / 3600.0)
    projected_eod = round((revenue_today / hours_elapsed) * 24.0, 2)

    return {
        "time_window": {
            "start_date": start_day.isoformat(),
            "end_date": end_day.isoformat(),
            "days": range_days,
        },
        "kpis": {
            "revenue_today": revenue_today,
            "invoices_today": invoices_today_count,
            "avg_bill_today": avg_bill_today,
            "conversion_rate_today": conversion_today,
            "refund_rate_today": refund_rate_today,
            "sparkline": sparkline,
        },
        "time_intelligence": {
            "series": trend,
            "current": {"revenue": cur_revenue, "invoices": cur_invoices},
            "previous": {"revenue": prev_revenue, "invoices": prev_invoices},
            "delta_pct": {
                "revenue": _safe_pct(cur_revenue, prev_revenue),
                "invoices": _safe_pct(cur_invoices, prev_invoices),
            },
        },
        "sales_heatmap": {
            "max_count": max_heat,
            "cells": heatmap,
            "labels": {
                "days": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
                "hours": list(range(24)),
            },
        },
        "cashier_matrix": cashier_matrix,
        "inventory_risk": {
            "total_products": total_products,
            "out_of_stock_count": len(out_of_stock),
            "low_stock_count": len(low_stock),
            "risk_score": risk_score,
            "likely_stockouts": likely_stockouts,
        },
        "alerts": alerts,
        "goals": {
            "daily_goal": daily_goal,
            "daily_actual": revenue_today,
            "daily_progress_pct": round(min(100.0, (revenue_today / max(daily_goal, 1.0)) * 100.0), 2),
            "weekly_goal": weekly_goal,
            "weekly_actual": week_revenue,
            "weekly_progress_pct": round(min(100.0, (week_revenue / max(weekly_goal, 1.0)) * 100.0), 2),
            "projected_eod": projected_eod,
        },
    }
