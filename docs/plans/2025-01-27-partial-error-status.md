# Implement Partial Error Status

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Introduce `PARTIAL_ERROR` status to distinguish stages that completed with warnings (e.g., some files failed analysis) from full success or full failure.

**Architecture:** Update Enum, Migrate DB, Update Observer logic.

**Tech Stack:** TypeScript, PostgreSQL, TypeORM.

---

### Task 1: Update AutomationStatus Enum

**Files:**

- Modify: `libs/automation/domain/automation/enum/automation-status.ts`

**Step 1:**

- Add `PARTIAL_ERROR = 'partial_error'` to the enum.

---

### Task 2: Generate Migration

**Steps:**

1.  Run `yarn migration:generate addPartialErrorStatus`.
2.  **Inspect:** Check if it contains `ALTER TYPE ... ADD VALUE`.
3.  **Fallback:** If TypeORM missed it (common with enums), manually add:
    ```typescript
    await queryRunner.query(
        `ALTER TYPE "public"."automation_status_enum" ADD VALUE 'partial_error'`,
    );
    ```
    (Check actual enum name in DB, usually `automation_status_enum` or derived from column).

---

### Task 3: Update Observer Logic

**Files:**

- Modify: `libs/code-review/infrastructure/observers/code-review-pipeline.observer.ts`

**Step 1:**

- In `onStageFinish`, logic:
    ```typescript
    const status =
        partialErrors.length > 0
            ? AutomationStatus.PARTIAL_ERROR
            : AutomationStatus.SUCCESS;
    ```
- Pass this status to `logStage`.

**Verify:**
Tests.
