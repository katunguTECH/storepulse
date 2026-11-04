import random
from pathlib import Path
import pandas as pd
from datetime import datetime, timedelta

DATA_DIR = Path(__file__).resolve().parents[2] / "data"
DATA_DIR.mkdir(exist_ok=True)

random.seed(42)
products = [
    ("Soy Candle", 18.0), ("Wax Melts", 9.0), ("Candle Gift Set", 45.0),
    ("Reed Diffuser", 28.0), ("Matches Box", 6.0), ("Ceramic Holder", 22.0),
]
currencies = {"USD": 1.0, "EUR": 0.92, "GBP": 0.79, "KES": 129.0}
rows = []
start = datetime.utcnow() - timedelta(days=365)
for i in range(3000):
    name, price = random.choice(products)
    cur = random.choice(list(currencies))
    qty = random.randint(1, 3)
    rows.append({
        "order_id": i + 1,
        "customer_id": random.randint(1, 600),
        "product": name,
        "quantity": qty,
        "currency": cur,
        "amount": round(price * qty * currencies[cur], 2),
        "created_at_utc": start + timedelta(days=random.randint(0, 364), hours=random.randint(0, 23)),
    })
out = DATA_DIR / "sample_orders.csv"
pd.DataFrame(rows).to_csv(out, index=False)
print("Created", out, "with", len(rows), "orders")
