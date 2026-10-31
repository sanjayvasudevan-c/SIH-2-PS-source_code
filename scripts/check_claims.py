"""Check the feature-status register against the code.

Every PROTOTYPE or SIMULATED claim must name tests that exist; every listed route must exist in the app;
NOT_BUILT and EXTERNAL claims may not list routes. Run: python scripts/check_claims.py (exit 1 on errors).
"""

from __future__ import annotations

import ast
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
REGISTER = ROOT / "backend" / "app" / "feature_status.yaml"
STATUSES = ("PROTOTYPE", "SIMULATED", "NOT_BUILT", "EXTERNAL")
NEEDS_TESTS = ("PROTOTYPE", "SIMULATED")


def load_claims(path: Path) -> list[dict]:
    return yaml.safe_load(path.read_text(encoding="utf-8")) or []


def _functions(path: Path) -> set[str]:
    tree = ast.parse(path.read_text(encoding="utf-8"))
    return {n.name for n in ast.walk(tree) if isinstance(n, ast.FunctionDef | ast.AsyncFunctionDef)}


def check(claims: list[dict], routes: set[str], repo_root: Path) -> list[str]:
    errors: list[str] = []
    seen: set[str] = set()
    cache: dict[Path, set[str]] = {}
    for c in claims:
        cid = c.get("id", "?")
        if cid in seen:
            errors.append(f"{cid}: duplicate id")
        seen.add(cid)
        status = c.get("status")
        if status not in STATUSES:
            errors.append(f"{cid}: unknown status {status!r}")
        claim_routes = c.get("routes") or []
        tests = c.get("tests") or []
        if status in NEEDS_TESTS and not tests:
            errors.append(f"{cid}: {status} claim has no tests")
        if status in ("NOT_BUILT", "EXTERNAL") and claim_routes:
            errors.append(f"{cid}: {status} claim lists routes {claim_routes}")
        for r in claim_routes:
            if r not in routes:
                errors.append(f"{cid}: route {r} does not exist")
        for t in tests:
            file_part, _, func = t.partition("::")
            path = repo_root / file_part
            if not path.is_file():
                errors.append(f"{cid}: test file {file_part} does not exist")
                continue
            if path not in cache:
                cache[path] = _functions(path)
            if func not in cache[path]:
                errors.append(f"{cid}: test {t} does not exist")
    return errors


def app_routes() -> set[str]:
    sys.path.insert(0, str(ROOT / "backend"))
    from app.main import app  # noqa: PLC0415

    return openapi_routes(app)


def openapi_routes(app) -> set[str]:
    """Routes as "METHOD /path" from the OpenAPI schema (included routers are not listed in app.routes)."""
    return {f"{m.upper()} {path}" for path, ops in app.openapi()["paths"].items() for m in ops}


def main() -> int:
    claims = load_claims(REGISTER)
    errors = check(claims, app_routes(), ROOT)
    for e in errors:
        print(e)
    if errors:
        return 1
    print(f"claims OK ({len(claims)} entries)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
