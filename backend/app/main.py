from fastapi import FastAPI
from app.api.products import router as products_router
from app.api.billing import router as billing_router
from app.api.customers import router as customers_router
from app.api.customer_history import router as customer_history_router
from app.api.pricing import router as pricing_router
from app.api.price_drops import router as price_drops_router


app = FastAPI(title="SmartPOS-CRM-AI")

app.include_router(products_router)
app.include_router(billing_router)
app.include_router(customers_router)
app.include_router(customer_history_router)
app.include_router(pricing_router)
app.include_router(price_drops_router)

@app.get("/")
def root():
    return {"message": "SmartPOS API running 🚀 Open /docs"}
