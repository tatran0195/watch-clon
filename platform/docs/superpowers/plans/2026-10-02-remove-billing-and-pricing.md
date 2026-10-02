# Remove Billing and Pricing Related Usage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Completely eliminate all billing, subscriptions, pricing tiers, Dodo payments, Pulse credit usage, and plan-based feature gating from both `console` and `platform`.

**Architecture:** Remove dead billing routes, handlers, cron jobs, middleware, and UI components; decouple project/deployment creation flows and auth factor controls so all features (including phone authentication) operate unconditionally without checks or wrapper guards. Existing database tables and schema columns are preserved.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS (Console) / Rust, Axum, SQLx, Tokio, NATS, Redis (Platform)

## Global Constraints

- Do not leave dummy `true` checks or stubbed wrappers for code that only existed for billing/pricing; remove the functions or call sites entirely.
- Do not run destructive database migrations dropping existing columns or tables.
- All code must compile cleanly: `pnpm build` in `console` and `cargo check --workspace` in `platform`.

---

### Task 1: Delete Dead Frontend Billing Pages, Components, and Route References

**Files:**
- Delete:
  - `console/src/pages/billing/subscription.tsx`
  - `console/src/pages/billing/usage.tsx`
  - `console/src/pages/billing/success.tsx`
  - `console/src/components/billing-setup-dialog.tsx`
  - `console/src/components/pulse-topup-dialog.tsx`
  - `console/src/lib/api/hooks/use-billing.ts`
- Modify:
  - `console/src/router.tsx`
  - `console/src/components/nav-user.tsx`
  - `console/src/lib/tour/registry.ts`

- [ ] **Step 1: Delete billing pages, dialogs, and hooks in `console`**
Delete the 6 files: `subscription.tsx`, `usage.tsx`, `success.tsx`, `billing-setup-dialog.tsx`, `pulse-topup-dialog.tsx`, `use-billing.ts`.

- [ ] **Step 2: Remove lazy imports from `console/src/router.tsx`**
Remove lazy imports for `BillingSubscriptionPage` and `BillingUsagePage` from `src/router.tsx`.

- [ ] **Step 3: Remove "Billing" item from `console/src/components/nav-user.tsx`**
Remove the `<DropdownMenuItem><IconCreditCard />Billing</DropdownMenuItem>` block and unused icon if applicable.

- [ ] **Step 4: Remove `"open-billing-setup"` from `console/src/lib/tour/registry.ts`**
Remove `"open-billing-setup"` from `TourActionId`.

- [ ] **Step 5: Commit changes**
`git add src/ && git commit -m "feat(console): remove dead billing pages, dialogs, and navigation"`

---

### Task 2: Remove Billing Account Gating and Dialogs from Layout and Projects Pages

**Files:**
- Modify:
  - `console/src/components/application-layout.tsx`
  - `console/src/pages/index.tsx`
  - `console/src/pages/projects.tsx`

- [ ] **Step 1: Clean up `console/src/components/application-layout.tsx`**
- Remove `BillingSetupDialog` import and rendering.
- Remove `useBillingAccount` hook call.
- Remove `isBillingSetupDialogOpen` and `isPendingBillingDialogOpen` state.
- Remove `guardAction` helper function; invoke actions directly instead of passing them to `guardAction`.
- Remove the pending billing dialog modal.

- [ ] **Step 2: Clean up `console/src/pages/index.tsx`**
- Remove `BillingSetupDialog` import and rendering.
- Remove `useBillingAccount` hook call and `isBillingSetupDialogOpen` state.
- In `handleCreateClick`, invoke `setIsCreateProjectDialogOpen(true)` directly without conditional checks.

- [ ] **Step 3: Clean up `console/src/pages/projects.tsx`**
- Remove `BillingSetupDialog` import and rendering.
- Remove `useBillingAccount` hook call.
- Remove `billingSetupDialogOpen` and `pendingBillingDialogOpen` state and the pending billing dialog.
- In `handleCreateProject`, invoke `setCreateProjectDialogOpen(true)` directly without conditional checks.

- [ ] **Step 4: Commit changes**
`git add src/ && git commit -m "feat(console): remove billing checks and dialogs from layout and project pages"`

---

### Task 3: Unconditionally Enable Phone Auth in Deployment & Auth Factor Dialogs

**Files:**
- Modify:
  - `console/src/components/create-project-dialog.tsx`
  - `console/src/components/create-staging-deployment-dialog.tsx`
  - `console/src/components/create-production-deployment-dialog.tsx`
  - `console/src/pages/auth/schema-factors.tsx`

- [ ] **Step 1: Clean up `console/src/components/create-project-dialog.tsx`**
- Remove `useBillingAccount` and `billingAccountHasFeature`.
- Remove `phoneAuthAvailable` state/computation and the `useEffect` that deselected phone auth.
- Render phone auth option unconditionally alongside email and username.
- Remove `showPhonePrepaidWarning` banner.

- [ ] **Step 2: Clean up `console/src/components/create-staging-deployment-dialog.tsx`**
- Remove `useBillingAccount` and `billingAccountHasFeature`.
- Remove `phoneAuthAvailable` and the deselecting `useEffect`.
- Remove `showPhonePrepaidWarning` banner.

- [ ] **Step 3: Clean up `console/src/components/create-production-deployment-dialog.tsx`**
- Remove `useBillingAccount` and `billingAccountHasFeature`.
- Remove `phoneAuthAvailable` and the validation error `if (!phoneAuthAvailable && selectedMethods.includes("phone"))`.

- [ ] **Step 4: Clean up `console/src/pages/auth/schema-factors.tsx`**
- Remove `useBillingAccount` and `billingAccountHasFeature`.
- Remove `PHONE_AUTH_UNAVAILABLE_MESSAGE` and the check blocking phone settings update.
- Remove `phoneAuthAvailable` prop from dialogs and factor toggles.
- Remove any "Requires Plan Upgrade" pill/tag badges.

- [ ] **Step 5: Verify `console` build**
Run `pnpm build` in `console` and ensure 0 TypeScript or Vite bundling errors.

- [ ] **Step 6: Commit changes**
`git add src/ && git commit -m "feat(console): enable phone auth unconditionally and remove factor plan gating"`

---

### Task 4: Delete Dead Backend Billing Modules, Commands, Queries, and Models

**Files:**
- Delete:
  - `platform/common/src/dodo.rs`
  - `platform/models/src/billing.rs`
  - `platform/models/src/billing_invoice.rs`
  - `platform/models/src/pulse_transaction.rs`
  - `platform/models/src/plan_features.rs`
  - `platform/queries/src/billing.rs`
  - `platform/queries/src/plan_access.rs`
  - `platform/queries/src/sms.rs`
  - `platform/commands/src/billing/` (all files: `account_commands.rs`, `subscription_commands.rs`, `invoice_commands.rs`, `sync_commands.rs`, `mod.rs`)
  - `platform/commands/src/pulse.rs`
  - `platform/commands/src/sync_billing_metrics.rs`
  - `platform/commands/src/project/create_project_with_staging/owner_billing.rs`
  - `platform/platform/src/api/billing/` (all files: `account_handlers.rs`, `checkout_handlers.rs`, `usage_handlers.rs`, `types.rs`, `mod.rs`)
  - `platform/platform/src/api/billing_webhook/` (all files: `mod.rs`)
  - `platform/platform/src/application/billing.rs`
  - `platform/platform/src/application/billing_webhook.rs`
  - `platform/platform/src/middleware/require_feature.rs`
  - `platform/worker/src/tasks/billing.rs`
  - `platform/worker/src/jobs/billing_sync.rs`
  - `platform/worker/src/jobs/storage_sync.rs`

- [ ] **Step 1: Delete all dead backend billing and pricing files**
Remove the listed files and directories across `common`, `models`, `queries`, `commands`, `platform`, and `worker`.

- [ ] **Step 2: Commit file deletions**
`git add -A && git commit -m "feat(platform): delete dead billing, dodo, pulse, and plan access modules"`

---

### Task 5: Clean Up Module Declarations, HTTP Routing, and Feature Gating Middleware

**Files:**
- Modify:
  - `platform/common/src/lib.rs`
  - `platform/models/src/lib.rs`
  - `platform/queries/src/lib.rs`
  - `platform/commands/src/lib.rs`
  - `platform/platform/src/application/mod.rs`
  - `platform/platform/src/api/mod.rs`
  - `platform/platform/src/middleware/mod.rs`
  - `platform/platform/src/application/router/server_routes.rs`
  - `platform/platform/src/application/router/console_router.rs`
  - `platform/platform/src/application/router.rs`

- [ ] **Step 1: Remove module exports from `common`, `models`, `queries`, `commands`**
- `common/src/lib.rs`: Remove `pub mod dodo;` and `pub use dodo::*;`.
- `models/src/lib.rs`: Remove `pub mod billing;`, `pub mod billing_invoice;`, `pub mod pulse_transaction;`, `pub mod plan_features;`.
- `queries/src/lib.rs`: Remove `pub mod billing;`, `pub mod plan_access;`, `pub mod sms;`.
- `commands/src/lib.rs`: Remove `pub mod billing;`, `pub mod pulse;`, `pub mod sync_billing_metrics;`.

- [ ] **Step 2: Remove module exports from `platform/src/application/mod.rs` & `platform/src/api/mod.rs`**
Remove `billing` and `billing_webhook` module declarations and re-exports.

- [ ] **Step 3: Remove `require_feature` from `platform/src/middleware/mod.rs`**
Remove `pub mod require_feature;` and `pub use require_feature::{check_feature_access, require_feature};`.

- [ ] **Step 4: Remove billing routes and webhooks from router**
- `server_routes.rs`: Remove `pub(super) fn billing_routes()`.
- `console_router.rs`: Remove `.merge(super::billing_routes())`.
- `router.rs`: Remove `/public/webhooks/dodo` route from `public_webhook_routes()`.

- [ ] **Step 5: Commit changes**
`git add common/ models/ queries/ commands/ platform/ && git commit -m "feat(platform): remove billing module exports, middleware, and router bindings"`

---

### Task 6: Remove Worker Scheduled Jobs, Consumer Events, and Tool Telemetry Billing

**Files:**
- Modify:
  - `platform/worker/src/scheduler.rs`
  - `platform/worker/src/jobs/mod.rs`
  - `platform/worker/src/tasks/mod.rs`
  - `platform/worker/src/consumer.rs`
  - `platform/worker/src/tasks/webhook_event.rs`
  - `platform/worker/src/tasks/email.rs`
  - `platform/agent-engine/src/tools/internal/web.rs`

- [ ] **Step 1: Clean up `platform/worker/src/scheduler.rs`**
Remove spawning of `jobs::billing_sync::sync_redis_to_postgres_and_dodo` and `jobs::storage_sync::sync_storage_to_dodo`.

- [ ] **Step 2: Clean up `platform/worker/src/jobs/mod.rs` & `tasks/mod.rs`**
Remove `pub mod billing_sync;`, `pub mod storage_sync;`, and `pub mod billing;`.

- [ ] **Step 3: Clean up `platform/worker/src/consumer.rs`**
Remove `billing.event` variant and processing match arm.

- [ ] **Step 4: Remove `track_webhook_billing` and `track_email_billing`**
- In `worker/src/tasks/webhook_event.rs`: Remove `track_webhook_billing` function and call site.
- In `worker/src/tasks/email.rs`: Remove `track_email_billing` function and all call sites.

- [ ] **Step 5: Clean up `platform/agent-engine/src/tools/internal/web.rs`**
Remove `charge_parallel_tool_usage` function and call sites on line 266 and line 342. Remove `DeductPulseCreditsCommand` import.

- [ ] **Step 6: Commit changes**
`git add worker/ agent-engine/ && git commit -m "feat(worker,agent-engine): remove billing sync cron, billing tracking, and pulse tool deduction"`

---

### Task 7: Decouple Project and Deployment Creation from Billing & Feature Gating

**Files:**
- Modify:
  - `platform/commands/src/project/support/foundation.rs`
  - `platform/commands/src/project/support/flows.rs`
  - `platform/commands/src/project/create_project_with_staging/mod.rs`
  - `platform/commands/src/project/create_staging_deployment/mod.rs`
  - `platform/commands/src/project/create_staging_deployment/project_lookup.rs`
  - `platform/commands/src/project/create_production_deployment/mod.rs`
  - `platform/commands/src/deployment/update_deployment_auth_settings.rs`
  - `platform/queries/src/project/guards.rs`
  - `platform/queries/src/deployment.rs`

- [ ] **Step 1: Clean up `platform/commands/src/project/support/foundation.rs`**
- Remove `MAX_PROJECTS_PER_BILLING_ACCOUNT`.
- Remove `product_has_feature`, `ensure_billing_status_active`, and `ensure_phone_auth_allowed`.
- Remove `models::plan_features::{PlanFeature, PlanTier}` import.

- [ ] **Step 2: Clean up `queries/src/project/guards.rs`**
- Remove `BillingAccountForOwnerLockResult`, `BillingAccountForOwnerLockQuery`, and `ProjectsCountByBillingAccountQuery`.
- Replace `ProjectWithBillingForStagingQuery` and `ProjectForProductionQuery` with a clean project lookup query that returns `ProjectRow { name: String }` by `project_id` without joining `billing_accounts` or `subscriptions`.

- [ ] **Step 3: Clean up `commands/src/project/support/flows.rs`**
- In `create_staging_deployment_for_project`: Remove parameters `pulse_usage_disabled`, `product_id`, and `max_staging_deployments_per_project`.
- Remove `ensure_phone_auth_allowed` call.
- Use `MAX_STAGING_DEPLOYMENTS_PER_PROJECT` directly for the limit check.

- [ ] **Step 4: Clean up `commands/src/project/create_project_with_staging/mod.rs`**
- Remove `mod owner_billing;` and its usage.
- Do not load billing account or enforce billing status or project limits.
- In `ProjectInsert.billing_account_id`: pass `0`.
- Call `create_staging_deployment_for_project` without billing parameters.

- [ ] **Step 5: Clean up `commands/src/project/create_staging_deployment/mod.rs` & `project_lookup.rs`**
- Remove `ensure_billing_status_active`.
- Call `create_staging_deployment_for_project` with `project.name` and auth methods.

- [ ] **Step 6: Clean up `commands/src/project/create_production_deployment/mod.rs`**
- Remove `ensure_billing_status_active` and `ensure_phone_auth_allowed`.

- [ ] **Step 7: Clean up `commands/src/deployment/update_deployment_auth_settings.rs`**
- Remove `enables_phone_auth` plan check and prepaid pulse balance validation block.
- Remove `PlanFeature` and `PlanTier` imports.

- [ ] **Step 8: Clean up `queries/src/deployment.rs`**
- Remove `GetDeploymentChargebeeSubscriptionIdQuery`.

- [ ] **Step 9: Verify `platform` workspace compilation**
Run `cargo check --workspace` in `platform` and verify all crates compile with zero errors.

- [ ] **Step 10: Commit changes**
`git add commands/ queries/ && git commit -m "feat(platform): decouple project and deployment creation from billing and plan checks"`

---

### Task 8: End-to-End Build and Verification Check

**Files:** None (all files in both repos)

- [ ] **Step 1: Verify `console` production build**
Run `pnpm build` in `d:\Workspace\Software\Cloned-Repos\watch\console` and ensure it exits with code 0.

- [ ] **Step 2: Verify `platform` workspace check**
Run `cargo check --workspace` in `d:\Workspace\Software\Cloned-Repos\watch\platform` and ensure it exits with code 0.

- [ ] **Step 3: Verification of search terms**
Run ripgrep for any lingering references to `use-billing`, `BillingSetupDialog`, `BillingUsagePage`, `BillingSubscriptionPage`, `GetDodoProductQuery`, `require_feature`, `pulse_balance_cents` in application logic.
