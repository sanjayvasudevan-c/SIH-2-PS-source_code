"""Claims register: every stated feature status is backed by real routes and tests."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))

from check_claims import check, load_claims, openapi_routes  # noqa: E402

from app.main import app  # noqa: E402

REGISTER = ROOT / "backend" / "app" / "feature_status.yaml"
SELF = "backend/tests/test_claims.py::test_checker_rejects_unknown_route"


def _routes() -> set[str]:
    return openapi_routes(app)


def test_checker_rejects_unknown_route():
    claims = [{"id": "x", "title": "t", "status": "PROTOTYPE", "routes": ["GET /api/v1/nope"], "tests": [SELF]}]
    errors = check(claims, {"GET /api/health"}, ROOT)
    assert any("GET /api/v1/nope" in e for e in errors)


def test_checker_rejects_missing_test_and_untested_prototype():
    missing = [{"id": "a", "title": "t", "status": "PROTOTYPE", "routes": [],
                "tests": ["backend/tests/test_claims.py::test_does_not_exist"]}]
    assert any("test_does_not_exist" in e for e in check(missing, set(), ROOT))
    untested = [{"id": "b", "title": "t", "status": "PROTOTYPE", "routes": [], "tests": []}]
    assert any("no tests" in e for e in check(untested, set(), ROOT))


def test_checker_rejects_routes_on_not_built():
    claims = [{"id": "c", "title": "t", "status": "NOT_BUILT", "routes": ["GET /api/health"], "tests": []}]
    assert check(claims, {"GET /api/health"}, ROOT)


def test_real_register_is_consistent():
    assert check(load_claims(REGISTER), _routes(), ROOT) == []


def test_status_endpoint_public(client, seeded):
    r = client.get("/api/v1/system/status")
    assert r.status_code == 200
    body = r.json()
    assert body["counts"]["SIMULATED"] >= 1
    assert all({"id", "title", "status"} <= set(c) for c in body["claims"])
