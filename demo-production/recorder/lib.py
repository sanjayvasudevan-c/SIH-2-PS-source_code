"""Recording helpers: high-quality CDP screencast, visible cursor with click ripple, event timeline.

Every scene is real interaction with the running application. Frames come from Chrome's screencast
(JPEG q92) at 1920x1080 (viewport 1440x810 at device scale 4/3), and are assembled into a constant
30 fps H.264 clip with ffmpeg. Clicks, typing and element boxes are logged in clip time so the
video composition can place click sounds, zooms and callouts exactly.
"""

from __future__ import annotations

import json
import shutil
import subprocess
import time
from pathlib import Path

VIEW_W, VIEW_H, SCALE = 1440, 810, 4 / 3
FPS = 30

CURSOR_JS = r"""
(() => {
  if (window.__demoCursor) return;
  window.__demoCursor = true;
  const install = () => {
    const c = document.createElement('div');
    c.id = '__demo_cursor';
    c.innerHTML = `<svg width="26" height="26" viewBox="0 0 26 26"><path d="M4 2 L4 21 L9 16.5 L12.5 24 L16 22.5 L12.6 15.2 L19 15.2 Z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
    Object.assign(c.style, {position:'fixed', left:'0px', top:'0px', zIndex: 2147483647, pointerEvents:'none',
      transform:'translate(-3px,-2px)', transition:'none', filter:'drop-shadow(0 2px 3px rgba(0,0,0,.35))'});
    document.documentElement.appendChild(c);
    const pos = JSON.parse(sessionStorage.getItem('__demo_pos') || '[720,405]');
    c.style.left = pos[0] + 'px'; c.style.top = pos[1] + 'px';
    document.addEventListener('mousemove', e => {
      c.style.left = e.clientX + 'px'; c.style.top = e.clientY + 'px';
      try { sessionStorage.setItem('__demo_pos', JSON.stringify([e.clientX, e.clientY])); } catch (_) {}
    }, true);
    document.addEventListener('mousedown', e => {
      const r = document.createElement('div');
      Object.assign(r.style, {position:'fixed', left:(e.clientX-18)+'px', top:(e.clientY-18)+'px', width:'36px', height:'36px',
        borderRadius:'50%', border:'3px solid #f37021', background:'rgba(243,112,33,.18)', zIndex:2147483646,
        pointerEvents:'none', transform:'scale(.3)', opacity:'1', transition:'transform .45s ease-out, opacity .55s ease-out'});
      document.documentElement.appendChild(r);
      requestAnimationFrame(() => { r.style.transform = 'scale(1.5)'; r.style.opacity = '0'; });
      setTimeout(() => r.remove(), 650);
    }, true);
  };
  if (document.documentElement) install(); else document.addEventListener('DOMContentLoaded', install);
})();
"""


class Clip:
    """One recorded browser clip (one page) with its event timeline."""

    def __init__(self, page, name: str, out_dir: Path):
        self.page = page
        self.name = name
        self.dir = out_dir / name
        if self.dir.exists():
            shutil.rmtree(self.dir)
        (self.dir / "frames").mkdir(parents=True)
        self.frames: list[tuple[float, str]] = []
        self.events: list[dict] = []
        self.t0: float | None = None
        self.cdp = page.context.new_cdp_session(page)
        self.cdp.on("Page.screencastFrame", self._on_frame)
        self.mouse = [VIEW_W / 2, VIEW_H / 2]

    def _on_frame(self, ev):
        import base64

        ts = ev["metadata"]["timestamp"]
        path = self.dir / "frames" / f"{len(self.frames):06d}.jpg"
        path.write_bytes(base64.b64decode(ev["data"]))
        self.frames.append((ts, path.name))
        try:
            self.cdp.send("Page.screencastFrameAck", {"sessionId": ev["sessionId"]})
        except Exception:  # noqa: BLE001
            pass

    def start(self):
        self.t0 = time.time()
        self.cdp.send("Page.startScreencast", {"format": "jpeg", "quality": 92, "maxWidth": 1920, "maxHeight": 1080,
                                               "everyNthFrame": 1})
        self.page.wait_for_timeout(400)
        return self

    def now(self) -> float:
        return round(time.time() - self.t0, 3)

    def log(self, kind: str, **data):
        self.events.append({"t": self.now(), "type": kind, **data})

    def box(self, label: str, locator):
        """Record an element's box (video pixels) for zooms/callouts."""
        b = locator.bounding_box()
        if b:
            self.log("box", label=label, x=round(b["x"] * SCALE), y=round(b["y"] * SCALE),
                     w=round(b["width"] * SCALE), h=round(b["height"] * SCALE))

    def beat(self, label: str):
        self.log("beat", label=label)

    # ------------------------------------------------------------- human-like interaction

    def move_to(self, locator, dx: float = 0.5, dy: float = 0.5, steps: int = 28):
        locator.wait_for(state="visible")
        before = locator.bounding_box()
        hit = locator.evaluate("""e => { const r = e.getBoundingClientRect();
            const x = r.left + r.width / 2, y = r.top + r.height / 2;
            if (y < 0 || y > innerHeight || x < 0 || x > innerWidth) return false;
            const t = document.elementFromPoint(x, y); return !!t && (t === e || e.contains(t)); }""")
        if not hit:
            # off screen or covered (e.g. by the sticky menu bar): centre it, then aim
            locator.evaluate("e => e.scrollIntoView({block: 'center', inline: 'nearest', behavior: 'smooth'})")
        b = locator.bounding_box()
        for _ in range(30):  # wait for smooth scrolling to settle before aiming
            self.page.wait_for_timeout(60)
            nb = locator.bounding_box()
            if nb and b and abs(nb["y"] - b["y"]) < 0.5 and abs(nb["x"] - b["x"]) < 0.5:
                break
            b = nb
        _ = before
        x, y = b["x"] + b["width"] * dx, b["y"] + b["height"] * dy
        self.page.mouse.move(x, y, steps=steps)
        self.mouse = [x, y]
        self.page.wait_for_timeout(180)
        return x, y

    def click(self, locator, label: str = "", hold: int = 450, sound: str = "click"):
        x, y = self.move_to(locator)
        self.log("click", label=label, x=round(x * SCALE), y=round(y * SCALE), sound=sound)
        self.page.mouse.down()
        self.page.wait_for_timeout(70)
        self.page.mouse.up()
        self.page.wait_for_timeout(hold)

    def type(self, locator, text: str, label: str = "", delay: int = 55, clear: bool = True):
        self.click(locator, label=label or "field", hold=150)
        if clear:
            self.page.keyboard.press("Control+A")
            self.page.keyboard.press("Backspace")
        self.log("type", label=label, chars=len(text), duration=round(len(text) * delay / 1000, 2))
        self.page.keyboard.type(text, delay=delay)
        self.page.wait_for_timeout(300)

    def select(self, locator, value: str, label: str = ""):
        self.click(locator, label=label, hold=150, sound="toggle")
        locator.select_option(value)
        self.page.wait_for_timeout(350)

    def scroll(self, dy: int, steps: int = 12):
        for _ in range(steps):
            self.page.mouse.wheel(0, dy / steps)
            self.page.wait_for_timeout(35)
        self.page.wait_for_timeout(350)

    def hold(self, ms: int):
        self.page.wait_for_timeout(ms)

    # ------------------------------------------------------------- output

    def stop(self) -> dict:
        self.page.wait_for_timeout(500)
        end_wall = time.time()
        self.cdp.send("Page.stopScreencast")
        self.page.wait_for_timeout(200)
        if not self.frames:
            raise RuntimeError(f"{self.name}: no frames captured")
        first = self.frames[0][0]
        lines = []
        for i, (ts, fn) in enumerate(self.frames):
            nxt = self.frames[i + 1][0] if i + 1 < len(self.frames) else end_wall
            lines.append(f"file 'frames/{fn}'\nduration {max(nxt - ts, 0.001):.4f}")
        lines.append(f"file 'frames/{self.frames[-1][1]}'")  # concat demuxer: repeat last frame
        (self.dir / "frames.txt").write_text("\n".join(lines) + "\n")
        offset = first - self.t0  # clip time 0 = first frame
        out = self.dir.parent / f"{self.name}.mp4"
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", "frames.txt",
                        "-vf", f"fps={FPS},scale=1920:1080:flags=lanczos,format=yuv420p", "-c:v", "libx264",
                        "-preset", "slow", "-crf", "16", "-movflags", "+faststart", str(out)], check=True, cwd=self.dir)
        dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0",
                                    str(out)], capture_output=True, text=True).stdout.strip())
        events = [dict(e, t=round(max(0.0, e["t"] - offset), 3)) for e in self.events]
        meta = {"clip": out.name, "duration": round(dur, 3), "fps": FPS, "width": 1920, "height": 1080,
                "frames_captured": len(self.frames), "events": events}
        (self.dir.parent / f"{self.name}.json").write_text(json.dumps(meta, indent=1))
        shutil.rmtree(self.dir)
        return meta


def new_page(browser, role_label: str = ""):
    ctx = browser.new_context(viewport={"width": VIEW_W, "height": VIEW_H}, device_scale_factor=SCALE,
                              accept_downloads=True)
    ctx.add_init_script(CURSOR_JS)
    page = ctx.new_page()
    return page
