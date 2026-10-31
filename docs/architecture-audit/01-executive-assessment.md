# 01 — Executive assessment (Phase A audit)

**Audit facts:**
- **Date:** 31 Oct 2026
- **Code audited:** branch `claude/busy-newton-qnsfmy` at `b0072e7`
- **Design audited:** *SIH26263 Final Architecture Blueprint v3* (50 pages)
- **Mode:** read-only. No application code, migrations, deployment or production settings were changed in Phase A.

## Bottom line

The prototype is **real, tested and demo-able**:
- 109 tests pass on both SQLite and PostgreSQL 16.
- Demos A, B and C run end-to-end.
- A 5,000-row preview completes in 5.7–11.9 s.

It is **not the system v3 describes**:
- About 15 capabilities that v3 §25 labels PROTOTYPE are not implemented, including the claims register v3 itself cites as authoritative.
- Four high-severity issues need fixing before any wider exposure:
  - the XLSX zip/XML-bomb path;
  - the non-atomic audit;
  - the ungated demo-accounts endpoint;
  - no handling of minors' consent.

None of these needs new infrastructure. The v3 additions of Redis and Kubernetes are not justified by the measured load; Postgres primitives cover pilot scale.

**Overall: 5.4/10 today → about 7.4/10 after the recommended Option B (≈3 weeks)** (doc 10).

## Top findings

1. **Honesty gap:** v3 overstates implementation, and there is no claims register to keep docs and code in sync (doc 02 §B). Fix with P0-1.
2. **Correctness gaps:**
   - The audit event is written after commit in a separate transaction (lost events go undetected).
   - The last-seat race is unlocked.
   - Issue dedupe is racy.
   - There are no migrations.
3. **Security:**
   - Login timing oracle (measured 10–20 ms vs 150–200 ms).
   - Parser bomb.
   - In-memory rate limiter.
   - Signing keys in the same DB.
   - JWT in sessionStorage with no revocation.
   - No HSTS and no MFA. A CSP and other security headers are already set (doc 07 S11).
4. **Performance:** the preview meets the NFR. A 5k-row commit takes 49 s synchronously on PG, which will exceed serverless limits with network latency. The fix is background jobs.
5. **Strengths to keep:**
   - The single-writer validation engine.
   - The computed seat ledger.
   - Privacy-preserving D003 redaction.
   - SD-JWT selective disclosure.
   - Excellent correction copy.
   - SIMULATED labelling.

## Recommendation

**Option B, balanced:**
- All P0 items.
- The pilot-critical P1 items: jobs/outbox, batched queries, share codes, explanations, central scoping, token hardening, idempotency TTL and audit checkpoints.
- One differentiator: the **inter-institution transfer workflow** (F-15).

Postgres stays the only stateful service. Vercel stays demo-only with synthetic data.

## Document index

| Doc | Content |
|---|---|
| 02 | Architecture-vs-code matrix (statuses per capability; false claims; Codex branch review) |
| 03 | Current-system technical audit and measured baseline |
| 04 | Architecture decision review (KEEP / MODIFY / REPLACE / DEFER / REMOVE) |
| 05 | External research with sources and reliability |
| 06 | 18 feature proposals + per-role UX audit |
| 07 | Security, privacy and failure assessment |
| 08 | Recommended architecture with diagrams |
| 09 | P0–P3 roadmap, sequence, approvals needed |
| 10 | Scorecard, the 12 answers, options A/B/C |
| 11 | Proposed DB and API changes |
| 12 | ADR proposals |
| 13 | Risk and dependency register |

## What this audit does not claim

- No legal compliance (DPDP, CERT-In) or security certification is claimed.
- No availability of government APIs is assumed. APAAR, DigiLocker, AISHE and the approval-portal feed are marked EXT.
- Not measured: load and concurrency, a Docker build (no daemon in this environment), and deployed behaviour (nothing is deployed).
