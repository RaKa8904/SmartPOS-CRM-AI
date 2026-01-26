from fastapi import FastAPI
from app.api.products import router as products_router
from app.api.billing import router as billing_router
from app.api.customers import router as customers_router

app = FastAPI(title="SmartPOS-CRM-AI")

app.include_router(products_router)
app.include_router(billing_router)
app.include_router(customers_router)

@app.get("/")
def root():
    return {"message": "SmartPOS API running 🚀 Open /docs"}
