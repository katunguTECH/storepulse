import csv
from pathlib import Path

from waitlist import all_signups

rows = all_signups()
print(f"{len(rows)} signups")
for email, created, source in rows:
    print(created, email, source)

out = Path(__file__).resolve().parents[2] / "data" / "waitlist.csv"
with open(out, "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["email", "created_at", "source"])
    w.writerows(rows)
print("Exported to", out)
