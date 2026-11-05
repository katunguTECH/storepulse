import os
import time
from collections import defaultdict

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app import analytics, seo, waitlist

MAX_BYTES = 4 * 1024 * 1024
ORIGINS = [
    o.strip()
    for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")
    if o.strip()
]

app = FastAPI(title="Storepulse")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

demo_df = analytics.load_orders()

# Simple in-memory rate limit: 5 signups per hour per visitor IP.
_hits = defaultdict(list)


def _client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for", "")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


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


class SeoIn(BaseModel):
    title: str = Field(default="", max_length=300)
    description: str = Field(default="", max_length=10000)
    tags: str = Field(default="", max_length=1000)
    keyword: str = Field(default="", max_length=100)
    platform: str = Field(default="etsy", max_length=20)


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
        raise HTTPException(status_code=413, detail="File is too large (4 MB maximum).")
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
    if _rate_limited(_client_ip(request)):
        raise HTTPException(status_code=429, detail="Too many attempts. Please try again later.")
    email = body.email.strip().lower()
    if not waitlist.is_valid_email(email):
        raise HTTPException(status_code=400, detail="Please enter a valid email address.")
    try:
        waitlist.add_email(email)
    except Exception:
        raise HTTPException(status_code=500, detail="We could not save your email right now. Please try again later.")
    return {"ok": True}


@app.post("/seo-score")
def seo_score(body: SeoIn):
    if not body.title.strip():
        raise HTTPException(status_code=400, detail="Please paste your listing title.")
    return seo.score_listing(body.title, body.description, body.tags, body.keyword, body.platform)

