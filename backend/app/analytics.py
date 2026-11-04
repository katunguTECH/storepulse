from datetime import datetime
from itertools import combinations
from pathlib import Path

import numpy as np
import pandas as pd

DATA_FILE = Path(__file__).resolve().parents[2] / "data" / "sample_orders.csv"

# Placeholder rates for testing. Replace with a daily rates table before launch.
RATES_TO_USD = {"USD": 1.0, "EUR": 1.087, "GBP": 1.266, "KES": 0.00775}

# Assumptions shown to the user, so estimates are never presented as facts.
REORDER_RATE = 0.30   # share of "due" customers who reorder if nudged
WIN_BACK_RATE = 0.10  # share of lapsed customers who return if targeted


def load_orders(path=DATA_FILE):
    df = pd.read_csv(path, parse_dates=["created_at_utc"])
    df["amount_usd"] = df.apply(lambda r: r["amount"] * RATES_TO_USD[r["currency"]], axis=1)
    return df


def _current_month_start():
    return pd.Timestamp(datetime.utcnow()).to_period("M").to_timestamp()


def top_products(df, n=5):
    g = df.groupby("product").agg(revenue_usd=("amount_usd", "sum"), units=("quantity", "sum"))
    return g.sort_values("revenue_usd", ascending=False).head(n).round(2).reset_index().to_dict("records")


def monthly_revenue(df):
    m = df.set_index("created_at_utc").resample("MS")["amount_usd"].sum().round(2)
    cur = _current_month_start()
    return [
        {"month": k.strftime("%Y-%m"), "revenue_usd": float(v), "partial": bool(k >= cur)}
        for k, v in m.items()
    ]


def forecast(df, horizon=3, lookback=12):
    full = [r for r in monthly_revenue(df) if not r["partial"]][-lookback:]
    if len(full) < 4:
        return []
    y = np.array([r["revenue_usd"] for r in full])
    x = np.arange(len(y))
    slope, intercept = np.polyfit(x, y, 1)
    band = float((y - (slope * x + intercept)).std())
    last = pd.Period(full[-1]["month"], freq="M")
    out = []
    for i in range(1, horizon + 1):
        v = slope * (len(y) - 1 + i) + intercept
        out.append({
            "month": str(last + i),
            "forecast_usd": round(float(v), 2),
            "low_usd": round(float(max(v - band, 0)), 2),
            "high_usd": round(float(v + band), 2),
        })
    return out


def money_left_on_table(df):
    now = df["created_at_utc"].max()
    due_n = lapsed_n = 0
    due_val = lapsed_val = 0.0
    for _, g in df.groupby("customer_id"):
        if len(g) < 2:
            continue
        dates = g["created_at_utc"].sort_values()
        gap = max(float(dates.diff().dropna().dt.total_seconds().median()) / 86400, 1.0)
        since = (now - dates.iloc[-1]).total_seconds() / 86400
        aov = float(g["amount_usd"].mean())
        if since >= gap * 2.5:
            lapsed_n += 1
            lapsed_val += aov * WIN_BACK_RATE
        elif since >= gap:
            due_n += 1
            due_val += aov * REORDER_RATE
    items = [
        {
            "title": f"{due_n} customers are overdue to reorder",
            "detail": "They usually buy every few weeks and have gone past their normal gap. A reminder email could bring them back.",
            "value_usd": round(due_val, 2),
        },
        {
            "title": f"{lapsed_n} customers have gone quiet",
            "detail": "They are far past their normal buying rhythm. A win-back offer is worth testing.",
            "value_usd": round(lapsed_val, 2),
        },
    ]
    return {
        "total_usd": round(due_val + lapsed_val, 2),
        "items": items,
        "assumptions": f"Estimate assumes {int(REORDER_RATE*100)}% of overdue and {int(WIN_BACK_RATE*100)}% of quiet customers respond to one targeted message, at their average order value.",
    }


def bundle_opportunity(df):
    baskets = df.groupby("customer_id")["product"].apply(set)
    counts = {}
    for s in baskets:
        for pair in combinations(sorted(s), 2):
            counts[pair] = counts.get(pair, 0) + 1
    if not counts:
        return None
    (a, b), c = max(counts.items(), key=lambda kv: kv[1])
    return {"products": [a, b], "customers": int(c), "share_of_customers": round(c / len(baskets), 3)}


def concentration(df):
    rev = df.groupby("product")["amount_usd"].sum().sort_values(ascending=False)
    return {"product": rev.index[0], "share": round(float(rev.iloc[0] / rev.sum()), 3)}
