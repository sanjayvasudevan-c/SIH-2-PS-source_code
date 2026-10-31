"""System status: the feature-status register, public, so anyone can see what is built and what is simulated."""

from __future__ import annotations

from collections import Counter
from pathlib import Path

import yaml
from fastapi import APIRouter

router = APIRouter(prefix="/api/v1/system", tags=["system"])

_REGISTER = Path(__file__).resolve().parents[1] / "feature_status.yaml"
_CLAIMS: list[dict] = yaml.safe_load(_REGISTER.read_text(encoding="utf-8")) or []


@router.get("/status")
def status():
    counts = Counter(c["status"] for c in _CLAIMS)
    return {
        "generated_from": "feature_status.yaml",
        "counts": {s: counts.get(s, 0) for s in ("PROTOTYPE", "SIMULATED", "NOT_BUILT", "EXTERNAL")},
        "claims": [
            {
                "id": c["id"],
                "title": c["title"],
                "status": c["status"],
                "routes": c.get("routes") or [],
                "tests": c.get("tests") or [],
                "note": c.get("note"),
            }
            for c in _CLAIMS
        ],
    }
