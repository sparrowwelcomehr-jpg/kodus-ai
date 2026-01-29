# Fix Visibility Persistence

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Ensure `visibility` (primary/secondary) is preserved in the stage log metadata when updating the status to Success/Error/Skipped.

**Strategy:** Pass `visibility` from Executor to Observer in ALL lifecycle events, not just Start.

**Tech Stack:** TypeScript.

---

### Task 1: Update Observer Interface

**Files:**

- Modify: `libs/core/infrastructure/pipeline/interfaces/pipeline-observer.interface.ts`

**Steps:**

1.  Update `onStageFinish`, `onStageError`, `onStageSkipped`.
2.  Add `visibility?: StageVisibility` as the last argument to all of them.

---

### Task 2: Update Executor

**Files:**

- Modify: `libs/core/infrastructure/pipeline/services/pipeline-executor.service.ts`

**Steps:**

1.  In `execute`:
    - Call `notifyObservers('onStageFinish', ..., stage.visibility)`.
    - Call `notifyObservers('onStageError', ..., stage.visibility)`.
    - Call `notifyObservers('onStageSkipped', ..., stage.visibility)` (inside `handleSkipOrJump`).

---

### Task 3: Update CodeReviewPipelineObserver

**Files:**

- Modify: `libs/code-review/infrastructure/observers/code-review-pipeline.observer.ts`

**Steps:**

1.  Update method signatures to accept `visibility`.
2.  Pass `visibility` to `logStage`.
3.  In `logStage`: Ensure `metadata` object being constructed includes `{ visibility }` if provided.

**Verify:**
Compilation.
