# Smart Contract Security Audit Runbook

This runbook defines how Stellar Veriphy engages external auditors, remediates findings, and publishes results.

## 1) Select Reputable Audit Firm

Use this selection scorecard:

- Soroban/Rust smart contract audit experience (required)
- Public track record of high-quality reports (required)
- Clear disclosure policy and conflict-of-interest statement
- SLA for critical issue turnaround
- Post-fix re-audit availability

Recommended candidate shortlist process:

1. Request proposals from at least 3 firms.
2. Score each proposal against the above criteria.
3. Select highest-scoring firm with available timeline.

## 2) Provide Complete Codebase

Audit scope must include:

- `contracts/oracle`
- `contracts/provenance`
- `contracts/registry`
- Any deployment scripts and configuration that affect runtime behavior
- Threat model and architecture notes from `contracts/IMPLEMENTATION.md`

Audit handoff package checklist:

- Commit hash / release tag in scope
- Build/test commands
- Privileged roles matrix
- Invariants and assumptions
- Known limitations and out-of-scope items

## 3) Address All Critical Findings

Remediation policy:

- Critical: must fix before production release.
- High: must fix or provide documented compensating controls.
- Medium/Low: triage with risk acceptance sign-off.

For each finding:

1. Create issue with severity and affected component.
2. Implement fix with regression tests.
3. Link fix PR to finding ID.
4. Record status in audit tracking table.

## 4) Document Audit Results

Maintain an internal audit ledger for every finding:

- Finding ID
- Severity
- Description
- Impact
- Fix commit
- Test evidence
- Reviewer sign-off
- Final status

## 5) Publish Audit Report

Publication checklist:

- Redact sensitive exploit details only when necessary.
- Publish full report in `docs/security/reports/`.
- Add release note linking the report.
- Announce resolved critical/high findings.

## 6) Re-Audit After Fixes

After remediation:

1. Submit patched commit range for focused re-audit.
2. Obtain written confirmation of resolved critical/high issues.
3. Publish addendum report documenting closure.

## Suggested Firms (Initial Targets)

- Trail of Bits
- Halborn
- Zellic
- Quantstamp
- OpenZeppelin (if Soroban scope supported at engagement time)

Final firm selection must use the scorecard above and current availability.
