# Archive Report: Invite-Only Auth

**Change**: invite-only-auth  
**Archived**: 2026-05-11  
**Mode**: hybrid  
**Delivery**: single-pr

## Source Artifacts Read

- Engram proposal: `#4282` / `sdd/invite-only-auth/proposal`
- Engram spec: `#4284` / `sdd/invite-only-auth/spec`
- Engram design: `#4287` / `sdd/invite-only-auth/design`
- Engram tasks: `#4289` / `sdd/invite-only-auth/tasks`
- Engram apply-progress: `#4290` / `sdd/invite-only-auth/apply-progress`
- Engram verify-report: `#4293` / `sdd/invite-only-auth/verify-report`
- OpenSpec proposal: `openspec/changes/invite-only-auth/proposal.md`
- OpenSpec spec: `openspec/changes/invite-only-auth/specs/invite-only-auth/spec.md`
- OpenSpec design: `openspec/changes/invite-only-auth/design.md`
- OpenSpec tasks: `openspec/changes/invite-only-auth/tasks.md`
- OpenSpec apply-progress: `openspec/changes/invite-only-auth/apply-progress.md`
- OpenSpec verify-report: `openspec/changes/invite-only-auth/verify-report.md`

## Archive Action

- No `openspec/specs/` main spec tree exists in this repository, so there was nothing to merge into a source-of-truth spec.
- The change folder was prepared for archive as a complete historical record.

## What Was Archived

- `proposal.md`
- `specs/invite-only-auth/spec.md`
- `design.md`
- `tasks.md`
- `apply-progress.md`
- `verify-report.md`

## What Remains

- No main spec update was possible because `openspec/specs/` is absent.
- The archived change remains the single OpenSpec record for this capability.

## Verification Summary

- Local verification completed with verdict: **PASS WITH WARNINGS**.
- Remaining warning: live sandbox smoke (`npx ampx sandbox` under Node LTS) is intentionally manual and was not run here.

## Notes

- This archive preserves the delta spec as authored because there is no main spec tree to sync into.
