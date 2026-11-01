#!/usr/bin/env python3
"""Staged load test for the APAAR Student Register production deployment.

Simulates virtual users (VUs) in a closed-loop model: each VU repeatedly picks a
weighted endpoint, sends a GET request, records {t, endpoint, status, latency_ms,
error}, then sleeps 0.1-0.4s before its next iteration (so load scales with real
response latency, the same way a browser polling the app would, not a tight spin
loop). VU count is ramped over time per STAGES. Includes a safety circuit breaker:
if the rolling error rate over the last WINDOW_S seconds exceeds ERROR_ABORT_PCT,
the test ramps down early instead of continuing to hammer a struggling target.

Targets only public, read-only, DB-touching endpoints (no writes, no /auth/login,
so demo accounts are never at lockout risk):
  GET /api/health              -> SELECT 1 against Postgres (Neon) on every call
  GET /api/v1/auth/demo-accounts -> reads the users table
  GET /api/v1/system/status    -> in-memory (no DB), used as a CPU-only baseline

Usage:
  .venv/bin/python scripts/loadtest/loadtest.py --base-url https://apaar-student-register.vercel.app \
      --peak-vus 15000 --out scripts/loadtest/results

Writes results/raw.jsonl (every request), results/timeseries.csv (1s buckets),
results/summary.json (percentiles, error rate, RPS by stage).
"""
from __future__ import annotations

import argparse
import asyncio
import json
import random
import statistics
import time
from collections import defaultdict
from dataclasses import dataclass, field
from pathlib import Path

import httpx

ENDPOINTS = [
    ("/api/health", 0.5),
    ("/api/v1/auth/demo-accounts", 0.3),
    ("/api/v1/system/status", 0.2),
]
WINDOW_S = 5          # rolling window for the error-rate circuit breaker
ERROR_ABORT_PCT = 25  # abort (ramp down early) if rolling error rate exceeds this


def pick_endpoint() -> str:
    r = random.random()
    acc = 0.0
    for path, w in ENDPOINTS:
        acc += w
        if r <= acc:
            return path
    return ENDPOINTS[-1][0]


@dataclass
class Stage:
    label: str
    target_vus: int
    duration_s: float


def default_stages(peak: int) -> list[Stage]:
    return [
        Stage("smoke", min(50, peak), 10),
        Stage("ramp-1", int(peak * 0.15), 30),
        Stage("ramp-2", int(peak * 0.55), 45),
        Stage("ramp-3", peak, 45),
        Stage("peak-hold", peak, 60),
        Stage("ramp-down", int(peak * 0.1), 20),
    ]


@dataclass
class Collector:
    rows: list[dict] = field(default_factory=list)
    lock: asyncio.Lock = field(default_factory=asyncio.Lock)

    async def add(self, row: dict):
        async with self.lock:
            self.rows.append(row)

    def recent_error_rate(self, now: float, window_s: float) -> float:
        recent = [r for r in self.rows[-5000:] if now - r["t"] <= window_s]
        if len(recent) < 30:
            return 0.0
        errors = sum(1 for r in recent if r["error"])
        return 100.0 * errors / len(recent)


async def vu_loop(client: httpx.AsyncClient, base_url: str, stage_label_ref: list, stop_at: list,
                   collector: Collector, vu_id: int):
    while time.monotonic() < stop_at[0]:
        path = pick_endpoint()
        t0 = time.monotonic()
        status, error = None, None
        try:
            resp = await client.get(base_url + path, timeout=httpx.Timeout(10.0, connect=5.0))
            status = resp.status_code
            if status >= 500:
                error = f"http_{status}"
            elif status >= 400:
                error = f"http_{status}"
        except httpx.TimeoutException:
            error = "timeout"
        except Exception as e:  # noqa: BLE001
            error = type(e).__name__
        latency_ms = (time.monotonic() - t0) * 1000
        await collector.add({"t": time.time(), "vu": vu_id, "stage": stage_label_ref[0], "endpoint": path,
                              "status": status, "latency_ms": round(latency_ms, 1), "error": error})
        await asyncio.sleep(random.uniform(0.1, 0.4))


async def run(base_url: str, stages: list[Stage], out_dir: Path, insecure: bool = False):
    out_dir.mkdir(parents=True, exist_ok=True)
    collector = Collector()
    limits = httpx.Limits(max_connections=20000, max_keepalive_connections=2000)
    async with httpx.AsyncClient(limits=limits, http2=False, verify=not insecure) as client:
        tasks: dict[int, asyncio.Task] = {}
        stage_label_ref = [stages[0].label]
        stop_at = [time.monotonic() + 10 ** 9]
        next_vu_id = 0
        aborted = False
        overall_start = time.monotonic()
        for stage in stages:
            stage_label_ref[0] = stage.label
            stage_start = time.monotonic()
            stage_end = stage_start + stage.duration_s
            stop_at[0] = 10 ** 18  # don't stop VUs mid-stage; only at final teardown
            # ramp VU count up/down to target over the first third of the stage
            ramp_span = max(1.0, stage.duration_s / 3)
            current = len(tasks)
            steps = max(1, int(ramp_span / 0.2))
            delta = stage.target_vus - current
            for i in range(steps):
                want = current + int(delta * (i + 1) / steps)
                while len(tasks) < want:
                    vid = next_vu_id; next_vu_id += 1
                    tasks[vid] = asyncio.create_task(vu_loop(client, base_url, stage_label_ref, stop_at, collector, vid))
                while len(tasks) > want:
                    vid, t = tasks.popitem()
                    t.cancel()
                await asyncio.sleep(0.2)
            # hold for the remainder of the stage, checking the circuit breaker every second
            while time.monotonic() < stage_end:
                await asyncio.sleep(1.0)
                err_rate = collector.recent_error_rate(time.time(), WINDOW_S)
                print(f"  [{stage.label}] t={time.monotonic()-overall_start:5.1f}s vus={len(tasks):5d} "
                      f"recent_error_rate={err_rate:5.1f}% total_reqs={len(collector.rows)}", flush=True)
                if err_rate > ERROR_ABORT_PCT:
                    print(f"  !! circuit breaker tripped ({err_rate:.1f}% errors over last {WINDOW_S}s) "
                          f"-> ramping down early", flush=True)
                    aborted = True
                    break
            if aborted:
                break
        for t in tasks.values():
            t.cancel()
        await asyncio.sleep(0.3)

    (out_dir / "raw.jsonl").write_text("\n".join(json.dumps(r) for r in collector.rows))
    summarize(collector.rows, out_dir, aborted)


def pct(values: list[float], p: float) -> float:
    if not values:
        return 0.0
    values = sorted(values)
    k = (len(values) - 1) * (p / 100)
    f, c = int(k), min(int(k) + 1, len(values) - 1)
    if f == c:
        return values[f]
    return values[f] + (values[c] - values[f]) * (k - f)


def summarize(rows: list[dict], out_dir: Path, aborted: bool):
    if not rows:
        print("no requests recorded"); return
    t0 = min(r["t"] for r in rows)
    by_sec = defaultdict(list)
    for r in rows:
        by_sec[int(r["t"] - t0)].append(r)
    with open(out_dir / "timeseries.csv", "w") as f:
        f.write("second,requests,rps,errors,error_pct,p50_ms,p95_ms,p99_ms,max_vus_seen\n")
        for sec in sorted(by_sec):
            bucket = by_sec[sec]
            lat = [r["latency_ms"] for r in bucket]
            errs = sum(1 for r in bucket if r["error"])
            f.write(f"{sec},{len(bucket)},{len(bucket)},{errs},{100*errs/len(bucket):.2f},"
                    f"{pct(lat,50):.1f},{pct(lat,95):.1f},{pct(lat,99):.1f},{max(r['vu'] for r in bucket)+1}\n")

    by_stage = defaultdict(list)
    for r in rows:
        by_stage[r["stage"]].append(r)
    stage_summary = {}
    for stage, bucket in by_stage.items():
        lat = [r["latency_ms"] for r in bucket]
        errs = sum(1 for r in bucket if r["error"])
        dur = max(r["t"] for r in bucket) - min(r["t"] for r in bucket) or 1
        stage_summary[stage] = {
            "requests": len(bucket), "duration_s": round(dur, 1), "rps": round(len(bucket) / dur, 1),
            "error_pct": round(100 * errs / len(bucket), 2),
            "p50_ms": round(pct(lat, 50), 1), "p90_ms": round(pct(lat, 90), 1),
            "p95_ms": round(pct(lat, 95), 1), "p99_ms": round(pct(lat, 99), 1),
            "max_ms": round(max(lat), 1), "min_ms": round(min(lat), 1),
            "max_concurrent_vus": max(r["vu"] for r in bucket) + 1,
        }
    status_counts = defaultdict(int)
    for r in rows:
        status_counts[str(r["status"] or r["error"])] += 1
    all_lat = [r["latency_ms"] for r in rows]
    total_errs = sum(1 for r in rows if r["error"])
    total_dur = max(r["t"] for r in rows) - min(r["t"] for r in rows) or 1
    summary = {
        "aborted_early_by_circuit_breaker": aborted,
        "total_requests": len(rows),
        "total_duration_s": round(total_dur, 1),
        "overall_rps": round(len(rows) / total_dur, 1),
        "overall_error_pct": round(100 * total_errs / len(rows), 2),
        "latency_ms": {"p50": round(pct(all_lat, 50), 1), "p90": round(pct(all_lat, 90), 1),
                       "p95": round(pct(all_lat, 95), 1), "p99": round(pct(all_lat, 99), 1),
                       "max": round(max(all_lat), 1), "mean": round(statistics.mean(all_lat), 1)},
        "peak_concurrent_vus": max(r["vu"] for r in rows) + 1,
        "status_breakdown": dict(status_counts),
        "by_stage": stage_summary,
    }
    (out_dir / "summary.json").write_text(json.dumps(summary, indent=2))
    print(json.dumps(summary, indent=2))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base-url", required=True)
    ap.add_argument("--peak-vus", type=int, default=15000)
    ap.add_argument("--out", default="scripts/loadtest/results")
    ap.add_argument("--insecure", action="store_true", help="skip TLS verify (debug only)")
    args = ap.parse_args()
    stages = default_stages(args.peak_vus)
    print(f"stages: {[(s.label, s.target_vus, s.duration_s) for s in stages]}")
    asyncio.run(run(args.base_url, stages, Path(args.out), insecure=args.insecure))


if __name__ == "__main__":
    main()
