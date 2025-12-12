# Personal Finance Tracker: Features & Functionality Overview

This document summarizes all major features, backend and frontend functionalities, and key implementation details of the Personal Finance Tracker project.

---

## 1. Authentication & User Isolation
- **Multi-user support**: Each user has isolated data (transactions, investments, goals, salary, budget rules).
- **Auth token enforcement**: All API endpoints extract `userId` from the validated auth token (see `src/lib/auth-middleware.ts`).
- **User management scripts**: Add users via `scripts/add-user.ts`.

## 2. Categories & Standardization
- **Global categories**: Categories are shared across all users, managed via admin API (`src/app/api/admin/categories/route.ts`).
- **Standardized types**: Category and transaction types are unified (`income`, `expense`, `investment`, `transfer`).
- **Validation**: All transactions and categories validated via Zod schemas (`src/lib/schemas.ts`).

## 3. Transactions
- **CRUD operations**: Full API for creating, listing, updating, and deleting transactions (`src/app/api/transactions/route.ts`).
- **Bulk import/export**: Bulk transaction endpoints and XLSX export (`src/app/api/transactions/bulk/route.ts`, `src/app/api/export/xlsx/route.ts`).
- **Audit logging**: All transaction creations are logged in the audit log.

## 4. Investments & Net Worth
- **Investment plans**: Users can create, edit, duplicate, and compare investment plans (`src/app/api/investment-plans/route.ts`).
- **Net worth calculation**: Backend-driven, includes cash and investment value (`src/lib/financial-calculations.ts`).
- **Net worth timeline**: API and dashboard chart for monthly net worth (`src/app/api/dashboard/net-worth-timeline/route.ts`, dashboard page).

## 5. Goals
- **Goal management**: Create, edit, and track financial goals (`src/app/api/goals/route.ts`).
- **Backend-driven progress**: Goal progress is calculated on the backend and returned with each goal.

## 6. Recurring Transactions & Salary
- **Recurring automation**: Recurring transactions and salary credits are processed automatically via backend script (`scripts/processRecurringAndSalary.ts`).
- **Salary management**: Users can set/update salary; salary is credited automatically each month (`src/app/api/salary/route.ts`).
- **Audit logging**: All recurring and salary events are logged.

## 7. Budget Rules & Analytics
- **Budget rule management**: Each user has a budget rule (default 50-30-20, editable).
- **Monthly analytics**: API for monthly summary (income, expense, savings, category breakdown, budget allocation) (`src/app/api/analytics/monthly-summary/route.ts`).
- **Dashboard**: Frontend dashboard displays all analytics, summary, and trends.

## 8. Audit Log
- **Model**: All financial events (transaction, salary, recurring) are logged (`prisma/schema.prisma`, `AuditLog`).
- **Automated and user-initiated events**: Both are tracked for transparency.

## 9. Admin & Category Management
- **Admin API**: Manage categories and enforce type consistency (`src/app/api/admin/categories/route.ts`).
- **Validation**: Category usage in transactions is validated.

## 10. Frontend Features
- **Dashboard**: Bank balance, net worth, net worth timeline, analytics, salary trend, recent transactions.
- **Investment plans**: List, compare, projections, and edit.
- **Goals**: List, create, edit, and progress tracking.
- **Transactions**: List, add, edit, and bulk import/export.
- **Recurring transactions**: List and manage.
- **Settings**: Salary, budget rule, and profile management.

## 11. Utilities & Scripts
- **Database seeding**: `prisma/seed.ts` for initial data.
- **Database cleaning**: `scripts/clean-db.ts` to reset all user data.
- **Verification scripts**: `verify-db.ts`, `verify-categories.ts` for integrity checks.

---

For detailed API and file references, see the codebase structure and each referenced file.
