#!/usr/bin/env python3
"""Original score and sound effects for the APAAR film, synthesised from scratch (numpy only).

Nothing is sampled or licensed: every sound is generated here, so the audio is free to use.
Usage: python3 synth.py <out_dir>   ->  music/score.wav, sound-effects/*.wav (48 kHz, 16-bit, stereo)
"""
from __future__ import annotations

import sys
import wave
from pathlib import Path

import numpy as np

SR = 48000
RNG = np.random.default_rng(26263)
DUR = 240.0


def write(path: Path, x: np.ndarray, peak: float = 0.89):
    path.parent.mkdir(parents=True, exist_ok=True)
    if x.ndim == 1:
        x = np.stack([x, x], axis=1)
    m = np.max(np.abs(x)) or 1.0
    x = x / m * peak
    pcm = (x * 32767).astype("<i2")
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def t_axis(sec: float) -> np.ndarray:
    return np.arange(int(sec * SR)) / SR


def onepole_lp(x: np.ndarray, cutoff: float | np.ndarray) -> np.ndarray:
    """One-pole low-pass, cutoff may vary per sample (vectorised in blocks)."""
    out = np.empty_like(x)
    cut = np.broadcast_to(np.asarray(cutoff, dtype=float), x.shape[:1])
    a_all = np.exp(-2 * np.pi * cut / SR)
    y = np.zeros(x.shape[1:]) if x.ndim > 1 else 0.0
    for i in range(0, len(x), 256):
        a = a_all[i]
        seg = x[i:i + 256]
        for j in range(len(seg)):
            y = (1 - a) * seg[j] + a * y
            out[i + j] = y
    return out


def reverb(x: np.ndarray, seconds: float = 2.8, mix: float = 0.35) -> np.ndarray:
    """Convolution with a decaying stereo noise impulse (cheap hall)."""
    n = int(seconds * SR)
    env = np.exp(-np.linspace(0, 7, n))
    ir = RNG.standard_normal((n, 2)) * env[:, None]
    ir[:, 0] = np.convolve(ir[:, 0], np.ones(8) / 8, "same")
    ir[:, 1] = np.convolve(ir[:, 1], np.ones(8) / 8, "same")
    ir /= np.sqrt(np.sum(ir ** 2, axis=0))
    if x.ndim == 1:
        x = np.stack([x, x], axis=1)
    L = len(x) + n
    nfft = 1 << (L - 1).bit_length()
    wet = np.stack([np.fft.irfft(np.fft.rfft(x[:, c], nfft) * np.fft.rfft(ir[:, c], nfft), nfft)[:len(x)] for c in range(2)], 1)
    return (1 - mix) * x + mix * wet


def note(n: str) -> float:
    names = {"C": 0, "C#": 1, "D": 2, "D#": 3, "E": 4, "F": 5, "F#": 6, "G": 7, "G#": 8, "A": 9, "A#": 10, "B": 11}
    name, octv = n[:-1], int(n[-1])
    return 440.0 * 2 ** ((names[name] + 12 * (octv + 1) - 69) / 12)


def pad(freqs: list[float], sec: float, attack: float = 2.5, release: float = 3.0, bright: float = 900) -> np.ndarray:
    t = t_axis(sec)
    x = np.zeros((len(t), 2))
    for k, f in enumerate(freqs):
        for d, pan in ((-0.004, 0.25), (0.004, 0.75)):  # detuned pair, spread
            ph = RNG.uniform(0, 2 * np.pi)
            tone = sum(np.sin(2 * np.pi * f * (1 + d) * h * t + ph * h) / h ** 1.6 for h in range(1, 6))
            x[:, 0] += tone * (1 - pan)
            x[:, 1] += tone * pan
    env = np.minimum(1, t / attack) * np.minimum(1, (sec - t) / release).clip(0, 1)
    x *= env[:, None]
    lp = np.stack([np.convolve(x[:, c], np.ones(int(SR / bright)) / int(SR / bright), "same") for c in range(2)], 1)
    return lp / len(freqs)


def pluck(f: float, sec: float = 1.2, bright: float = 0.6) -> np.ndarray:
    t = t_axis(sec)
    env = np.exp(-t * 5.5) * np.minimum(1, t / 0.004)
    x = sum(np.sin(2 * np.pi * f * h * t) * (bright ** (h - 1)) / h for h in range(1, 5)) * env
    return x


def impact(sec: float = 3.0, low: float = 70, end: float = 32) -> np.ndarray:
    t = t_axis(sec)
    f = end + (low - end) * np.exp(-t * 6)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.6)
    noise = RNG.standard_normal(len(t)) * np.exp(-t * 18) * 0.35
    noise = np.convolve(noise, np.ones(24) / 24, "same")
    return body + noise


def riser(sec: float = 4.0) -> np.ndarray:
    t = t_axis(sec)
    n = RNG.standard_normal(len(t))
    out = np.zeros_like(n)
    for i, w in enumerate(np.linspace(60, 4, 16)):  # moving-average narrowing = rising brightness
        a, b = int(i * len(t) / 16), int((i + 1) * len(t) / 16)
        k = int(w)
        out[a:b] = np.convolve(n, np.ones(k) / k, "same")[a:b]
    return out * (t / sec) ** 2.2


def place(buf: np.ndarray, x: np.ndarray, at: float, gain: float = 1.0, pan: float = 0.5):
    i = int(at * SR)
    if x.ndim == 1:
        x = np.stack([x * (1 - pan) * 2 ** 0.5, x * pan * 2 ** 0.5], 1)
    j = min(len(buf), i + len(x))
    buf[i:j] += x[: j - i] * gain


def score() -> np.ndarray:
    buf = np.zeros((int(DUR * SR), 2))
    D2, A2, F2, G2, B1, C3 = note("D2"), note("A2"), note("F2"), note("G2"), note("A#1"), note("C3")
    # Scene 1 (0-20): drone, swelling into the title impact at 10 s
    place(buf, pad([D2, note("A2"), note("E3")], 21, attack=6, release=4, bright=500), 0, 0.55)
    place(buf, riser(4.0), 6.0, 0.10)
    place(buf, impact(4.0), 10.0, 0.55)
    place(buf, pad([note("D3"), note("F3"), note("A3"), note("E4")], 11, attack=0.5, release=4, bright=1200), 10.0, 0.30)
    # Scene 2 (20-50): restrained tension, Dm - Bb - Gm - A(sus)
    prog = [([D2, note("F3"), note("A3")], 20), ([B1, note("D3"), note("F3")], 27.5), ([G2, note("D3"), note("A#3")], 35),
            ([A2, note("D3"), note("E3")], 42.5)]
    for chord, at in prog:
        place(buf, pad(chord, 8.5, attack=1.8, release=2.5, bright=650), at, 0.42)
    for k in range(int(30 / 0.625)):  # soft ticking pulse at 96 bpm 8ths, low in the mix
        place(buf, pluck(note("D5"), 0.25, 0.3), 20 + k * 0.625, 0.035 if k % 2 else 0.05)
    # Scene 3 (50-70): build to the reveal at 58 s, brighten to F major
    place(buf, riser(5.0), 53.0, 0.16)
    place(buf, impact(4.0, 80, 36), 58.0, 0.6)
    place(buf, pad([F2, note("C3"), note("A3"), note("E4")], 13, attack=0.4, release=4, bright=1600), 58.0, 0.38)
    # Scene 4 (70-190): walkthrough bed, gentle arpeggio F - Am - Bb - C, 96 bpm, sits under the voice
    beat = 0.625
    chords = [["F3", "A3", "C4", "E4"], ["A3", "C4", "E4", "G4"], ["A#3", "D4", "F4", "A4"], ["C4", "E4", "G4", "D5"]]
    roots = [F2, A2, B1 * 2, C3]
    t0 = 70.0
    bar = 0
    while t0 + bar * beat * 8 < 190:
        ch = chords[bar % 4]
        at = t0 + bar * beat * 8
        place(buf, pad([roots[bar % 4], note(ch[0]), note(ch[2])], beat * 8 + 2.5, attack=1.2, release=2.0, bright=700), at, 0.24)
        for k in range(8):
            place(buf, pluck(note(ch[k % 4]), 0.9, 0.5), at + k * beat, 0.07, pan=0.3 + 0.4 * (k % 2))
        bar += 1
    # Scene 5 (190-220): architecture, digital pulses and a gentle build
    for k in range(int(30 / (beat / 2))):
        at = 190 + k * beat / 2
        f = note(["D5", "A4", "F5", "A4"][k % 4])
        place(buf, pluck(f, 0.35, 0.25), at, 0.05 + 0.05 * (k / 96), pan=0.2 + 0.6 * ((k * 7) % 10) / 10)
    place(buf, pad([B1 * 2, note("F3"), note("A#3"), note("D4")], 16, attack=4, release=3, bright=900), 190, 0.30)
    place(buf, pad([C3, note("G3"), note("C4"), note("E4")], 16, attack=4, release=4, bright=1100), 205, 0.32)
    place(buf, riser(4.0), 216.0, 0.14)
    # Scene 6 (220-240): resolution, D major, final hit and long tail
    place(buf, impact(5.0, 75, 30), 220.0, 0.6)
    place(buf, pad([D2, note("A2"), note("D3"), note("F#3"), note("A3"), note("E4")], 19.5, attack=0.3, release=9, bright=1500), 220.0, 0.5)
    place(buf, pluck(note("A5"), 3.0, 0.4), 229.0, 0.08)
    buf = reverb(buf, 3.2, 0.38)
    t = np.arange(len(buf)) / SR
    fade = np.clip((DUR - t) / 6.0, 0, 1) * np.clip(t / 1.5, 0, 1)
    return buf * fade[:, None]


def sfx(out: Path):
    t = t_axis
    # UI click: tight filtered tick
    c = RNG.standard_normal(int(0.03 * SR)) * np.exp(-np.arange(int(0.03 * SR)) / SR * 220)
    c = np.convolve(c, [0.5, 0.3, 0.2], "same") + np.sin(2 * np.pi * 2200 * t(0.03)) * np.exp(-t(0.03) * 300) * 0.4
    write(out / "click.wav", c, 0.6)
    # toggle: softer, lower
    g = np.sin(2 * np.pi * 900 * t(0.06)) * np.exp(-t(0.06) * 90)
    write(out / "toggle.wav", g, 0.45)
    # whoosh: band-limited noise swell with a stereo sweep
    n = RNG.standard_normal(int(0.9 * SR))
    n = np.convolve(n, np.ones(14) / 14, "same") - np.convolve(n, np.ones(90) / 90, "same")
    env = np.sin(np.linspace(0, np.pi, len(n))) ** 2.5
    pan = np.linspace(0.15, 0.85, len(n))
    write(out / "whoosh.wav", np.stack([n * env * (1 - pan), n * env * pan], 1), 0.5)
    # pulse: digital ping for architecture nodes
    p = np.sin(2 * np.pi * 1320 * t(0.5)) * np.exp(-t(0.5) * 9) + 0.3 * np.sin(2 * np.pi * 660 * t(0.5)) * np.exp(-t(0.5) * 6)
    write(out / "pulse.wav", reverb(p, 1.2, 0.3), 0.45)
    # soft impact for reveals
    write(out / "impact.wav", reverb(impact(2.5), 2.0, 0.3), 0.7)
    # paper: short crisp paper-place sound for collage pieces
    pp = RNG.standard_normal(int(0.12 * SR)) * np.exp(-t(0.12) * 45)
    pp = pp - np.convolve(pp, np.ones(6) / 6, "same")
    write(out / "paper.wav", pp, 0.35)
    # type: tiny key tick
    k = RNG.standard_normal(int(0.02 * SR)) * np.exp(-t(0.02) * 400)
    write(out / "type.wav", k, 0.25)


if __name__ == "__main__":
    root = Path(sys.argv[1] if len(sys.argv) > 1 else ".")
    sfx(root / "sound-effects")
    write(root / "music" / "score.wav", score(), 0.8)
    print("wrote", root / "music" / "score.wav", "and", root / "sound-effects")
