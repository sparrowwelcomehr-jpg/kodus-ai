# Invert Stage Visibility Defaults

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Change the default visibility of pipeline stages to `SECONDARY` (hidden by default) and explicitly mark key business stages as `PRIMARY`.

**Tech Stack:** TypeScript.

---

### Task 1: Change Default Visibility

**Files:**

- Modify: `libs/core/infrastructure/pipeline/abstracts/base-stage.abstract.ts`

**Steps:**

1.  Change default `visibility` value to `StageVisibility.SECONDARY`.

---

### Task 2: Mark Business Stages as Primary

**Files:**

- Modify the following stages to set `visibility = StageVisibility.PRIMARY`:
    - `libs/code-review/pipeline/stages/process-files-review.stage.ts`
    - `libs/code-review/pipeline/stages/load-external-context.stage.ts`
    - `libs/code-review/pipeline/stages/validate-new-commits.stage.ts`
    - `libs/code-review/pipeline/stages/initial-comment.stage.ts`
    - `libs/code-review/pipeline/stages/process-files-pr-level-review.stage.ts`
    - `libs/code-review/pipeline/stages/create-pr-level-comments.stage.ts`
    - `libs/code-review/pipeline/stages/create-file-comments.stage.ts`
    - `libs/code-review/pipeline/stages/update-comments-and-generate-summary.stage.ts`
    - `libs/code-review/pipeline/stages/request-changes-or-approve.stage.ts`

**Steps:**

1.  Add/Update `readonly visibility = StageVisibility.PRIMARY;` in each class.
2.  Ensure `StageVisibility` enum is imported.

---

### Task 3: Cleanup Old Overrides

**Files:**

- Check stages that were explicitly set to SECONDARY before (e.g. `ResolveConfig`).
- Remove the override since it's now the default. (Optional cleanup, but good for code hygiene).
