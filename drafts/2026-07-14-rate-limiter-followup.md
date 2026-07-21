# Billing API Rate Limiter — Follow-Up Draft (Optional / Shorter)

**Date:** 2026-07-14
**Target Work Story:** Billing API rate limiter
**Work Story id:** Not independently verified this session — requester states this story exists in config, is rendered **Live** on Chief's Agents tab, on branch `claude/chief-planner-verify-jba89n` @ commit `9a586bd`. Treated as asserted context only.
**Status per requester:** Live

---

## Why this matters

This is the third and lowest-priority draft for tonight, produced because budget remained after the first two. Scope is intentionally narrow per the request: **what an operator needs to know that is not yet written down**, focused on sustained near-limit traffic, cross-tenant fairness, and observability — not a general rate-limiting tutorial.

---

## Current known context

**Facts (asserted, not verified in code this session):** A Work Story for "Billing API rate limiter" exists and is Live. It is presumably related to (but distinct from) the "Billing API webhook retries" story covered in a separate draft tonight — both appear to be sibling Work Stories under a "Billing API" umbrella, based on naming alone.

**Assumptions:** The actual rate-limiting algorithm, tenant model, and current limit thresholds in this product are unknown to this research shift. Nothing below should be read as a description of what's implemented — only of what the industry considers good practice and what questions that raises.

---

## External landscape (condensed)

- **Token bucket** is the commonly recommended algorithm for per-user/per-tenant limiting: constant-time operations, natural burst tolerance, straightforward atomic-counter implementation (e.g., Redis + Lua for atomic updates in distributed setups).
- **Fairness in multi-tenant systems** typically requires layered limits (per-tenant, and potentially per-endpoint or per-key within a tenant) plus fair queuing, specifically to prevent one "noisy neighbor" tenant from degrading service for others sharing the same backend capacity.
- **Near-limit traffic handling is commonly graduated, not binary**: recommended pattern is to warn before rejecting — e.g., return warning headers while still fulfilling requests as a tenant approaches its limit, only moving to hard `429` rejection once the limit is fully exceeded, rather than a sharp cliff.
- **Architectural separation**: some designs split a slower, audited control plane (policy/limit management) from a fast data plane (the actual per-request allow/deny decision), so policy changes don't need to be on the hot path.

---

## Open questions and risks (operator-facing gaps)

- **Is there per-tenant fairness today**, or is the current limiter a single global/shared limit that one heavy tenant could exhaust on behalf of others? Unknown — this is the single highest-value question to answer before anything else here.
- **What does "near-limit" look like to an operator right now?** Is there any warning signal before a tenant actually gets rejected, or is the first visible sign a `429`/blocked gate?
- **What would Chief need to show** to make sustained near-limit traffic visible as a trend (not just a point-in-time blocked-gate card) — e.g., a per-tenant utilization percentage, a rolling rejection-rate metric?
- **Is the current limiter's behavior under sustained (not spiky) near-limit load known/tested?** Token-bucket burst tolerance is well understood for short bursts; sustained near-limit load over a long window is a distinct scenario worth confirming behavior for.

---

## Recommended deterministic research requests

1. **Inventory the actual current rate-limiting implementation** (algorithm, per-tenant vs. global scope, limit thresholds) by reading the relevant code on the canonical branch — code-grounded fact-finding, not web research.
2. **Determine whether fairness is enforced per-tenant today**, and if not, scope what a minimal per-tenant fairness layer would require.
3. **Define a near-limit warning signal** (e.g., a utilization-percentage threshold) that could be surfaced to an operator before a tenant is actually rejected, distinct from the existing blocked-gate signal.
4. **Specify the minimal observability** needed for a "rate limiter health" view: per-tenant utilization, rejection rate over time, and whether any single tenant is a repeat offender.

---

## Draft note body

The open question for this Work Story is less "does rate limiting work" (it's already Live) and more "is it fair, and is it visible before it bites." The literature is consistent that per-tenant fairness and graduated near-limit warnings (rather than a hard cliff at the limit) are what separates a rate limiter that merely protects the backend from one that's also operable — i.e., something a human can watch trend toward a problem instead of only finding out after a tenant is already blocked. This product's actual tenant model and current limiter scope are unknown to this research shift and are the necessary first fact-finding step (recommended request #1) before any of the fairness or observability follow-ups can be scoped concretely.

---

## Sources consulted

- [System Design - Multi-Tenant API Rate Limiting Service | Medium](https://medium.com/@khalilsayed/system-design-multi-tenant-rate-limiting-service-32c63ade5ec7)
- [API Rate Limiting at Scale: Patterns, Failures, and Control Strategies | Gravitee](https://www.gravitee.io/blog/rate-limiting-apis-scale-patterns-strategies)
- [Rate Limiting in Multi-Tenant APIs: Key Strategies | DreamFactory Blog](https://blog.dreamfactory.com/rate-limiting-in-multi-tenant-apis-key-strategies)
- [API Rate Limiting Strategies: 2026 Engineering Reference | Digital Applied](https://www.digitalapplied.com/blog/api-rate-limiting-strategies-2026-engineering-reference)
- [How to Implement API Rate Limiting Strategies | OneUptime](https://oneuptime.com/blog/post/2026-02-20-api-rate-limiting-strategies/view)
