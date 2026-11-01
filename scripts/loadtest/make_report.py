#!/usr/bin/env python3
"""Build PPT-ready charts (PNG) and a Markdown report from load-test results."""
from __future__ import annotations

import csv
import json
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker

# Validated palette (anthropic dataviz skill reference palette)
BLUE = "#2a78d6"      # throughput / concurrency (series-1)
ORANGE = "#eb6834"    # latency (series-2)
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


def chart_15k(ts: list[dict], out: Path):
    sec = [r["second"] for r in ts]
    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(10, 7.2), sharex=True, height_ratios=[1.1, 1])
    fig.suptitle("15,000-VU load test — requests/sec vs. concurrent virtual users", fontsize=13.5, fontweight="bold", y=0.985)

    ax1b = ax1.twinx()
    ax1b.spines["top"].set_visible(False)
    ax1.plot(sec, [r["rps"] for r in ts], color=BLUE, linewidth=2, label="Requests completed / sec")
    ax1b.plot(sec, [r["max_vus_seen"] for r in ts], color=MUTE, linewidth=1.6, linestyle="--", label="Concurrent VUs (offered load)")
    ax1.set_ylabel("Requests / sec", color=BLUE)
    ax1b.set_ylabel("Concurrent VUs", color=MUTE)
    ax1.tick_params(axis="y", colors=BLUE)
    ax1b.tick_params(axis="y", colors=MUTE)
    ax1b.grid(False)
    ax1.set_title("Throughput stayed flat (~10–30 req/s) while offered concurrency rose to 15,000", fontsize=10.5, color=MUTE, loc="left")
    l1, lb1 = ax1.get_legend_handles_labels(); l2, lb2 = ax1b.get_legend_handles_labels()
    ax1.legend(l1 + l2, lb1 + lb2, loc="upper left", frameon=False, fontsize=9.5)

    ax2.plot(sec, [r["p50_ms"] / 1000 for r in ts], color=BLUE, linewidth=2, label="p50 latency")
    ax2.plot(sec, [r["p99_ms"] / 1000 for r in ts], color=ORANGE, linewidth=1.6, linestyle="--", label="p99 latency")
    ax2.set_ylabel("Response time (seconds)")
    ax2.set_xlabel("Elapsed time (s)")
    ax2.set_title("Latency climbed in lock-step with offered concurrency — a queueing, not a serving, signature", fontsize=10.5, color=MUTE, loc="left")
    ax2.legend(loc="upper left", frameon=False, fontsize=9.5)
    for ax in (ax1, ax2):
        for s in ax.spines.values():
            s.set_linewidth(0.8)
    plt.tight_layout(rect=[0, 0, 1, 0.965])
    plt.savefig(out, dpi=200)
    plt.close()


def chart_600(ts: list[dict], out: Path):
    sec = [r["second"] for r in ts]
    fig, ax1 = plt.subplots(figsize=(10, 4.6))
    ax1b = ax1.twinx(); ax1b.spines["top"].set_visible(False)
    ax1.plot(sec, [r["rps"] for r in ts], color=BLUE, linewidth=2, label="Requests completed / sec")
    ax1b.plot(sec, [r["p95_ms"] for r in ts], color=ORANGE, linewidth=1.8, linestyle="--", label="p95 latency (ms)")
    ax1.set_ylabel("Requests / sec", color=BLUE)
    ax1b.set_ylabel("p95 latency (ms)", color=ORANGE)
    ax1.tick_params(axis="y", colors=BLUE); ax1b.tick_params(axis="y", colors=ORANGE)
    ax1b.grid(False)
    ax1.set_xlabel("Elapsed time (s)")
    ax1.set_title("600-VU validation run — throughput scales, latency stays bounded", fontsize=12.5, fontweight="bold", loc="left")
    l1, lb1 = ax1.get_legend_handles_labels(); l2, lb2 = ax1b.get_legend_handles_labels()
    ax1.legend(l1 + l2, lb1 + lb2, loc="upper left", frameon=False, fontsize=9.5)
    plt.tight_layout()
    plt.savefig(out, dpi=200)
    plt.close()


def chart_summary_bar(s15k: dict, s600: dict, out: Path):
    fig, axes = plt.subplots(1, 3, figsize=(11, 3.6))
    labels = ["600 VUs\n(validated)", "15,000 VUs\n(attempted)"]

    ax = axes[0]
    vals = [s600["overall_rps"], s15k["overall_rps"]]
    bars = ax.bar(labels, vals, color=[BLUE, MUTE], width=0.55)
    ax.set_title("Throughput (req/s)", fontsize=10.5, loc="left")
    for b, v in zip(bars, vals):
        ax.text(b.get_x() + b.get_width() / 2, v, f"{v:.0f}", ha="center", va="bottom", fontsize=10, color=INK)

    ax = axes[1]
    vals = [s600["latency_ms"]["p95"], s15k["latency_ms"]["p95"] / 1000]
    bars = ax.bar(labels, [s600["latency_ms"]["p95"], s15k["latency_ms"]["p95"]], color=[BLUE, MUTE], width=0.55)
    ax.set_title("p95 latency (ms)", fontsize=10.5, loc="left")
    ax.set_yscale("log")
    for b, v in zip(bars, [s600["latency_ms"]["p95"], s15k["latency_ms"]["p95"]]):
        label = f"{v:.0f} ms" if v < 1000 else f"{v/1000:.1f} s"
        ax.text(b.get_x() + b.get_width() / 2, v, label, ha="center", va="bottom", fontsize=10, color=INK)

    ax = axes[2]
    vals = [s600["overall_error_pct"], s15k["overall_error_pct"]]
    colors = [GREEN if v < 1 else (ORANGE if v < 10 else RED) for v in vals]
    bars = ax.bar(labels, vals, color=colors, width=0.55)
    ax.set_title("Error rate (%)", fontsize=10.5, loc="left")
    for b, v in zip(bars, vals):
        ax.text(b.get_x() + b.get_width() / 2, v, f"{v:.1f}%", ha="center", va="bottom", fontsize=10, color=INK)

    for ax in axes:
        ax.spines["top"].set_visible(False); ax.spines["right"].set_visible(False)
    fig.suptitle("Validated capacity vs. the 15,000-VU single-harness attempt", fontsize=12.5, fontweight="bold")
    plt.tight_layout(rect=[0, 0, 1, 0.92])
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
    chart_15k(ts15k, out / "chart_15k_timeseries.png")
    chart_600(ts600, out / "chart_600_timeseries.png")
    chart_summary_bar(s15k, s600, out / "chart_comparison.png")
    print("charts written to", out)


if __name__ == "__main__":
    main()
