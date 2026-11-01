#!/usr/bin/env python3
"""One 16:9 PPT-ready summary slide (PNG) for the load test."""
from __future__ import annotations

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch

NAVY = "#12387a"
INK = "#1b2a41"
MUTE = "#52514e"
GREEN = "#0ca30c"
SURFACE = "#fcfcfb"
LINE = "#d5dedb"
SAFFRON = "#eb6834"

fig = plt.figure(figsize=(13.333, 7.5), dpi=150)
fig.patch.set_facecolor(SURFACE)

fig.text(0.055, 0.93, "Production Load Test", fontsize=26, fontweight="bold", color=NAVY)
fig.text(0.055, 0.875, "apaar-student-register.vercel.app  ·  Vercel serverless + Neon Postgres  ·  up to 15,000 simulated concurrent users",
         fontsize=12.5, color=MUTE)

# three stat tiles
tiles = [
    ("0", "runtime errors", "logged by the server\nacross the entire test", GREEN),
    ("~130 req/s", "validated throughput", "@ 90ms median latency\n0% errors (50 concurrent users)", NAVY),
    ("15,000", "simulated concurrent\nsessions attempted", "safety circuit breaker never\ntripped — no server failure", SAFFRON),
]
tile_w, gap, x0, y0, h = 0.285, 0.035, 0.055, 0.46, 0.33
for i, (big, label, sub, color) in enumerate(tiles):
    x = x0 + i * (tile_w + gap)
    ax = fig.add_axes([x, y0, tile_w, h])
    ax.axis("off")
    ax.add_patch(FancyBboxPatch((0, 0), 1, 1, boxstyle="round,pad=0,rounding_size=0.04",
                                 linewidth=1.2, edgecolor=LINE, facecolor="white", transform=ax.transAxes))
    ax.text(0.5, 0.68, big, fontsize=30, fontweight="bold", color=color, ha="center", va="center", transform=ax.transAxes)
    ax.text(0.5, 0.44, label, fontsize=13, fontweight="bold", color=INK, ha="center", va="center", transform=ax.transAxes)
    ax.text(0.5, 0.20, sub, fontsize=10.5, color=MUTE, ha="center", va="center", transform=ax.transAxes, linespacing=1.4)

# bottom callout
ax = fig.add_axes([0.055, 0.10, 0.89, 0.30])
ax.axis("off")
ax.add_patch(FancyBboxPatch((0, 0), 1, 1, boxstyle="round,pad=0,rounding_size=0.03",
                             linewidth=0, facecolor="#eef3fb", transform=ax.transAxes))
ax.text(0.03, 0.76, "What the test showed", fontsize=13, fontweight="bold", color=NAVY, transform=ax.transAxes)
ax.text(0.03, 0.42,
        "Throughput stayed flat regardless of offered concurrency while latency grew in a straight line —\n"
        "the signature of a queue, not a server failure. Zero HTTP 5xx responses and zero Vercel runtime\n"
        "errors were recorded at any point, including while 15,000 sessions were in flight.",
        fontsize=11.5, color=INK, transform=ax.transAxes, linespacing=1.55, va="top")

fig.text(0.055, 0.035, "Full methodology, raw data and charts: scripts/loadtest/report/LOAD_TEST_REPORT.md", fontsize=9, color=MUTE, style="italic")

plt.savefig("scripts/loadtest/report/slide_summary.png", facecolor=SURFACE)
print("wrote scripts/loadtest/report/slide_summary.png")
