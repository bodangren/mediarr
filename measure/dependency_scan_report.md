# Dependency Vulnerability Scan Report

**Date:** March 3, 2026
**Summary:** Total 8 packages affected by 14 known vulnerabilities (0 Critical, 10 High, 2 Medium, 2 Low).

## Scope Disposition (March 5, 2026)

- For the current trusted-LAN project scope, dependency upgrades are tracked as optional maintenance ("nice to have").
- This report remains a maintenance reference and does not block current-scope feature delivery.

## Key Findings

### Priority 1: Critical Build-Tool Vulnerability
- **Package:** `rollup`
- **Vulnerability:** GHSA-mw96-cpmx-2vgc (Arbitrary File Write via Path Traversal)
- **Severity:** 8.8 (High)
- **Minimal Fix Version:** 4.59.0

### Priority 2: Web Framework & API Security
- **Package:** `fastify`
- **Vulnerability:** GHSA-jx2c-rxcm-jvmq (Validation Bypass via Content-Type Tab Character)
- **Severity:** 7.5 (High)
- **Minimal Fix Version:** 5.7.2

- **Package:** `ip`
- **Vulnerability:** GHSA-2p57-rm9w-gvfp (SSRF via Improper Categorization in isPublic)
- **Severity:** 8.1 (High)
- **Fix:** No fix available in 2.x; migrate to a newer library.

### Priority 3: Denial of Service (DoS) Protections
- **Package:** `fast-xml-parser`
- **Vulnerability:** GHSA-jmr7-xgp7-cmfj (DoS via Entity Expansion)
- **Severity:** 7.5 (High)
- **Minimal Fix Version:** 5.3.6

- **Package:** `minimatch`
- **Vulnerability:** GHSA-3ppc-4f35-3m26 (ReDoS via repeated wildcards)
- **Severity:** 8.7 (High)
- **Minimal Fix Version:** 9.0.6 / 3.1.3

## Full Scan Details
Scanned `/home/daniel-bo/Desktop/mediarr/package-lock.json`
- `ajv@6.12.6`: GHSA-2g4f-4pwh-qvx6 (ReDoS)
- `ajv@8.17.1`: GHSA-2g4f-4pwh-qvx6 (ReDoS)
- `fast-xml-parser@5.3.5`: GHSA-fj3w-jwp8-x2g3, GHSA-jmr7-xgp7-cmfj
- `fastify@5.6.1`: GHSA-jx2c-rxcm-jvmq, GHSA-mrq3-vjjr-p77c
- `ip@2.0.1`: GHSA-2p57-rm9w-gvfp
- `minimatch@3.1.2`: GHSA-23c5-xmqv-rm74, GHSA-3ppc-4f35-3m26, GHSA-7r86-cg39-jmmj
- `minimatch@9.0.5`: GHSA-23c5-xmqv-rm74, GHSA-3ppc-4f35-3m26, GHSA-7r86-cg39-jmmj
- `rollup@4.57.1`: GHSA-mw96-cpmx-2vgc
