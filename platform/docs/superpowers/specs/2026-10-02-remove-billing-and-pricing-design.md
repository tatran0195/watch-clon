# Design Specification: Remove Billing and Pricing Related Usage

- **Date:** 2026-10-02
- **Topic:** Complete removal of billing, subscriptions, pricing tiers, Dodo payments, and Pulse usage across the platform and console.

---

## 1. Context & Motivation

The Wacht platform codebase historically integrated billing, subscriptions, and prepaid credit ("Pulse") functionality via Dodo Payments. In addition, several features (such as phone authentication, webhook limits, and project/deployment creation limits) were gated behind subscription plan checks or prepaid balance requirements.

The requirement is to **completely remove all billing and pricing related usage**. Rather than placing dummy `true` checks or stubbed wrappers, functions and components that exist solely for billing or plan restrictions must be deleted, and call sites simplified to execute unconditionally. Existing database tables and schema columns will remain untouched to avoid breaking data or requiring database migration downtime.

---

## 2. Frontend (`console`) Specification

### 2.1 File Deletions
The following files and components are strictly billing-related and will be deleted:
- `src/pages/billing/subscription.tsx`
- `src/pages/billing/usage.tsx`
- `src/pages/billing/success.tsx`
- `src/components/billing-setup-dialog.tsx`
- `src/components/pulse-topup-dialog.tsx`
- `src/lib/api/hooks/use-billing.ts`

### 2.2 Navigation & Routing
- **`src/router.tsx`**: Remove lazy imports of `BillingSubscriptionPage` and `BillingUsagePage`.
- **`src/components/nav-user.tsx`**: Remove the "Billing" dropdown menu item from the user profile dropdown.
- **`src/lib/tour/registry.ts`**: Remove `"open-billing-setup"` from `TourActionId`.

### 2.3 Layout & Pages
- **`src/components/application-layout.tsx`**:
  - Remove imports of `BillingSetupDialog`, `useBillingAccount`, and `ExclamationTriangleIcon` (where used for pending billing).
  - Remove `isBillingSetupDialogOpen` and `isPendingBillingDialogOpen` states and dialogs.
  - Remove `guardAction(action)` wrapper function; replace invocations with direct callback execution.
- **`src/pages/index.tsx`**:
  - Remove `useBillingAccount`, `BillingSetupDialog`, and `isBillingSetupDialogOpen`.
  - `handleCreateClick` directly invokes `setIsCreateProjectDialogOpen(true)`.
- **`src/pages/projects.tsx`**:
  - Remove `useBillingAccount`, `billingSetupDialogOpen`, `pendingBillingDialogOpen`, `BillingSetupDialog`, and the subscription incomplete dialog.
  - `handleCreateProject` directly invokes `setCreateProjectDialogOpen(true)`.

### 2.4 Unconditional Feature Availability (Phone Auth)
- **`src/components/create-project-dialog.tsx`**:
  - Remove `useBillingAccount` and `billingAccountHasFeature`.
  - Phone auth is rendered unconditionally as an available option in the authentication methods grid.
  - Remove prepaid recharge warning banner (`showPhonePrepaidWarning`).
- **`src/components/create-staging-deployment-dialog.tsx`**:
  - Remove `useBillingAccount` and `billingAccountHasFeature`.
  - Remove phone auth plan restriction effect and prepaid warning.
- **`src/components/create-production-deployment-dialog.tsx`**:
  - Remove `useBillingAccount` and `billingAccountHasFeature`.
  - Remove `if (!phoneAuthAvailable && selectedMethods.includes("phone"))` validation block.
- **`src/pages/auth/schema-factors.tsx`**:
  - Remove `useBillingAccount` and `billingAccountHasFeature`.
  - Remove `PHONE_AUTH_UNAVAILABLE_MESSAGE` and error toast blocking phone authentication.
  - Remove `phoneAuthAvailable` prop from factor dialogs and factor toggles.
  - Remove the "Requires Plan Upgrade" warning badges.

---

## 3. Backend (`platform`) Specification

### 3.1 Backend File Deletions
The following files and directories will be deleted:
- `platform/src/api/billing/` (directory: `account_handlers.rs`, `checkout_handlers.rs`, `usage_handlers.rs`, `types.rs`, `mod.rs`)
- `platform/src/api/billing_webhook/` (directory / module)
- `platform/src/application/billing.rs`
- `platform/src/application/billing_webhook.rs`
- `platform/src/middleware/require_feature.rs`
- `worker/src/tasks/billing.rs`
- `worker/src/jobs/billing_sync.rs`
- `worker/src/jobs/storage_sync.rs`
- `commands/src/billing/` (directory: `account_commands.rs`, `subscription_commands.rs`, `invoice_commands.rs`, `sync_commands.rs`, `mod.rs`)
- `commands/src/pulse.rs`
- `commands/src/sync_billing_metrics.rs`
- `commands/src/project/create_project_with_staging/owner_billing.rs`
- `queries/src/billing.rs`
- `queries/src/plan_access.rs`
- `queries/src/sms.rs`
- `models/src/billing.rs`
- `models/src/billing_invoice.rs`
- `models/src/pulse_transaction.rs`
- `models/src/plan_features.rs`
- `common/src/dodo.rs`

### 3.2 Routing & Middleware
- **`platform/src/application/router/server_routes.rs`**: Remove `billing_routes()`.
- **`platform/src/application/router/console_router.rs`**: Remove `.merge(super::billing_routes())`.
- **`platform/src/application/router.rs`**: Remove `/public/webhooks/dodo` from `public_webhook_routes()`.
- **`platform/src/application/mod.rs` & `platform/src/api/mod.rs`**: Remove `pub mod billing;` and `pub mod billing_webhook;`.
- **`platform/src/middleware/mod.rs`**: Remove `pub mod require_feature;` and its re-exports.

### 3.3 Worker & Async Pipelines
- **`worker/src/scheduler.rs`**: Remove the `billing_sync` (10-minute) and `storage_sync` (1-hour) background cron jobs.
- **`worker/src/jobs/mod.rs`**: Remove `pub mod billing_sync;` and `pub mod storage_sync;`.
- **`worker/src/tasks/mod.rs`**: Remove `pub mod billing;`.
- **`worker/src/consumer.rs`**: Remove the `billing.event` variant and handler.
- **`worker/src/tasks/webhook_event.rs` & `worker/src/tasks/email.rs`**: Remove `track_webhook_billing` and `track_email_billing` helper functions and all invocations.
- **`agent-engine/src/tools/internal/web.rs`**: Remove `charge_parallel_tool_usage` and all calls to deduct pulse credits during web search and URL content fetching.

### 3.4 Commands & Queries
- **`commands/src/lib.rs`**: Remove `pub mod billing;`, `pub mod pulse;`, `pub mod sync_billing_metrics;`.
- **`queries/src/lib.rs`**: Remove `pub mod billing;`, `pub mod plan_access;`, `pub mod sms;`.
- **`models/src/lib.rs`**: Remove `pub mod billing;`, `pub mod billing_invoice;`, `pub mod pulse_transaction;`, `pub mod plan_features;`.
- **`common/src/lib.rs`**: Remove `pub mod dodo;` and `pub use dodo::*;`.
- **`commands/src/project/support/foundation.rs`**: Remove `ensure_billing_status_active`, `product_has_feature`, `ensure_phone_auth_allowed`, and `MAX_PROJECTS_PER_BILLING_ACCOUNT`.
- **`commands/src/project/create_project_with_staging/mod.rs`**:
  - Remove `load_billing_account_for_owner`, `ensure_billing_status_active`, and `ensure_project_limit_not_reached`.
  - Pass `0` as the `billing_account_id` in `ProjectInsert`.
  - Omit billing parameters when delegating to `create_staging_deployment_for_project`.
- **`commands/src/project/create_staging_deployment/mod.rs`**:
  - Remove `ensure_billing_status_active`.
  - Look up the project name and metadata via a clean query without joining `billing_accounts` or `subscriptions`.
- **`commands/src/project/create_production_deployment/mod.rs`**:
  - Remove `ensure_billing_status_active` and `ensure_phone_auth_allowed`.
- **`commands/src/project/support/flows.rs`**:
  - In `create_staging_deployment_for_project`: remove `pulse_usage_disabled`, `product_id`, and `ensure_phone_auth_allowed`.
- **`commands/src/deployment/update_deployment_auth_settings.rs`**:
  - Remove `enables_phone_auth` check that verified plan tier and prepaid pulse balance.
- **`queries/src/project/guards.rs`**:
  - Remove `BillingAccountForOwnerLockQuery`, `BillingAccountForOwnerLockResult`, and `ProjectsCountByBillingAccountQuery`.
  - Replace `ProjectWithBillingForStagingQuery` and `ProjectForProductionQuery` with clean project queries that query only `projects` without joining `billing_accounts` or `subscriptions`.
- **`queries/src/deployment.rs`**: Remove `GetDeploymentChargebeeSubscriptionIdQuery`.

---

## 4. Verification & Validation Plan
1. **Compilation**:
   - Run `cargo check --workspace` in `platform` to ensure all crates compile with zero errors.
   - Run `pnpm build` in `console` to ensure TypeScript compilation and Vite bundling succeed with zero errors.
2. **Runtime Verification**:
   - Verify project creation, staging deployment creation, and production deployment creation flow freely without any billing checks or dialog popups.
   - Verify phone authentication factor can be toggled without requiring a plan upgrade.
