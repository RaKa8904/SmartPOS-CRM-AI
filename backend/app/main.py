from fastapi import FastAPI, Depends
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
from fastapi.middleware.cors import CORSMiddleware
from app.core.dependencies import get_current_user
from app.api import auth
from app.db.init_db import init_db

app = FastAPI(title="SmartPOS-CRM-AI")

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


@app.get("/secure-data")
def secure_data(user=Depends(get_current_user)):
    return {"user": user}

@app.get("/")
def root():
    return {"message": "SmartPOS API running 🚀 Open /docs"}

