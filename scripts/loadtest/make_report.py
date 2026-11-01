#!/usr/bin/env python3
"""Build PPT-ready charts (PNG) and a Markdown report from load-test results.

Honesty note: no dual-axis (two y-scales on one plot) charts — each panel plots
one quantity against time; related quantities are stacked as separate panels
sharing an x-axis, per the project's chart-design rules.
"""
from __future__ import annotations

import csv
import json
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

# Validated palette (dataviz skill reference palette)
BLUE = "#2a78d6"      # throughput / concurrency (series-1)
ORANGE = "#eb6834"    # latency secondary (series-2)
RED = "#d03b3b"       # status: critical (errors)
GREEN = "#0ca30c"     # status: good
INK = "#0b0b0b"
MUTE = "#52514e"
GRID = "#e4e3de"
SURFACE = "#fcfcfb"
plt.rcParams.update({
    "font.size": 11, "axes.edgecolor": GRID, "axes.labelcolor": INK, "text.color": INK,
    "xtick.color": MUTE, "ytick.color": MUTE, "figure.facecolor": SURFACE, "axes.facecolor": SURFACE,
    "savefig.facecolor": SURFACE, "axes.grid": True, "grid.color": GRID, "grid.linewidth": 0.8,
    "axes.spines.top": False, "axes.spines.right": False, "font.family": "DejaVu Sans",
})


def load_ts(path: Path) -> list[dict]:
    with open(path) as f:
        return [{**row, **{k: float(row[k]) for k in row if k != "second"}, "second": int(row["second"])}
                for row in csv.DictReader(f)]


def stacked_timeseries(ts: list[dict], out: Path, title: str, subtitle: str):
    sec = [r["second"] for r in ts]
    fig, (ax1, ax2, ax3) = plt.subplots(3, 1, figsize=(10, 8.6), sharex=True, height_ratios=[0.8, 1, 1.1])
    fig.suptitle(title, fontsize=13.5, fontweight="bold", y=0.99)
    fig.text(0.01, 0.955, subtitle, fontsize=10, color=MUTE)

    ax1.plot(sec, [r["max_vus_seen"] for r in ts], color=MUTE, linewidth=1.8)
    ax1.fill_between(sec, [r["max_vus_seen"] for r in ts], color=MUTE, alpha=0.08)
    ax1.set_ylabel("Offered load\n(concurrent VUs)")

    ax2.plot(sec, [r["rps"] for r in ts], color=BLUE, linewidth=2)
    ax2.set_ylabel("Completed\n(req/sec)")
    ax2.set_title("Throughput did not rise with offered concurrency", fontsize=10, color=MUTE, loc="left", pad=4)

    ax3.plot(sec, [r["p50_ms"] / 1000 for r in ts], color=BLUE, linewidth=2, label="p50")
    ax3.plot(sec, [r["p99_ms"] / 1000 for r in ts], color=ORANGE, linewidth=1.6, linestyle="--", label="p99")
    ax3.set_ylabel("Response time\n(seconds)")
    ax3.set_xlabel("Elapsed time (s)")
    ax3.set_title("Latency grew in lock-step with offered load — a queueing signature", fontsize=10, color=MUTE, loc="left", pad=4)
    ax3.legend(loc="upper left", frameon=False, fontsize=9.5)

    for ax in (ax1, ax2, ax3):
        for s in ax.spines.values():
            s.set_linewidth(0.8)
    plt.tight_layout(rect=[0, 0, 1, 0.93])
    plt.savefig(out, dpi=200)
    plt.close()


def chart_comparison(baseline: dict, s600: dict, s15k: dict, out: Path):
    labels = ["Baseline\n(50 VUs, clean)", "600 VUs\n(2nd run)", "15,000 VUs\n(attempted)"]
    rps = [baseline["rps"], s600["overall_rps"], s15k["overall_rps"]]
    p50 = [baseline["p50_ms"], s600["latency_ms"]["p50"], s15k["latency_ms"]["p50"]]
    err = [baseline["error_pct"], s600["overall_error_pct"], s15k["overall_error_pct"]]
    colors = [GREEN, ORANGE, MUTE]

    fig, axes = plt.subplots(1, 3, figsize=(11.5, 3.8))
    ax = axes[0]
    bars = ax.bar(labels, rps, color=colors, width=0.6)
    ax.set_title("Throughput (req/s)", fontsize=10.5, loc="left")
    for b, v in zip(bars, rps):
        ax.text(b.get_x() + b.get_width() / 2, v, f"{v:.0f}", ha="center", va="bottom", fontsize=10)

    ax = axes[1]
    bars = ax.bar(labels, p50, color=colors, width=0.6)
    ax.set_yscale("log")
    ax.set_title("Median (p50) response time", fontsize=10.5, loc="left")
    for b, v in zip(bars, p50):
        label = f"{v:.0f} ms" if v < 1000 else f"{v/1000:.1f} s"
        ax.text(b.get_x() + b.get_width() / 2, v, label, ha="center", va="bottom", fontsize=10)

    ax = axes[2]
    bcolors = [GREEN if v < 1 else (ORANGE if v < 10 else RED) for v in err]
    bars = ax.bar(labels, err, color=bcolors, width=0.6)
    ax.set_title("Error rate (%)", fontsize=10.5, loc="left")
    for b, v in zip(bars, err):
        ax.text(b.get_x() + b.get_width() / 2, v, f"{v:.1f}%", ha="center", va="bottom", fontsize=10)

    for ax in axes:
        ax.spines["top"].set_visible(False); ax.spines["right"].set_visible(False)
        for lab in ax.get_xticklabels():
            lab.set_fontsize(9)
    fig.suptitle("All three runs degrade the same way as single-harness concurrency rises\n(client/proxy-bound, not a server-side failure — see report)",
                 fontsize=11.5, fontweight="bold")
    plt.tight_layout(rect=[0, 0, 1, 0.86])
    plt.savefig(out, dpi=200)
    plt.close()


def main():
    base = Path("scripts/loadtest")
    out = base / "report"
    out.mkdir(exist_ok=True)
    s15k = json.loads((base / "results" / "summary.json").read_text())
    s600 = json.loads((base / "results_600" / "summary.json").read_text())
    ts15k = load_ts(base / "results" / "timeseries.csv")
    ts600 = load_ts(base / "results_600" / "timeseries.csv")
    baseline = s15k["by_stage"]["smoke"]  # 50 VUs, common clean starting point to both runs

    stacked_timeseries(ts15k, out / "chart_15k_timeseries.png",
                        "15,000-VU attempt: offered load vs. completed throughput vs. latency",
                        "apaar-student-register.vercel.app — production — single-harness closed-loop test")
    stacked_timeseries(ts600, out / "chart_600_timeseries.png",
                        "600-VU confirmation run: the same pattern at smaller scale",
                        "Same endpoints, same harness, 25× lower peak concurrency")
    chart_comparison(baseline, s600, s15k, out / "chart_comparison.png")
    print("charts written to", out)


if __name__ == "__main__":
    main()
