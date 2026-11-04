from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app import analytics

app = FastAPI(title="Storepulse")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

df = analytics.load_orders()


@app.get("/")
def root():
    return {"status": "Storepulse API is running"}


@app.get("/report")
def report():
    return {
        "money_left": analytics.money_left_on_table(df),
        "monthly_revenue": analytics.monthly_revenue(df),
        "forecast": analytics.forecast(df),
        "top_products": analytics.top_products(df),
        "bundle": analytics.bundle_opportunity(df),
        "concentration": analytics.concentration(df),
    }
