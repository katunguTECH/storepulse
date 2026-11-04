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


# ---------------- Upload support ----------------
import hashlib
import io

# Placeholder rates for testing only. Replace with a daily rates table before launch.
RATES_TO_USD.update({
    "AUD": 0.65, "CAD": 0.72, "NZD": 0.59, "CHF": 1.13, "SEK": 0.095, "NOK": 0.092,
    "DKK": 0.146, "PLN": 0.25, "JPY": 0.0066, "INR": 0.012, "NGN": 0.00065,
    "ZAR": 0.055, "GHS": 0.085, "UGX": 0.00027, "TZS": 0.00038, "AED": 0.272,
    "SAR": 0.267, "BRL": 0.18, "MXN": 0.052, "SGD": 0.75, "TRY": 0.029,
    "PHP": 0.017, "IDR": 0.000063, "MYR": 0.22,
})

ALIASES = {
    "order_id": ["name", "order id", "order_id", "order number", "order"],
    "customer_id": ["email", "buyer email", "customer email", "buyer user id", "customer_id", "customer", "buyer", "full name"],
    "product": ["lineitem name", "item name", "product", "product name", "title"],
    "quantity": ["lineitem quantity", "quantity", "qty"],
    "price": ["lineitem price", "price", "unit price"],
    "currency": ["currency"],
    "date": ["created at", "sale date", "date", "order date", "created_at"],
}


def _hash_id(value):
    return hashlib.sha256(str(value).strip().lower().encode("utf-8")).hexdigest()[:12]


def normalize_upload(raw: bytes):
    warnings = []
    df = pd.read_csv(io.BytesIO(raw), dtype=str, encoding="utf-8-sig")
    cols = {c.strip().lower(): c for c in df.columns}

    pick = {}
    for field, names in ALIASES.items():
        for n in names:
            if n in cols:
                pick[field] = cols[n]
                break

    required = ["order_id", "customer_id", "product", "price", "date"]
    missing = [f for f in required if f not in pick]
    if missing:
        raise ValueError(
            "This file is missing columns we need (" + ", ".join(missing) + "). "
            "Please upload an order export CSV from Shopify or Etsy."
        )

    out = pd.DataFrame({k: df[v] for k, v in pick.items()})
    total_rows = len(out)

    # Drop refunded / voided orders when the export says so (Shopify)
    if "financial status" in cols:
        status = df[cols["financial status"]].fillna("").str.strip().str.lower()
        bad = status.isin(["refunded", "voided"])
        if bad.any():
            warnings.append(f"Skipped {int(bad.sum())} refunded or voided rows.")
            out = out[~bad.values]

    # Shopify only fills order-level fields on the first row of each order
    for c in ("customer_id", "date", "currency"):
        if c in out.columns:
            out[c] = out.groupby("order_id")[c].transform(lambda s: s.ffill().bfill())

    if "quantity" in out.columns:
        qty = pd.to_numeric(out["quantity"], errors="coerce").fillna(1)
    else:
        qty = pd.Series(1, index=out.index)
    price = pd.to_numeric(out["price"].str.replace(r"[^0-9.\-]", "", regex=True), errors="coerce")
    out["quantity"] = qty
    out["amount"] = price * qty
    out["created_at_utc"] = pd.to_datetime(out["date"], utc=True, errors="coerce").dt.tz_convert(None)

    if "currency" not in out.columns:
        out["currency"] = "USD"
        warnings.append("No currency column found, so all amounts were treated as USD.")
    out["currency"] = out["currency"].fillna("USD").str.strip().str.upper()

    out = out.dropna(subset=["customer_id", "product", "created_at_utc", "amount"])

    unknown = sorted(set(out["currency"]) - set(RATES_TO_USD))
    if unknown:
        n = int(out["currency"].isin(unknown).sum())
        warnings.append(f"Skipped {n} rows in currencies we cannot convert yet: {', '.join(unknown)}.")
        out = out[~out["currency"].isin(unknown)]

    dropped = total_rows - len(out)
    if dropped > 0 and not any("Skipped" in w for w in warnings):
        warnings.append(f"Skipped {dropped} rows with missing dates, customers, or prices.")

    if len(out) < 20:
        raise ValueError("We found fewer than 20 usable order rows. Upload a larger export (at least a few months of orders).")

    out["customer_id"] = out["customer_id"].map(_hash_id)
    out["amount_usd"] = out["amount"] * out["currency"].map(RATES_TO_USD)
    cols_out = ["order_id", "customer_id", "product", "quantity", "currency", "amount", "created_at_utc", "amount_usd"]
    return out[cols_out].reset_index(drop=True), warnings


def build_report(df, source="upload", warnings=None):
    return {
        "meta": {
            "source": source,
            "orders": int(df["order_id"].nunique()),
            "customers": int(df["customer_id"].nunique()),
            "start": df["created_at_utc"].min().strftime("%Y-%m-%d"),
            "end": df["created_at_utc"].max().strftime("%Y-%m-%d"),
            "warnings": warnings or [],
        },
        "money_left": money_left_on_table(df),
        "monthly_revenue": monthly_revenue(df),
        "forecast": forecast(df),
        "top_products": top_products(df),
        "bundle": bundle_opportunity(df),
        "concentration": concentration(df),
    }
