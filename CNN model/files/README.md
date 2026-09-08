# HerbChain — Herb Authentication System

CNN + Blockchain + IoT pipeline for authenticating and certifying herbal products using EfficientNetB4 image classification, HMAC-signed QR certificates, and Ethereum smart contracts.

---

## Architecture

```
[Mobile/Web client]
      │  image upload          QR scan
      ▼                            ▼
[FastAPI gateway]  ─────────────────────────────────────────
      │                            │
      ▼                            ▼
[EfficientNetB4 CNN]      [HerbChain smart contract]
  species + purity              on-chain record
      │                            │
      ▼                            ▼
[QR cert generator]        [IPFS cert storage]
  signed PNG + QR          immutable file pin
```

---

## Quick start

### 1. Install dependencies

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Prepare dataset

Organize images as one folder per species:

```
data/herbs/
├── tulsi/          (Holy Basil)
│   ├── img001.jpg
│   └── ...
├── ashwagandha/
├── turmeric/
├── neem/
└── ...             (aim for 500+ images per class)
```

### 3. Train the CNN

```bash
python models/train_cnn.py --data_dir data/herbs
```

Training runs in two phases:
- **Phase 1** (10 epochs): head-only training, base frozen
- **Phase 2** (30 epochs): fine-tune top 60 layers of EfficientNetB4

Expected final accuracy: **95–98%** on balanced datasets.

### 4. Deploy the smart contract

Install Hardhat or Foundry, then:

```bash
cd blockchain
npm install --save-dev hardhat @openzeppelin/contracts
npx hardhat compile
npx hardhat run scripts/deploy.js --network polygon_mumbai
```

Copy the deployed address and ABI:
```bash
cp artifacts/contracts/HerbChain.sol/HerbChain.json services/HerbChain.abi.json
```

### 5. Configure environment

```bash
cp .env.example .env
# Edit .env:
# ETH_RPC_URL=https://polygon-mumbai.g.alchemy.com/v2/YOUR_KEY
# CONTRACT_ADDRESS=0x...
# ETH_PRIVATE_KEY=0x...
# CERT_SIGNING_SECRET=your-secret-min-32-chars
```

### 6. Run the API

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

API docs: http://localhost:8000/docs

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/authenticate` | Upload herb image → CNN → cert → blockchain |
| POST | `/scan-qr` | Verify QR scan against blockchain |
| GET | `/verify/{cert_id}` | Fetch full on-chain record |
| GET | `/certificate/{cert_id}/image` | Download cert PNG |
| GET | `/stats` | Aggregated auth statistics |
| GET | `/health` | Liveness probe |

### Authenticate a herb (curl example)

```bash
curl -X POST http://localhost:8000/authenticate \
  -F "image=@leaf_photo.jpg" \
  -F "herb_hint=tulsi" \
  -F "batch_id=BATCH-2026-001" \
  -F "issue_cert=true" \
  -F "write_chain=true"
```

Response:
```json
{
  "species":         "tulsi",
  "confidence":      0.9742,
  "purity_score":    0.9120,
  "purity_label":    "pure",
  "authenticated":   true,
  "cert_id":         "uuid-here",
  "image_hash":      "sha256hex...",
  "qr_code_base64":  "iVBOR...",
  "certificate_url": "/certificate/uuid-here/image"
}
```

---

## Project structure

```
herbal_auth/
├── main.py                   # FastAPI app
├── requirements.txt
├── models/
│   └── train_cnn.py          # EfficientNetB4 training pipeline
├── services/
│   ├── inference.py          # CNN inference service
│   └── certificate.py        # QR + cert card generator
├── blockchain/
│   ├── HerbChain.sol         # Solidity smart contract
│   └── chain_service.py      # Web3 Python client
└── saved_models/             # Created after training
    ├── herbal_auth_final.keras
    └── class_indices.json
```

---

## CNN model details

| Property | Value |
|----------|-------|
| Architecture | EfficientNetB4 (ImageNet pre-trained) |
| Input size | 380 × 380 px |
| Output heads | Species (softmax) + Purity (sigmoid) |
| Phase 1 | 10 epochs, head only, LR=1e-3 |
| Phase 2 | 30 epochs, top-60 layers unfrozen, LR=5e-5 |
| Expected accuracy | 95–98% (species), MAE < 0.05 (purity) |
| Augmentations | Rotation, flip, brightness, zoom, channel shift |

---

## Purity scoring

| Score | Label | Meaning |
|-------|-------|---------|
| ≥ 0.85 | Pure | Certified authentic, issue full cert |
| 0.60–0.85 | Acceptable | Minor anomaly, cert issued with warning |
| < 0.60 | Adulterated | Authentication rejected |

---

## Blockchain record

Each authenticated herb writes to Ethereum:
- Image SHA-256 hash (tamper-proof fingerprint)
- Species + confidence (basis points)
- Purity score + level
- IPFS CID of certificate card PNG
- Timestamp + submitter address

Records are **immutable** once written. Fraudulent records can only be **revoked** (flagged, not deleted).

---

## License

MIT
