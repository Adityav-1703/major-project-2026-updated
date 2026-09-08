"""
QR Certificate Generator
Generates a signed QR code embedding a herb authenticity certificate.
The QR payload links to the on-chain verification endpoint.
"""

import json
import hmac
import hashlib
import base64
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional
import io

import qrcode
from PIL import Image, ImageDraw, ImageFont
import os

from inference import AuthResult

def rounded_rectangle(draw, bbox, radius, fill):
   
    x1, y1, x2, y2 = bbox
    r = min(radius, (x2 - x1) // 2, (y2 - y1) // 2)
    points = [
        (x1 + r, y1),
        (x2 - r, y1),
        (x2, y1 + r),
        (x2, y2 - r),
        (x2 - r, y2),
        (x1 + r, y2),
        (x1, y2 - r),
        (x1, y1 + r),
        (x1 + r, y1),
    ]
    draw.polygon(points, fill=fill)


CERT_DIR     = Path("certificates")
CERT_DIR.mkdir(exist_ok=True)

QR_BASE_URL  = "https://herbchain.io/verify"  # Replace with your domain
CERT_VERSION = "1.0"

# HMAC secret — in production, load from env / Vault
import os
SIGNING_SECRET = os.getenv("CERT_SIGNING_SECRET", "change-me-in-production-use-vault")



def build_certificate(result: AuthResult, batch_id: str = None) -> dict:
    """
    Builds a signed certificate dict from an auth result.
    Signed with HMAC-SHA256 so the QR payload is tamper-evident.
    """
    cert_id = str(uuid.uuid4())
    issued  = datetime.now(timezone.utc).isoformat()
    expires = (datetime.now(timezone.utc) + timedelta(days=365)).isoformat()

    payload = {
        "version":      CERT_VERSION,
        "cert_id":      cert_id,
        "batch_id":     batch_id or cert_id[:8].upper(),
        "species":      result.species,
        "confidence":   result.confidence,
        "purity_score": result.purity_score,
        "purity_label": result.purity_label,
        "image_hash":   result.image_hash,
        "issued_at":    issued,
        "expires_at":   expires,
        "authenticated": result.authenticated,
        "metadata":     result.metadata,
    }

    
    payload_bytes = json.dumps(payload, sort_keys=True).encode()
    signature = hmac.new(
        SIGNING_SECRET.encode(), payload_bytes, hashlib.sha256
    ).hexdigest()

    payload["signature"] = signature
    return payload


def verify_certificate(cert: dict) -> bool:
    """Verify the HMAC signature of a certificate."""
    received_sig = cert.pop("signature", None)
    if not received_sig:
        return False

    payload_bytes = json.dumps(cert, sort_keys=True).encode()
    expected_sig  = hmac.new(
        SIGNING_SECRET.encode(), payload_bytes, hashlib.sha256
    ).hexdigest()

    cert["signature"] = received_sig  # restore
    return hmac.compare_digest(received_sig, expected_sig)




def generate_qr(cert: dict) -> Image.Image:
    """
    Generates a styled QR code image.
    The QR data is: verify_url?cert_id=...&sig=...
    so a scanner can call the verification API directly.
    """
    verify_url = (
        f"{QR_BASE_URL}"
        f"?cert_id={cert['cert_id']}"
        f"&sig={cert['signature'][:16]}"  # Short sig for URL; full sig stored on-chain
    )

    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_H,  # 30% restoration
        box_size=10,
        border=2,
    )
    qr.add_data(verify_url)
    qr.make(fit=True)

    qr_image = qr.make_image(fill_color=(22, 78, 99), back_color=(255, 255, 255)).convert("RGB")

    return qr_image



def _purity_color(label: str) -> tuple:
    return {
        "pure":        (34, 197, 94),    # green
        "acceptable":  (234, 179,  8),   # amber
        "adulterated": (239, 68,  68),   # red
    }.get(label, (107, 114, 128))


def generate_certificate_card(cert: dict, output_path: str = None) -> bytes:
    """
    Renders a printable/shareable certificate card as PNG bytes.
    Layout: header | herb info | purity badge | QR code | footer
    """
    W, H = 800, 480
    card = Image.new("RGB", (W, H), (252, 252, 252))
    draw = ImageDraw.Draw(card)

    
    try:
        font_path = "C:/Windows/Fonts/arial.ttf"
        font_title  = ImageFont.truetype(font_path, 24)
        font_body   = ImageFont.truetype(font_path, 15)
        font_small  = ImageFont.truetype(font_path, 12)
        font_badge  = ImageFont.truetype(font_path, 18)
    except OSError:
        try:
            font_path = "C:/Windows/Fonts/segoeui.ttf"
            font_title  = ImageFont.truetype(font_path, 24)
            font_body   = ImageFont.truetype(font_path, 15)
            font_small  = ImageFont.truetype(font_path, 12)
            font_badge  = ImageFont.truetype(font_path, 18)
        except OSError:
            font_title = font_body = font_small = font_badge = ImageFont.load_default()

    # Header bar
    draw.rectangle([(0, 0), (W, 60)], fill=(22, 78, 99))
    draw.text((24, 16), "HerbChain Authenticity Certificate", font=font_title, fill=(255, 255, 255))

    # Cert ID + timestamp
    draw.text((24, 80), f"Certificate ID: {cert['cert_id']}", font=font_small, fill=(75, 85, 99))
    draw.text((24, 98), f"Issued: {cert['issued_at'][:19].replace('T', ' ')} UTC", font=font_small, fill=(75, 85, 99))
    draw.text((24, 116), f"Expires: {cert['expires_at'][:10]}", font=font_small, fill=(75, 85, 99))

    # Herb info
    draw.text((24, 150), f"Species", font=font_small, fill=(107, 114, 128))
    draw.text((24, 168), cert["species"].replace("_", " ").title(), font=font_title, fill=(17, 24, 39))

    draw.text((24, 210), f"Batch ID: {cert['batch_id']}", font=font_body, fill=(55, 65, 81))
    draw.text((24, 232), f"Image hash: {cert['image_hash'][:32]}...", font=font_small, fill=(107, 114, 128))
    draw.text((24, 252), f"Model confidence: {cert['confidence']:.1%}", font=font_body, fill=(55, 65, 81))

    # Purity badge
    p_color = _purity_color(cert["purity_label"])
    rounded_rectangle(draw, (24, 280, 200, 320), 10, p_color)
    draw.text(
        (112, 300),
        f"Purity: {cert['purity_label'].upper()}  ({cert['purity_score']:.0%})",
        font=font_badge,
        fill=(255, 255, 255),
        anchor="mm",
    )

    # Auth status badge
    status_color = (34, 197, 94) if cert["authenticated"] else (239, 68, 68)
    status_text  = "AUTHENTICATED" if cert["authenticated"] else "REJECTED"
    rounded_rectangle(draw, (24, 332, 200, 372), 10, status_color)
    draw.text((112, 352), status_text, font=font_badge, fill=(255, 255, 255), anchor="mm")

    # Signature snippet
    draw.text((24, 395), "Digital signature (SHA-256 HMAC):", font=font_small, fill=(107, 114, 128))
    draw.text((24, 412), cert["signature"][:48] + "...", font=font_small, fill=(75, 85, 99))

    # QR code (right side)
    qr_img = generate_qr(cert).resize((200, 200), Image.LANCZOS)
    card.paste(qr_img, (570, 140))
    draw.text((590, 348), "Scan to verify", font=font_small, fill=(75, 85, 99))

    # Footer
    draw.rectangle([(0, H - 36), (W, H)], fill=(243, 244, 246))
    draw.text(
        (W // 2, H - 18),
        "Secured by HerbChain  |  Powered by EfficientNetB4 CNN  |  IPFS + Ethereum",
        font=font_small,
        fill=(107, 114, 128),
        anchor="mm",
    )

    # Save / return
    buf = io.BytesIO()
    card.save(buf, format="PNG", dpi=(300, 300))
    png_bytes = buf.getvalue()

    if output_path:
        Path(output_path).write_bytes(png_bytes)

    return png_bytes


# --- Main entry ---------------------------------------------------------------

def issue_certificate(result: AuthResult, batch_id: str = None) -> tuple[dict, bytes]:
    """
    Full certificate issuance pipeline:
      1. Build signed cert dict
      2. Render certificate card PNG
    Returns (cert_dict, card_png_bytes)
    """
    cert      = build_certificate(result, batch_id)
    card_png  = generate_certificate_card(cert)
    return cert, card_png


if __name__ == "__main__":
    '''Standalone demo: generate test certificate PNG.'''
    class DummyAuthResult:
        def __init__(self, **kwargs):
            for k, v in kwargs.items():
                setattr(self, k, v)

    result = DummyAuthResult(
        species='tulsi',
        confidence=0.974,
        purity_score=0.912,
        purity_label='pure',
        authenticated=True,
        image_hash='a1b2c3d4e5f67890123456789abcdef',
        metadata={'batch_id': 'DEMO-001'}
    )
    cert_dict, png_bytes = issue_certificate(result)
    output_path = 'demo_certificate.png'
    Path(output_path).write_bytes(png_bytes)
    print(f'Demo certificate generated: {output_path}')
    print(f'Cert ID: {cert_dict["cert_id"]}')
    print('QR links to verification API')
