# Overview Activity Clients DB Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the remaining mock-backed app reads for overview, activity, and clients with real Postgres-backed queries.

**Architecture:** Keep the current page-level server component pattern. Add focused query helpers in `src/lib/operator/db/queries.ts`, make reusable UI components prop-driven, and compute overview stat cards from SQL aggregations on `invoices` and `approval_items` rather than a separate metrics table.

**Tech Stack:** Next.js App Router, TypeScript, Drizzle ORM, Neon Postgres, Vitest

---

### Task 1: Add test coverage for view-model helpers

**Files:**
- Modify: `C:\Users\pmkma\Operator\.worktrees\codex-closed-alpha\tests\operator-db-view-models.test.ts`
- Modify: `C:\Users\pmkma\Operator\.worktrees\codex-closed-alpha\src\lib\operator\db\view-models.ts`

- [ ] **Step 1: Write failing tests for overview metric and activity formatting helpers**
- [ ] **Step 2: Run the targeted test and verify it fails**
- [ ] **Step 3: Implement the minimal helper updates**
- [ ] **Step 4: Run the targeted test and verify it passes**

### Task 2: Add DB queries for overview, activity, and clients

**Files:**
- Modify: `C:\Users\pmkma\Operator\.worktrees\codex-closed-alpha\src\lib\operator\db\queries.ts`

- [ ] **Step 1: Add query helpers for dashboard metrics, activity events, and clients**
- [ ] **Step 2: Ensure dashboard metrics use SQL aggregations from `invoices` and `approval_items`**
- [ ] **Step 3: Keep empty-state behavior explicit when tables are empty**

### Task 3: Convert reusable app components to prop-driven rendering

**Files:**
- Modify: `C:\Users\pmkma\Operator\.worktrees\codex-closed-alpha\src\components\app\activity-feed.tsx`

- [ ] **Step 1: Remove direct `mock-data` imports**
- [ ] **Step 2: Accept server-provided props with stable display formatting**
- [ ] **Step 3: Preserve current visual design and empty-state quality**

### Task 4: Replace the remaining mock-backed pages

**Files:**
- Modify: `C:\Users\pmkma\Operator\.worktrees\codex-closed-alpha\src\app\app\page.tsx`
- Modify: `C:\Users\pmkma\Operator\.worktrees\codex-closed-alpha\src\app\app\activity\page.tsx`
- Modify: `C:\Users\pmkma\Operator\.worktrees\codex-closed-alpha\src\app\app\clients\page.tsx`

- [ ] **Step 1: Fetch metrics, queue data, activity, and clients in the overview page with parallel awaits**
- [ ] **Step 2: Fetch activity rows in the activity page**
- [ ] **Step 3: Fetch client rows in the clients page**
- [ ] **Step 4: Remove mock-data dependencies from these pages**

### Task 5: Verify and checkpoint

**Files:**
- Modify: `C:\Users\pmkma\Operator\.worktrees\codex-closed-alpha\docs\superpowers\plans\2026-03-19-overview-activity-clients-db.md`

- [ ] **Step 1: Run `npm test`**
- [ ] **Step 2: Run `npm run lint`**
- [ ] **Step 3: Run `npm run build`**
- [ ] **Step 4: Commit with a focused conventional commit message**
