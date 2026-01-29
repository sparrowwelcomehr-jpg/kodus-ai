# Implement Stage Labels

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Provide user-friendly labels for pipeline stages (e.g., "Analyzing Files" instead of "ProcessFilesReviewStage") by adding a `label` property to stages and persisting it in metadata.

**Architecture:**

- `PipelineStage` interface gets `label`.
- Specific stages override `label`.
- Observer saves it to `metadata.label`.

**Tech Stack:** TypeScript.

---

### Task 1: Update Interface & Base

**Files:**

- Modify: `libs/core/infrastructure/pipeline/interfaces/pipeline.interface.ts`
- Modify: `libs/core/infrastructure/pipeline/abstracts/base-stage.abstract.ts`

**Steps:**

1.  Add `label?: string;` to interface.
2.  Add `label?: string;` to base class (undefined by default, or equal to stageName).

---

### Task 2: Define Labels for Business Stages

**Files:**

- Modify PRIMARY stages to add friendly labels:
    - `ValidateNewCommitsStage`: "Checking New Commits"
    - `ValidateConfigStage`: "Validating Configuration"
    - `LoadExternalContextStage`: "Loading Context"
    - `InitialCommentStage`: "Preparing Feedback"
    - `ProcessFilesReview`: "Analyzing Files"
    - `PRLevelReview`: "Reviewing Pull Request"
    - `CreatePrLevelComments`: "Drafting Comments"
    - `CreateFileComments`: "Posting File Comments"
    - `UpdateCommentsAndGenerateSummary`: "Generating Summary"
    - `RequestChangesOrApprove`: "Finalizing Review"

**Step 1:** Add `readonly label = '...';` to each class.

---

### Task 3: Update Observer

**Files:**

- Modify: `libs/core/infrastructure/pipeline/interfaces/pipeline-observer.interface.ts`
- Modify: `libs/core/infrastructure/pipeline/services/pipeline-executor.service.ts`
- Modify: `libs/code-review/infrastructure/observers/code-review-pipeline.observer.ts`

**Steps:**

1.  Update `onStageStart` signature in interface/executor to accept `label`.
    - _Correction:_ We already pass `stage.visibility`. Let's pass `stage` object or just add `label` argument?
    - _Better:_ Change signature to `onStageStart(stageName, context, options: { visibility, label })`.
    - _Or:_ Just add `label` as 4th arg.
    - _Executor:_ Pass `stage.label`.
2.  Update Observer: Save `label` into `metadata`.

**Verify:**
Compilation.
