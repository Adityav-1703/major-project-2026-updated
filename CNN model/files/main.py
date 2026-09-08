"""
HerbChain FastAPI Application
Endpoints:
  POST /authenticate        — Upload herb image → CNN → certificate → blockchain
  POST /scan-qr             — QR code scan → blockchain verify
  GET  /verify/{cert_id}    — Get on-chain record by cert ID
  GET  /certificate/{cert_id}/image — Download cert card PNG
  GET  /health              — Liveness probe
"""

import io
import base64
import asyncio
from pathlib import Path
from typing import Optional, Annotated

from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Depends, Request
from fastapi.responses import Response, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from pydantic import BaseModel, Field
import structlog

from services.inference    import auth_service
from services.certificate  import issue_certificate, verify_certificate
from blockchain.chain_service import chain_service

# ─── Logging ──────────────────────────────────────────────────────────────────

log = structlog.get_logger()

# ─── Rate limiter ─────────────────────────────────────────────────────────────

limiter = Limiter(key_func=get_remote_address)

# ─── App ──────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="HerbChain Authentication API",
    description=(
        "CNN-powered herb authentication with blockchain certificate issuance. "
        "Classifies herb species, scores purity, generates QR certificates, "
        "and writes immutable records to Ethereum."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],    # Restrict in production
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── In-memory cert store (replace with Redis/Postgres in production) ─────────
cert_store: dict[str, tuple[dict, bytes]] = {}  # cert_id → (cert_dict, card_png)


# ─── Startup / shutdown ───────────────────────────────────────────────────────

@app.on_event("startup")
async def startup():
    log.info("Loading CNN model...")
    auth_service.load()

    log.info("Connecting to blockchain...")
    try:
        await chain_service.connect()
    except Exception as e:
        log.warning("Blockchain connection failed at startup (non-fatal)", error=str(e))

    log.info("HerbChain API ready.")


# ─── Schemas ──────────────────────────────────────────────────────────────────

class AuthResponse(BaseModel):
    species:          str
    confidence:       float
    purity_score:     float
    purity_label:     str
    authenticated:    bool
    cert_id:          str
    image_hash:       str
    qr_code_base64:   Optional[str] = None
    certificate_url:  Optional[str] = None
    blockchain_tx:    Optional[str] = None
    rejection_reason: Optional[str] = None


class VerifyResponse(BaseModel):
    cert_id:      str
    species:      str
    authenticated: bool
    purity_level: str
    purity_score: float
    confidence:   float
    revoked:      bool
    timestamp:    int
    ipfs_url:     Optional[str]


class QRScanRequest(BaseModel):
    cert_id: str = Field(..., description="cert_id parsed from QR code URL")


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "model_loaded": auth_service._loaded}


@app.post("/authenticate", response_model=AuthResponse, summary="Authenticate a herb image")
@limiter.limit("30/minute")
async def authenticate(
    request: Request,
    image: UploadFile = File(..., description="Herb leaf image (JPG/PNG, max 10 MB)"),
    herb_hint: Optional[str] = Form(None, description="Declared species name (optional)"),
    batch_id:  Optional[str] = Form(None, description="Supply chain batch ID (optional)"),
    issue_cert: bool         = Form(True, description="Generate QR certificate?"),
    write_chain: bool        = Form(True, description="Write record to blockchain?"),
):
    """
    Full authentication pipeline:
    1. Receive herb image
    2. Run EfficientNetB4 → species + purity
    3. Issue signed certificate + QR code
    4. Write record to Ethereum (async, non-blocking)
    """
    # Validate upload
    if image.content_type not in ("image/jpeg", "image/png", "image/webp"):
        raise HTTPException(415, "Only JPEG, PNG, and WebP images are accepted.")

    image_bytes = await image.read()
    if len(image_bytes) > 10 * 1024 * 1024:
        raise HTTPException(413, "Image exceeds 10 MB limit.")
    if len(image_bytes) < 1024:
        raise HTTPException(400, "Image too small or corrupt.")

    # CNN inference
    try:
        result = auth_service.predict(image_bytes, herb_name_hint=herb_hint)
    except Exception as e:
        log.error("CNN inference failed", error=str(e))
        raise HTTPException(500, "Model inference failed. Please try again.")

    log.info(
        "Inference complete",
        species=result.species,
        confidence=result.confidence,
        purity=result.purity_score,
        authenticated=result.authenticated,
    )

    # Certificate issuance
    cert_dict, card_png = None, None
    qr_b64, cert_url, tx_hash = None, None, None

    if issue_cert:
        cert_dict, card_png = issue_certificate(result, batch_id)
        cert_store[cert_dict["cert_id"]] = (cert_dict, card_png)

        # Embed QR code as base64 for immediate display
        from services.certificate import generate_qr
        qr_img = generate_qr(cert_dict)
        buf = io.BytesIO()
        qr_img.save(buf, format="PNG")
        qr_b64   = base64.b64encode(buf.getvalue()).decode()
        cert_url = f"/certificate/{cert_dict['cert_id']}/image"

    # Blockchain write (fire-and-forget — don't block the response)
    if write_chain and cert_dict and chain_service._ready:
        async def _write():
            try:
                tx = await chain_service.submit_record(cert_dict, card_png)
                log.info("Blockchain write success", tx_hash=tx["tx_hash"])
            except Exception as e:
                log.error("Blockchain write failed", error=str(e))

        asyncio.create_task(_write())

    return AuthResponse(
        species          = result.species,
        confidence       = result.confidence,
        purity_score     = result.purity_score,
        purity_label     = result.purity_label,
        authenticated    = result.authenticated,
        cert_id          = cert_dict["cert_id"] if cert_dict else "",
        image_hash       = result.image_hash,
        qr_code_base64   = qr_b64,
        certificate_url  = cert_url,
        rejection_reason = result.rejection_reason,
    )


@app.post("/scan-qr", summary="Verify QR code scan")
@limiter.limit("60/minute")
async def scan_qr(request: Request, body: QRScanRequest):
    """
    Called when a user scans a HerbChain QR code.
    Looks up the record on-chain and returns authenticity status.
    """
    # Try on-chain first
    if chain_service._ready:
        try:
            record = await chain_service.verify_by_cert_id(body.cert_id)
            return {
                "source":    "blockchain",
                "verified":  True,
                "authentic": record["authenticated"] and not record["revoked"],
                "record":    record,
            }
        except Exception as e:
            log.warning("On-chain lookup failed, falling back to local", error=str(e))

    # Fallback to local cert store
    entry = cert_store.get(body.cert_id)
    if not entry:
        raise HTTPException(404, "Certificate not found. It may not be written to chain yet.")

    cert_dict, _ = entry
    sig_valid = verify_certificate(dict(cert_dict))  # verify_certificate mutates — copy it

    return {
        "source":    "local",
        "verified":  sig_valid,
        "authentic": cert_dict["authenticated"] and sig_valid,
        "record":    cert_dict,
    }


@app.get("/verify/{cert_id}", response_model=VerifyResponse, summary="Get on-chain record")
async def verify(cert_id: str):
    """Fetch the full on-chain record for a cert ID."""
    if not chain_service._ready:
        raise HTTPException(503, "Blockchain service unavailable.")
    try:
        record = await chain_service.verify_by_cert_id(cert_id)
        return VerifyResponse(**record)
    except Exception as e:
        raise HTTPException(404, f"Record not found: {e}")


@app.get("/certificate/{cert_id}/image", summary="Download certificate card PNG")
async def get_certificate_image(cert_id: str):
    """Returns the printable certificate card as PNG."""
    entry = cert_store.get(cert_id)
    if not entry:
        raise HTTPException(404, "Certificate image not found.")
    _, card_png = entry
    return Response(
        content=card_png,
        media_type="image/png",
        headers={"Content-Disposition": f'attachment; filename="herbchain_cert_{cert_id[:8]}.png"'},
    )


@app.get("/stats", summary="Aggregated authentication statistics")
async def stats():
    """Returns counts of authenticated vs rejected records."""
    if not chain_service._ready:
        return {"error": "Blockchain unavailable", "local_certs": len(cert_store)}
    total_auth = await chain_service.contract.functions.totalAuthenticated().call()
    total_rej  = await chain_service.contract.functions.totalRejected().call()
    total_rev  = await chain_service.contract.functions.totalRevoked().call()
    return {
        "total_authenticated": total_auth,
        "total_rejected":      total_rej,
        "total_revoked":       total_rev,
        "total_records":       total_auth + total_rej,
    }


# ─── Entry ────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
