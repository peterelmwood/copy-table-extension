---
name: 'bug-report-issue-author'
description: 'Creates a high-quality bug report issue with architecture-first root-cause analysis, code-level research (file+line), impact/severity, regression risks, testing changes, and delivery/rollback implications.'
---

# Bug Report Issue Author

When asked to create (or improve) a bug report issue, create/update it directly in the current
repository and ensure it is actionable for engineering — the same architecture-first, research-driven
rigor as a feature request, but oriented toward remediation of a defect.

## What this skill does

1. Reproduces/confirms the defect and pins the **root cause** in code with concrete file + line references.
2. Distinguishes **observed vs. expected** behavior and assesses impact/severity.
3. Produces a bug report issue with a pragmatic fix approach, regression risks, testing changes, and
   delivery implications — actionable without guesswork.

## Required issue content

Use this structure in the issue body. Preserve any original screenshots (`<img>` tags) and reviewer
callouts (`> [!NOTE]` / `> [!WARNING]`) verbatim at the top.

### 1) Bug summary (observed vs. expected)
- State precisely what happens now (**observed**) and what should happen (**expected**).
- Keep it concrete and reproducible; reference the specific flow/screen/field.

### 2) Impact & severity
- Who is affected and how badly (data loss, blocked workflow, cosmetic, misrouting, etc.).
- Assign a severity (Low / Medium / High) with a one-line justification.

### 3) Root-cause analysis / code research
- Identify the responsible code with **file + line** references and short snippets.
- Explain *why* the defect occurs (the actual mechanism), not just where.
- Note any environment sensitivity (e.g., production-only, config-masked, timing).

### 4) Preliminary fix approach & pragmatic patterns
- Prefer reusing existing correct patterns/predicates/constants over new ad-hoc logic.
- Keep the fix in one shared source of truth so the defect cannot re-diverge.
- Separate domain logic from UI presentation.

### 5) Where to start (smallest slice)
- Suggest the smallest correctness slice (single function/predicate) plus a covering test first,
  then extend to related call sites.

### 6) Dangers / pitfalls & regression risks
- What could break, what must stay unchanged, and what to assert to prove no regression.
- Call out masking environments (dev/live-testing) that can hide the defect from manual checks.

### 7) End-user impact
- **Good:** the corrected behavior users will now see.
- **Tradeoff:** any behavior change or newly enforced constraint.

### 8) Testing changes
- Unit tests for the root-cause condition (including the previously failing case).
- Regression tests proving unaffected flows are unchanged.
- Production/config-sensitive assertions where dev cannot catch the defect.

### 9) Packaging / deployment changes
- Code-only vs. config/schema/contract change; rollout, monitoring, and rollback notes.
- Flag production-only defects for manual live verification before sign-off.

### 10) Additional concerns
- Related issues, opportunities to centralize logic to prevent recurrence, telemetry, wording.

## Execution guidance

- Use PowerShell + GitHub CLI:
  - Create: `gh issue create --title "<title>" --body-file "<path-to-body-file>"`
  - Improve existing: `gh issue edit <number> --repo <owner/repo> --body-file "<path-to-body-file>"`
- Write body files to a scratch/session directory, **not** the repo.
- Keep the title explicit and prefixed, e.g.:
  - `Bug: <component> <symptom> (<root-cause hint>)`
- Ensure the issue is specific enough to be implemented without guesswork; always include at least
  one concrete file + line root-cause pointer.
- Preserve original screenshots and reviewer callouts verbatim.

## Agent steering (architecture-first)

When multiple agents are available, prefer this order:

1. `software-engineering-team:se-system-architecture-reviewer` (primary)
2. `rubber-duck` (secondary design/root-cause sanity check)
3. `general-purpose` (fallback)

### Routing guidance

- Use the architecture reviewer when the bug involves:
  - cross-cutting behavior or shared-domain rules,
  - UI + backend contract implications,
  - environment/config-sensitive (e.g., production-only) defects,
  - fixes that risk regressions across multiple call sites.
- Instruct the selected agent to produce:
  - root-cause mechanism with file-impact analysis,
  - the minimal shared-source-of-truth fix and why alternatives were rejected,
  - regression risk register + mitigations,
  - test/packaging/deployment impact (including production verification where dev masks the defect).

### Prompting hint (for kickoff/user prompt)

"Use **software-engineering-team:se-system-architecture-reviewer** and generate an architecture-first
bug report issue with a file-level root-cause analysis, regression risk register, and a minimal
shared-source-of-truth fix approach."
