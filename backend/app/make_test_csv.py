from pathlib import Path
import pandas as pd

data = Path(__file__).resolve().parents[2] / "data"
d = pd.read_csv(data / "sample_orders.csv", parse_dates=["created_at_utc"])
out = pd.DataFrame({
    "Name": "#" + (1000 + d["order_id"]).astype(str),
    "Email": "cust" + d["customer_id"].astype(str) + "@example.com",
    "Financial Status": "paid",
    "Created at": d["created_at_utc"].dt.strftime("%Y-%m-%d %H:%M:%S") + " +0000",
    "Currency": d["currency"],
    "Lineitem name": d["product"],
    "Lineitem quantity": d["quantity"],
    "Lineitem price": (d["amount"] / d["quantity"]).round(2),
})
out.to_csv(data / "shopify_style_test.csv", index=False)
print("Created", data / "shopify_style_test.csv")
