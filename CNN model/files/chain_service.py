"""
HerbChain Web3 Service
Submits authentication records to Ethereum smart contract + pins to IPFS.
"""

import os
import json
import hashlib
import asyncio
from pathlib import Path
from typing import Optional

from web3 import AsyncWeb3, AsyncHTTPProvider
from web3.middleware import ExtraDataToPOAMiddleware
import ipfshttpclient

# ─── Config ───────────────────────────────────────────────────────────────────

RPC_URL          = os.getenv("ETH_RPC_URL", "http://127.0.0.1:8545")  # Ganache default
CONTRACT_ADDRESS = os.getenv("CONTRACT_ADDRESS", "0x0")                # Set after deploy
PRIVATE_KEY      = os.getenv("ETH_PRIVATE_KEY")                        # Never hardcode
IPFS_API         = os.getenv("IPFS_API", "/ip4/127.0.0.1/tcp/5001")

ABI_PATH = Path(__file__).parent / "HerbChain.abi.json"

# Purity level enum mapping (matches Solidity enum order)
PURITY_ENUM = {"adulterated": 0, "acceptable": 1, "pure": 2}


# ─── Service ──────────────────────────────────────────────────────────────────

class HerbChainService:

    def __init__(self):
        self.w3          = None
        self.contract    = None
        self.account     = None
        self.ipfs_client = None
        self._ready      = False

    async def connect(self):
        """Connect to Ethereum node and IPFS."""
        # Web3 connection
        self.w3 = AsyncWeb3(AsyncHTTPProvider(RPC_URL))
        # POA middleware for Polygon / test chains
        self.w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)

        if not await self.w3.is_connected():
            raise ConnectionError(f"Cannot connect to Ethereum node at {RPC_URL}")

        # Load ABI
        if not ABI_PATH.exists():
            raise FileNotFoundError(
                f"ABI not found at {ABI_PATH}. "
                "Compile the contract and save its ABI there."
            )
        with open(ABI_PATH) as f:
            abi = json.load(f)

        self.contract = self.w3.eth.contract(
            address=AsyncWeb3.to_checksum_address(CONTRACT_ADDRESS),
            abi=abi,
        )

        # Account from private key
        if not PRIVATE_KEY:
            raise ValueError("ETH_PRIVATE_KEY env var is required")
        self.account = self.w3.eth.account.from_key(PRIVATE_KEY)

        # IPFS
        try:
            self.ipfs_client = ipfshttpclient.connect(IPFS_API)
        except Exception as e:
            print(f"Warning: IPFS connection failed ({e}). Certificates won't be pinned.")
            self.ipfs_client = None

        self._ready = True
        chain_id = await self.w3.eth.chain_id
        print(f"HerbChain service connected — chain ID {chain_id}, "
              f"account {self.account.address[:10]}...")

    # ── IPFS ──────────────────────────────────────────────────────────────────

    def pin_to_ipfs(self, data: bytes, filename: str = "cert.png") -> Optional[str]:
        """Pin bytes to IPFS, return CID or None if IPFS unavailable."""
        if not self.ipfs_client:
            return None
        try:
            result = self.ipfs_client.add_bytes(data)
            cid = result if isinstance(result, str) else result["Hash"]
            print(f"Pinned to IPFS: {cid}")
            return cid
        except Exception as e:
            print(f"IPFS pin failed: {e}")
            return None

    # ── Contract write ────────────────────────────────────────────────────────

    async def submit_record(
        self,
        cert: dict,
        cert_png: bytes,
    ) -> dict:
        """
        1. Pin certificate PNG to IPFS
        2. Submit herb record to the smart contract
        Returns tx receipt dict
        """
        if not self._ready:
            raise RuntimeError("Call await .connect() first")

        # Pin cert image to IPFS
        ipfs_cid = self.pin_to_ipfs(cert_png, f"cert_{cert['cert_id']}.png") or ""

        # Convert image hash hex → bytes32
        image_hash_bytes = bytes.fromhex(cert["image_hash"])

        # Encode purity enum
        purity_enum_val = PURITY_ENUM.get(cert["purity_label"], 0)

        # Build transaction
        nonce     = await self.w3.eth.get_transaction_count(self.account.address)
        gas_price = await self.w3.eth.gas_price

        txn = await self.contract.functions.addRecord(
            cert["cert_id"],
            cert["batch_id"],
            cert["species"],
            int(cert["confidence"] * 10000),       # → basis points
            int(cert["purity_score"] * 10000),     # → basis points
            purity_enum_val,
            cert["authenticated"],
            image_hash_bytes,
            ipfs_cid,
        ).build_transaction({
            "from":     self.account.address,
            "nonce":    nonce,
            "gasPrice": gas_price,
        })

        # Estimate gas + add 20% buffer
        estimated = await self.w3.eth.estimate_gas(txn)
        txn["gas"] = int(estimated * 1.2)

        # Sign and send
        signed  = self.w3.eth.account.sign_transaction(txn, private_key=PRIVATE_KEY)
        tx_hash = await self.w3.eth.send_raw_transaction(signed.raw_transaction)

        # Wait for confirmation (up to 60 s)
        receipt = await asyncio.wait_for(
            self.w3.eth.wait_for_transaction_receipt(tx_hash),
            timeout=60,
        )

        return {
            "tx_hash":     receipt.transactionHash.hex(),
            "block":       receipt.blockNumber,
            "gas_used":    receipt.gasUsed,
            "ipfs_cid":    ipfs_cid,
            "ipfs_url":    f"https://ipfs.io/ipfs/{ipfs_cid}" if ipfs_cid else None,
            "status":      "success" if receipt.status == 1 else "failed",
        }

    # ── Contract read ─────────────────────────────────────────────────────────

    async def verify_by_cert_id(self, cert_id: str) -> dict:
        """Look up a record by cert UUID (called by QR scanner)."""
        raw = await self.contract.functions.getRecordByCertId(cert_id).call()
        return self._decode_record(raw)

    async def verify_by_image_hash(self, image_hash_hex: str) -> dict:
        """Look up by SHA-256 image hash."""
        image_hash_bytes = bytes.fromhex(image_hash_hex)
        raw = await self.contract.functions.getRecordByHash(image_hash_bytes).call()
        return self._decode_record(raw)

    async def is_authentic(self, image_hash_hex: str) -> dict:
        """Quick authenticity check — returns bool + species."""
        image_hash_bytes = bytes.fromhex(image_hash_hex)
        authentic, revoked, species = await self.contract.functions.isAuthentic(
            image_hash_bytes
        ).call()
        return {"authentic": authentic, "revoked": revoked, "species": species}

    @staticmethod
    def _decode_record(raw) -> dict:
        """Convert Solidity struct tuple → dict."""
        purity_names = ["adulterated", "acceptable", "pure"]
        return {
            "cert_id":           raw[0],
            "batch_id":          raw[1],
            "species":           raw[2],
            "confidence":        raw[3] / 10000,
            "purity_score":      raw[4] / 10000,
            "purity_level":      purity_names[raw[5]],
            "authenticated":     raw[6],
            "image_hash":        raw[7].hex(),
            "ipfs_cid":          raw[8],
            "ipfs_url":          f"https://ipfs.io/ipfs/{raw[8]}" if raw[8] else None,
            "submitted_by":      raw[9],
            "timestamp":         raw[10],
            "revoked":           raw[11],
            "revocation_reason": raw[12],
        }


# ─── Singleton ────────────────────────────────────────────────────────────────

chain_service = HerbChainService()
