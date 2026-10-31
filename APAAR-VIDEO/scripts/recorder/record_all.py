#!/usr/bin/env python3
"""Record every storyboard scene against a freshly seeded local server.

Usage (from repo root):
  make seed && make run                     # terminal 1 (live events on)
  .venv/bin/python APAAR-VIDEO/scripts/recorder/record_all.py [--only s05_fix,...]

Each scene asserts its expected application state; a failed expectation stops the run instead of
recording a broken flow. Output: APAAR-VIDEO/recordings/<clip>.mp4 + <clip>.json (event timeline)
and APAAR-VIDEO/recordings/stills/<clip>.png (last frame).
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import httpx
from playwright.sync_api import expect, sync_playwright

sys.path.insert(0, str(Path(__file__).parent))
from lib import Clip, new_page  # noqa: E402

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / "APAAR-VIDEO" / "recordings"
SHOTS = ROOT / "APAAR-VIDEO" / "recordings" / "stills"
BASE = "http://localhost:8000"
CHROME = "/opt/pw-browsers/chromium-1243/chrome-linux64/chrome"
PASSWORD = "Demo@2026"
SAMPLES = ROOT / "sample_data"


def api_token(email: str) -> str:
    r = httpx.post(f"{BASE}/api/v1/auth/login", json={"email": email, "password": PASSWORD})
    r.raise_for_status()
    return r.json()["access_token"]


def api_get(email: str, path: str):
    r = httpx.get(f"{BASE}{path}", headers={"Authorization": f"Bearer {api_token(email)}"})
    r.raise_for_status()
    return r.json()


def sign_in(page, email: str):
    """Sign in through the UI's account picker (off camera)."""
    page.goto(f"{BASE}/#/login")
    page.wait_for_load_state("networkidle")
    page.get_by_text(email, exact=True).click()
    page.wait_for_selector("text=Sign out")
    page.wait_for_load_state("networkidle")


def go(page, path: str, wait: str | None = None):
    page.goto(f"{BASE}/#{path}")
    page.wait_for_load_state("networkidle")
    if wait:
        page.wait_for_selector(wait)
    page.wait_for_timeout(300)


def finish(clip: Clip, results: dict):
    clip.page.screenshot(path=str(SHOTS / f"{clip.name}.png"))
    meta = clip.stop()
    results[clip.name] = meta
    print(f"  recorded {clip.name}: {meta['duration']}s, {len(meta['events'])} events")


def field(scope, label: str):
    page = scope if hasattr(scope, "goto") else scope.page
    return scope.locator(".field", has=page.locator(f"label:text-is('{label}')")).locator("input, select, textarea").first


# ------------------------------------------------------------------ scenes


def s02_signin(b, st, R):
    p = new_page(b)
    go(p, "/login", "text=Demo accounts")
    c = Clip(p, "s02_signin", OUT).start()
    c.hold(700)
    c.box("accounts", p.locator(".acct-grid"))
    c.move_to(p.locator(".acct-grid .acct").nth(0))
    c.move_to(p.locator(".acct-grid .acct").nth(3))
    c.click(p.locator(".fs button", has_text="A+"), "text size A+", sound="toggle")
    c.hold(600)
    c.click(p.locator(".fs button").nth(1), "text size A", sound="toggle")
    c.click(p.get_by_text("kaveri.staff@demo.local", exact=True), "Kaveri staff")
    p.wait_for_selector("text=Seat position by programme")
    c.beat("dashboard")
    c.hold(900)
    finish(c, R)
    st["staff"] = p


def s03_dashboard(b, st, R):
    p = st["staff"]
    c = Clip(p, "s03_dashboard", OUT).start()
    cse = p.locator(".prog-grid > div").first
    c.box("cse_strip", cse)
    c.move_to(cse.locator("svg").first, 0.85, 0.5)
    c.hold(1500)
    c.box("sn_row", cse.locator(".sn-row"))
    c.move_to(cse.locator(".sn-row > div").nth(2), 0.3, 0.3)
    c.hold(1500)
    c.box("figures", p.locator(".figs"))
    c.move_to(p.locator(".figs .fig").nth(1))
    c.hold(1200)
    finish(c, R)


def s04_upload(b, st, R):
    p = st["staff"]
    c = Clip(p, "s04_upload", OUT).start()
    c.click(p.locator(".mainnav a", has_text="Upload records"), "Upload records")
    p.wait_for_selector("text=Upload student records")
    c.hold(500)
    c.box("template", p.locator("section.card").first)
    c.move_to(p.get_by_role("button", name="Download Excel template"))
    c.hold(700)
    c.move_to(p.locator("input[type=file]"))
    p.locator("input[type=file]").set_input_files(str(SAMPLES / "demo_A_kaveri_upload_2026-27.csv"))
    c.log("click", label="choose file", x=0, y=0, sound="click")
    c.hold(700)
    c.click(p.get_by_role("button", name="Upload and check"), "Upload and check")
    p.wait_for_selector("text=demo_A_kaveri_upload_2026-27.csv")
    p.wait_for_selector(".figs")
    figs = p.locator(".figs")
    expect(figs.locator(".fig").nth(0)).to_contain_text("5")
    expect(figs.locator(".fig").nth(2)).to_contain_text("2")
    expect(figs.locator(".fig").nth(3)).to_contain_text("9")
    c.beat("counts")
    c.box("counts", figs)
    c.hold(2200)
    st["job_url"] = p.url
    finish(c, R)


def _edit_row(c: Clip, p, roll: str, label: str, value: str):
    row = p.locator("tr", has_text=roll)
    c.click(row.get_by_role("button", name="Edit row"), f"edit {roll}")
    ed = p.locator("section[aria-label='Edit row']")
    ed.wait_for()
    f = field(ed, label)
    if f.evaluate("e => e.tagName") == "SELECT":
        c.select(f, value, label)
    else:
        c.type(f, value, label=label, delay=45)
    c.click(ed.get_by_role("button", name="Save and re-check row"), "save row")
    p.wait_for_selector(f"text=is now", timeout=10000)
    c.hold(500)


def s05_fix(b, st, R):
    p = st["staff"]
    c = Clip(p, "s05_fix", OUT).start()
    c.click(p.locator(".tabs button", has_text="error"), "Error tab", sound="toggle")
    c.hold(600)
    sanj = p.locator("tr", has_text="KIT26ECE908")
    c.box("suggestion", sanj)
    c.move_to(sanj.locator("text=Did you mean"), 0.3)
    c.beat("suggestion")
    c.hold(1600)
    c.click(sanj.get_by_role("button", name="Use this"), "Use this")
    p.wait_for_selector("text=APAAR ID replaced with the suggestion")
    c.beat("accepted")
    c.hold(1200)
    c.beat("ff_start")
    _edit_row(c, p, "KIT26CSE906", "APAAR ID", "911100000006")
    _edit_row(c, p, "KIT26ECE907", "APAAR ID", "911100000007")
    _edit_row(c, p, "KIT26ECE910", "Date of birth (YYYY-MM-DD)", "2008-06-18")
    _edit_row(c, p, "KIT26CSE913", "Seat category", "REGULAR")
    _edit_row(c, p, "KIT26MTA914", "Programme code", "MTECH-CSE")
    _edit_row(c, p, "KIT26ECE915", "Gender", "F")
    c.beat("ff_end")
    c.click(p.locator(".tabs button", has_text="All rows"), "All rows", sound="toggle")
    riya = p.locator("tr", has_text="KIT26CSE912")
    c.box("duplicate", riya)
    c.click(riya.get_by_role("button", name="Leave out"), "Leave out")
    p.wait_for_selector("text=left out of this upload")
    c.scroll(-2000)
    figs = p.locator(".figs")
    expect(figs.locator(".fig").nth(3)).to_contain_text("0")
    expect(p.get_by_role("button", name="Commit 15 rows")).to_be_visible()
    c.beat("ready")
    c.box("counts", figs)
    c.hold(2000)
    finish(c, R)


def s06_commit(b, st, R):
    staff = st["staff"]
    aicte = new_page(b)
    sign_in(aicte, "aicte.admin@demo.local")
    go(aicte, "/aicte", "text=Excess alerts")
    aicte.wait_for_selector("text=● Live")
    st["aicte"] = aicte
    proj = staff.locator("section.card", has_text="What committing will do")
    c = Clip(staff, "s06_commit_inst", OUT).start()
    a = Clip(aicte, "s06_commit_aicte", OUT).start()
    c.box("projection", proj)
    c.move_to(proj.locator("strong", has_text="BTECH-ECE").last)
    c.hold(1800)
    a.box("figures", aicte.locator(".figs"))
    c.click(staff.locator(".pagehead").get_by_role("button", name="Commit 15 rows"), "Commit 15 rows")
    dlg = staff.locator(".dialog")
    dlg.wait_for()
    c.box("dialog", dlg)
    c.hold(1500)
    c.click(dlg.get_by_role("button", name="Commit 15 rows"), "confirm commit")
    staff.wait_for_selector("text=Committed 15 row(s)")
    c.beat("committed")
    aicte.wait_for_selector("text=updated", timeout=15000)
    a.beat("live_update")
    a.box("updated", aicte.locator(".live"))
    c.hold(2500)
    finish(a, R)
    finish(c, R)


def s07_seatcheck(b, st, R):
    g = new_page(b)
    sign_in(g, "godavari.admin@demo.local")
    st["god"] = g
    c = Clip(g, "s07_seatcheck", OUT).start()
    c.click(g.locator(".mainnav a", has_text="Seat check"), "Seat check")
    g.wait_for_selector("text=Check seats")
    c.hold(400)
    c.select(field(g, "Seat category"), "REGULAR", "Seat category")
    c.click(g.get_by_role("button", name="Check seats"), "Check seats")
    res = g.locator(".banner.error")
    res.wait_for()
    expect(res).to_contain_text("exceed approved intake by 1")
    c.beat("result")
    c.box("result", res)
    c.hold(2600)
    finish(c, R)


def s08_demob(b, st, R):
    g = st["god"]
    c = Clip(g, "s08_demob", OUT).start()
    c.click(g.locator(".mainnav a", has_text="Upload records"), "Upload records")
    g.wait_for_selector("text=Upload student records")
    g.locator("input[type=file]").set_input_files(str(SAMPLES / "demo_B_godavari_upload_2026-27.csv"))
    c.move_to(g.locator("input[type=file]"))
    c.click(g.get_by_role("button", name="Upload and check"), "Upload and check")
    g.wait_for_selector("text=What committing will do")
    proj = g.locator("section.card", has_text="What committing will do")
    expect(proj).to_contain_text("+4 within intake")
    c.box("projection", proj)
    c.move_to(proj.locator("p", has_text="exceed approved capacity"), 0.2)
    c.beat("projection")
    c.hold(2200)
    c.click(g.locator(".pagehead").get_by_role("button", name="Commit 5 rows"), "Commit 5 rows")
    dlg = g.locator(".dialog")
    dlg.wait_for()
    c.hold(1000)
    c.click(dlg.get_by_role("button", name="Commit 5 rows"), "confirm")
    g.wait_for_selector("text=Committed 5 row(s)")
    c.click(g.locator(".mainnav a", has_text="Flags"), "Flags")
    g.wait_for_selector("text=C001_EXCESS_INTAKE")
    tbl = g.locator("table")
    c.box("flags", tbl)
    c.beat("flags")
    c.move_to(g.locator("tr", has_text="C001_EXCESS_INTAKE"), 0.4)
    c.hold(1300)
    c.move_to(g.locator("tr", has_text="D003_XINST_ACTIVE"), 0.4)
    c.hold(1500)
    finish(c, R)


def s09_privacy(b, st, R):
    g, a = st["god"], st["aicte"]
    issues = api_get("aicte.admin@demo.local", "/api/v1/issues?status=OPEN&rule_id=D003_XINST_ACTIVE")["items"]
    d003 = next(i for i in issues if "Godavari" in (i["institution_name"] or ""))
    st["d003"] = d003["id"]
    go(a, f"/issues/{d003['id']}", "text=Evidence")
    cg = Clip(g, "s09_privacy_inst", OUT).start()
    ca = Clip(a, "s09_privacy_aicte", OUT).start()
    cg.click(g.locator("tr", has_text="D003_XINST_ACTIVE").locator("a"), "open D003")
    g.wait_for_selector("text=identity withheld")
    ev_g = g.locator("section.card", has_text="Evidence")
    cg.box("evidence", ev_g)
    cg.move_to(g.locator("td", has_text="identity withheld"), 0.3)
    ev_a = a.locator("section.card", has_text="Evidence")
    ca.box("evidence", ev_a)
    ca.move_to(a.locator("td", has_text="Kaveri Institute"), 0.3)
    expect(a.locator("section.card", has_text="Evidence")).to_contain_text("Godavari Engineering College")
    cg.beat("compare")
    cg.hold(3500)
    finish(ca, R)
    finish(cg, R)


def s10_workflow(b, st, R):
    a, g = st["aicte"], st["god"]
    c = Clip(a, "s10_workflow_aicte", OUT).start()
    note = a.locator("section.card", has_text="Take action").locator("textarea")
    c.type(note, "Please confirm which institution the student is attending.", label="note", delay=28)
    c.click(a.get_by_role("button", name="Request clarification"), "Request clarification")
    a.wait_for_selector("text=Request clarification: done")
    c.box("history", a.locator("section.card:has(h2:text-is('History'))"))
    c.beat("clarified")
    c.hold(1500)
    finish(c, R)

    cg = Clip(g, "s10_workflow_cancel", OUT).start()
    targets = ["GEC26CSE901", "GEC26CSE902", "GEC26CSE903", "GEC26BTECHCSE001"]
    for i, roll in enumerate(targets):
        go(g, f"/records?q={roll}", "table")
        cg.click(g.locator("tr", has_text=roll).locator("a").first, f"open {roll}")
        g.wait_for_selector("text=Change status")
        cg.click(g.get_by_role("button", name="Change status"), "Change status")
        cg.select(field(g, "New status"), "CANCELLED", "New status")
        reason = g.locator(".field", has=g.locator("label:text-is('Reason')")).locator("input")
        cg.type(reason, "Duplicate provisional admission", label="reason", delay=22 if i else 40)
        cg.click(g.get_by_role("button", name="Mark as cancelled"), "Mark as cancelled")
        g.wait_for_selector("text=Status changed to CANCELLED")
        if i == 0:
            cg.beat("ff_start")
    cg.beat("ff_end")
    cg.hold(800)
    finish(cg, R)

    c001 = api_get("aicte.admin@demo.local", "/api/v1/issues?status=RESOLVED&rule_id=C001_EXCESS_INTAKE")["items"]
    c001 = next(i for i in c001 if "Godavari" in (i["institution_name"] or ""))
    ca = Clip(a, "s10_workflow_auto", OUT).start()
    go(a, f"/issues/{c001['id']}", "text=History")
    expect(a.locator("section.card:has(h2:text-is('History'))")).to_contain_text("system auto resolved")
    hist = a.locator("section.card:has(h2:text-is('History'))")
    hist.scroll_into_view_if_needed()
    ca.box("history", hist)
    ca.move_to(hist.locator("li", has_text="system auto resolved"), 0.3)
    ca.beat("auto")
    ca.hold(3000)
    finish(ca, R)


def s11_priority(b, st, R):
    a = st["aicte"]
    c = Clip(a, "s11_priority", OUT).start()
    c.click(a.locator(".mainnav a", has_text="Review priority"), "Review priority")
    a.wait_for_selector("text=not evidence of wrongdoing")
    c.box("disclaimer", a.locator(".banner.warn"))
    c.hold(1200)
    first = a.locator("section.card").first
    c.box("top", first)
    c.move_to(first.locator("tr").first, 0.5)
    c.hold(1600)
    c.click(a.locator(".mainnav a", has_text="Identity candidates"), "Identity candidates")
    a.wait_for_selector("text=Why we think these match")
    card = a.locator("section.card", has_text="Why we think these match").first
    c.box("weights", card)
    c.move_to(card.locator("table").last, 0.5, 0.3)
    c.beat("weights")
    c.hold(2600)
    finish(c, R)


def s12_issue(b, st, R):
    k = new_page(b)
    sign_in(k, "kaveri.admin@demo.local")
    st["kadmin"] = k
    s = new_page(b)
    sign_in(s, "student.ananya@demo.local")
    st["student"] = s
    c = Clip(k, "s12_issue_inst", OUT).start()
    go(k, "/records?q=Ananya", "table")
    c.click(k.locator("tr", has_text="Ananya Iyer").locator("a").first, "open record")
    k.wait_for_selector("text=Signed records")
    c.click(k.locator(".tabs button", has_text="Signed records"), "Signed records tab", sound="toggle")
    c.click(k.get_by_role("button", name="Issue signed record"), "Issue signed record")
    k.wait_for_selector("text=Signed record issued")
    c.beat("issued")
    c.hold(1500)
    st["record_url"] = k.url
    finish(c, R)

    cs = Clip(s, "s12_issue_student", OUT).start()
    go(s, "/me", "text=Share a signed record")
    sec = s.locator("section.card", has_text="Share a signed record")
    sec.scroll_into_view_if_needed()
    cs.box("claims", sec)
    for claim in ("Institution", "Programme", "Enrolment status"):
        cs.move_to(sec.locator("label", has_text=claim).first, 0.1)
        cs.hold(350)
    cs.move_to(sec.locator("label", has_text="APAAR ID").first, 0.1)
    cs.hold(700)
    cs.click(sec.get_by_role("button", name="Create share token"), "Create share token")
    s.wait_for_selector(".qr svg")
    cs.box("qr", s.locator(".qr"))
    st["token"] = s.locator(".token").first.inner_text().strip()
    cs.beat("shared")
    cs.hold(2400)
    finish(cs, R)


def s13_verify(b, st, R):
    v = new_page(b)
    go(v, "/verify", "text=Verify a student record")
    st["public"] = v
    c = Clip(v, "s13_verify", OUT).start()
    ta = v.locator("textarea")
    c.click(ta, "paste token")
    ta.fill(st["token"])
    c.log("type", label="paste", chars=1, duration=0.1)
    c.hold(500)
    c.click(v.get_by_role("button", name="Verify record"), "Verify record")
    v.wait_for_selector("text=Genuine and current")
    c.box("checks", v.locator("section.card", has_text="Details the student shared"))
    c.beat("valid")
    c.hold(2600)
    c.click(v.get_by_role("button", name="Demo: tamper with this record (edit a value)"), "tamper")
    v.wait_for_selector("text=Do not rely on this record")
    c.box("failed", v.locator("section.card", has_text="Do not rely"))
    c.move_to(v.locator(".check", has_text="Disclosed values match"), 0.2)
    c.beat("tampered")
    c.hold(2500)
    finish(c, R)

    k = st["kadmin"]
    ck = Clip(k, "s13_revoke", OUT).start()
    ck.click(k.get_by_role("button", name="Revoke record").first, "Revoke record")
    dlg = k.locator(".dialog")
    dlg.wait_for()
    ck.type(dlg.locator("input"), "Issued in error during the demo", label="reason", delay=35)
    ck.click(dlg.get_by_role("button", name="Revoke record"), "confirm revoke")
    k.wait_for_selector("text=Record revoked")
    ck.hold(900)
    finish(ck, R)

    c2 = Clip(v, "s13_revoked", OUT).start()
    ta = v.locator("textarea")
    c2.click(ta, "paste token")
    ta.fill(st["token"])
    c2.click(v.get_by_role("button", name="Verify record"), "Verify record")
    v.wait_for_selector("text=Revoked on")
    c2.box("revoked", v.locator(".check", has_text="Revocation status"))
    c2.move_to(v.locator(".check", has_text="Revocation status"), 0.3)
    c2.beat("revoked")
    c2.hold(2600)
    finish(c2, R)


def s14_consent(b, st, R):
    me = api_get("student.ananya@demo.local", "/api/v1/me/record")
    apaar, dob = me["student"]["apaar_id"], me["student"]["date_of_birth"]
    vp = new_page(b)
    sign_in(vp, "verifier@demo.local")
    s = st["student"]
    c = Clip(vp, "s14_consent_verifier", OUT).start()
    go(vp, "/verifier/requests", "text=Send request")
    c.type(field(vp, "APAAR ID (12 digits)"), apaar, label="APAAR", delay=40)
    c.type(field(vp, "Date of birth (YYYY-MM-DD)"), dob, label="DOB", delay=40)
    c.type(field(vp, "Purpose (shown to the student)"), "Pre-employment verification", label="purpose", delay=30)
    c.click(vp.get_by_role("button", name="Send request"), "Send request")
    vp.wait_for_selector("text=student will be asked for consent")
    c.box("message", vp.locator(".banner.info"))
    c.hold(1500)
    c.click(vp.get_by_role("button", name="Check result").first, "Check result")
    vp.wait_for_selector("text=not given consent")
    c.beat("403")
    c.hold(1800)
    finish(c, R)

    cs = Clip(s, "s14_consent_student", OUT).start()
    go(s, "/me", "text=Verification requests waiting for you")
    cs.click(s.get_by_role("button", name="Review request").first, "Review request")
    dlg = s.locator(".dialog")
    dlg.wait_for()
    cs.box("fields", dlg)
    cs.move_to(dlg.locator("ul"), 0.3, 0.5)
    cs.hold(2200)
    cs.click(dlg.get_by_role("button", name="Allow"), "Allow")
    s.wait_for_selector("text=You allowed this verification")
    cs.hold(900)
    finish(cs, R)

    c2 = Clip(vp, "s14_consent_result", OUT).start()
    go(vp, "/verifier/requests", "text=Send request")
    c2.click(vp.get_by_role("button", name="View result").first, "View result")
    vp.wait_for_selector("text=SIMULATED")
    row = vp.locator("tr", has_text="APPROVED").first
    c2.box("result", row)
    c2.move_to(row, 0.75, 0.5)
    c2.beat("result")
    c2.hold(2600)
    finish(c2, R)


def s15_close(b, st, R):
    au = new_page(b)
    sign_in(au, "auditor@demo.local")
    c = Clip(au, "s15_audit", OUT).start()
    go(au, "/audit", "text=Verify chain integrity")
    c.hold(600)
    c.click(au.get_by_role("button", name="Verify chain integrity"), "Verify chain integrity")
    au.wait_for_selector("text=Chain intact")
    c.box("chain", au.locator(".banner.ok"))
    c.beat("intact")
    c.hold(2600)
    finish(c, R)


def s16_minor(b, st, R):
    """R015: a student under 18 without recorded guardian consent cannot share a signed record."""
    m = new_page(b)
    sign_in(m, "student.sneha@demo.local")
    go(m, "/me", "text=Share a signed record")
    c = Clip(m, "s16_minor", OUT).start()
    sec = m.locator("section.card", has_text="Share a signed record")
    c.move_to(sec.locator("h2"))
    c.box("share", sec)
    c.click(sec.locator("input[type=checkbox]").first, "choose claim", sound="toggle")
    c.click(sec.get_by_role("button", name="Create share token"), "Create share token")
    m.wait_for_selector("text=under 18")
    c.box("held", m.locator(".banner.error"))
    c.beat("held")
    c.hold(2600)
    finish(c, R)


def s17_status(b, st, R):
    """Public system status: what is built and tested, simulated, not built, or external."""
    pg = new_page(b)
    go(pg, "/status", "text=System status")
    c = Clip(pg, "s17_status", OUT).start()
    c.box("counts", pg.locator(".figs"))
    c.move_to(pg.locator(".figs"), 0.5, 0.5)
    c.beat("counts")
    c.hold(1500)
    c.scroll(900, steps=24)
    c.move_to(pg.locator("tr", has_text="Simulated").first, 0.3)
    c.beat("simulated")
    c.hold(1600)
    c.scroll(1400, steps=30)
    c.hold(1400)
    finish(c, R)


SCENES = [s02_signin, s03_dashboard, s04_upload, s05_fix, s06_commit, s07_seatcheck, s08_demob, s09_privacy,
          s10_workflow, s11_priority, s12_issue, s13_verify, s14_consent, s15_close, s16_minor, s17_status]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--headed", action="store_true")
    ap.add_argument("--only", default="", help="comma-separated scene names (scenes share state; prerequisites run too)")
    args = ap.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    SHOTS.mkdir(parents=True, exist_ok=True)
    httpx.get(f"{BASE}/api/health").raise_for_status()
    results: dict = {}
    state: dict = {}
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=CHROME if Path(CHROME).exists() else None, headless=not args.headed)
        for scene in SCENES:
            print(f"scene {scene.__name__}", flush=True)
            try:
                scene(browser, state, results)
            except Exception:
                for i, ctx in enumerate(browser.contexts):
                    for j, pg in enumerate(ctx.pages):
                        pg.screenshot(path=f"/var/tmp/fail_{scene.__name__}_{i}_{j}.png")
                raise
        browser.close()
    (OUT / "index.json").write_text(json.dumps(results, indent=1))
    print(f"\nRecorded {len(results)} clips, {sum(m['duration'] for m in results.values()):.1f}s of footage -> {OUT}")


if __name__ == "__main__":
    main()
