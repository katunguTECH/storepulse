import time
from collections import defaultdict

from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app import analytics, waitlist

MAX_BYTES = 15 * 1024 * 1024

app = FastAPI(title="Storepulse")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

demo_df = analytics.load_orders()

# Very simple in-memory rate limit: 5 signups per hour per IP.
_hits = defaultdict(list)


def _rate_limited(ip: str) -> bool:
    now = time.time()
    _hits[ip] = [t for t in _hits[ip] if now - t < 3600]
    if len(_hits[ip]) >= 5:
        return True
    _hits[ip].append(now)
    return False


class WaitlistIn(BaseModel):
    email: str
    website: str = ""  # honeypot: real people never fill this in


@app.get("/")
def root():
    return {"status": "Storepulse API is running"}


@app.get("/report")
def report():
    return analytics.build_report(demo_df, source="demo")


@app.post("/analyze")
async def analyze(file: UploadFile = File(...)):
    raw = await file.read()
    if len(raw) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="File is too large (15 MB maximum).")
    try:
        df, warnings = analytics.normalize_upload(raw)
        return analytics.build_report(df, source="upload", warnings=warnings)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        raise HTTPException(status_code=400, detail="We could not read this file. Please upload an order export in CSV format.")


@app.post("/waitlist")
def join_waitlist(body: WaitlistIn, request: Request):
    if body.website:  # a bot filled the hidden field; pretend it worked
        return {"ok": True}
    ip = request.client.host if request.client else "unknown"
    if _rate_limited(ip):
        raise HTTPException(status_code=429, detail="Too many attempts. Please try again later.")
    email = body.email.strip().lower()
    if not waitlist.is_valid_email(email):
        raise HTTPException(status_code=400, detail="Please enter a valid email address.")
    waitlist.add_email(email)
    return {"ok": True}
