---
name: 'feature-request-issue-author'
description: 'Creates a high-quality feature request issue for missing-data guidance in preview/submit flows, with architecture-first analysis, implementation research, risks, UX impact, and delivery changes.'
---

# Feature Request Issue Author

When asked to create a feature request issue, create it directly in the current repository and ensure it is actionable for engineering.

## What this skill does

1. Identifies where the app currently handles **preview email** and **submit** flows.
2. Produces preliminary implementation research (likely files/components/services to change).
3. Creates a feature request issue with pragmatic design guidance, risks, UX impact, and delivery implications.

## Required issue content

Use this structure in the issue body:

### 1) Problem statement
- Explain that users are missing required data and currently do not get sufficiently helpful guidance before preview/submit.
- State why this causes confusion, failed actions, and support burden.

### 2) Goal / outcome
- Clear guidance at the point of failure.
- Users know exactly what is missing and how to fix it.
- Behavior is consistent across preview and submit paths.

### 3) Preliminary code research
- List likely files/modules to update (UI validation, request orchestration, message rendering, shared validation utilities, tests).
- For each, include **why it is relevant** and likely change scope.

### 4) Pragmatic design patterns
- Prefer shared validation logic over duplicated checks.
- Return structured validation results (field, reason, user-facing guidance).
- Keep domain validation separate from UI presentation.
- Reuse existing error/notification patterns in the repo.

### 5) Where to start
- Suggest a smallest vertical slice (e.g., submit path first), then extend to preview.
- Add shared validator + one UI integration path + tests before broad rollout.

### 6) Dangers / pitfalls
- Divergent validation rules between preview and submit.
- Overly technical or vague user messages.
- Blocking valid submissions due to incorrect required-field assumptions.
- Accessibility regressions in inline/error-summary messaging.

### 7) End-user impact (good and bad)
- **Good:** clearer next steps, fewer failed attempts, faster completion.
- **Bad/Tradeoff:** potentially more visible validation prompts and stricter enforcement.

### 8) Testing changes
- Unit tests for validation rules and message mapping.
- Integration tests for preview and submit error states.
- Regression tests for existing successful flows.
- Accessibility checks for error announcements and focus management.

### 9) Packaging/deployment changes
- Note whether changes are code-only vs. config/schema/API contract.
- Mention rollout strategy (feature flag if needed), monitoring, and rollback plan.
- Call out any release note/update to user documentation/support scripts.

### 10) Additional concerns
- Telemetry for validation failure reasons.
- Localization/wording consistency.
- Backward compatibility with existing drafts/data.

## Execution guidance

- Use PowerShell + GitHub CLI:
  - `gh issue create --title "<title>" --body-file "<path-to-body-file>"`
- Keep the title explicit, e.g.:
  - `Feature: Improve missing-required-data guidance for preview email and submit flows`
- Ensure the issue is specific enough to be implemented without guesswork.

## Agent steering (architecture-first)

When multiple agents are available, prefer this order:

1. `software-engineering-team:se-system-architecture-reviewer` (primary)
2. `rubber-duck` (secondary design sanity check)
3. `general-purpose` (fallback)

### Routing guidance

- Use the architecture reviewer when the request includes:
  - cross-cutting validation behavior,
  - shared-domain rule design,
  - UI + backend contract implications,
  - rollout/risk decisions.
- Instruct the selected agent to produce:
  - bounded-context/file-impact analysis,
  - decision tradeoffs and chosen architecture,
  - pragmatic patterns (shared validator, clear contracts, separation of concerns),
  - risk register + mitigation,
  - test/packaging/deployment impact.

### Prompting hint (for kickoff/user prompt)

"Use **software-engineering-team:se-system-architecture-reviewer** and generate an architecture-first feature request issue with file-level impact analysis and design tradeoffs."