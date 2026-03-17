from fastapi import FastAPI, Depends
from starlette.middleware.base import BaseHTTPMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.core.limiter import limiter
from app.api.products import router as products_router
from app.api.billing import router as billing_router
from app.api.customers import router as customers_router
from app.api.customer_history import router as customer_history_router
from app.api.pricing import router as pricing_router
from app.api.price_drops import router as price_drops_router
from app.api.notifications import router as notifications_router
from app.api.ml_customers import router as ml_customers_router
from app.api.ml_recommendations import router as ml_recommendations_router
from app.api.ml_price import router as ml_price_router
from app.api.analytics import router as analytics_router
from app.api.categories import router as categories_router
from app.api.users import router as users_router
from app.api.audit_logs import router as audit_logs_router
from app.api.user_activity import router as user_activity_router
from app.api.ml_advanced import router as ml_advanced_router
from fastapi.middleware.cors import CORSMiddleware
from app.core.dependencies import get_current_user
from app.api import auth
from app.db.init_db import init_db


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=()"
        response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
        return response


app = FastAPI(title="SmartPOS-CRM-AI")

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SecurityHeadersMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()

app.include_router(products_router)
app.include_router(billing_router)
app.include_router(customers_router)
app.include_router(customer_history_router)
app.include_router(pricing_router)
app.include_router(price_drops_router)
app.include_router(notifications_router)
app.include_router(ml_customers_router)
app.include_router(ml_recommendations_router)
app.include_router(ml_price_router)
app.include_router(analytics_router)
app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(categories_router)
app.include_router(users_router)
app.include_router(audit_logs_router)
app.include_router(user_activity_router)
app.include_router(ml_advanced_router)


@app.get("/secure-data")
def secure_data(user=Depends(get_current_user)):
    return {"user": user}

@app.get("/")
def root():
    return {"message": "SmartPOS API running 🚀 Open /docs"}

