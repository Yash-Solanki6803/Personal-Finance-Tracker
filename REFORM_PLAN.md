# Personal Finance Tracker: Refactor & Feature Implementation Plan

## Overview
This document outlines all required changes, refactors, and new features to resolve ambiguities, improve consistency, and enhance the Personal Finance Tracker. Each item includes a summary and implementation approach.

---

## 1. User Data Isolation via Auth Token
- **Change:** All backend queries must filter by `userId` derived from the auth token, not from query params or frontend input.
- **Implementation:**
  - Ensure every API endpoint extracts `userId` from the validated auth token.
  - Remove any direct userId query param usage.
  - Update middleware and utility functions to enforce this.

## 2. Standardize Category and Transaction Types
- **Change:** Unify category and transaction types (e.g., only use `income`, `expense`, `investment`, `transfer`).
- **Implementation:**
  - Update `Category` and `Transaction` models and seed data.
  - Refactor frontend and backend logic to use standardized types.
  - Migrate existing data if needed.

## 3. Move Goal Progress Calculation to Backend
- **Change:** Goal progress should be calculated server-side, based on actual transactions and investments.
- **Implementation:**
  - Create backend utility/service for goal progress calculation.
  - Update API endpoints to return progress as part of goal data.
  - Remove frontend calculation logic.

## 4. Track Recurring Transactions and All Financial Events
- **Change:** Implement robust tracking for recurring transactions and all automated financial events.
- **Implementation:**
  - Add a tracking table/model for processed recurring transactions (date, type, status).
  - Ensure recurring transactions are processed only once per period.
  - Add audit logging for all automated financial events.

## 5. Salary as Source of Income Transactions
- **Change:** Salary updates should create future recurring income transactions. Only the latest salary is used for new transactions.
- **Implementation:**
  - On salary update, schedule future salary transactions (monthly, on the set date).
  - Past transactions remain unchanged.
  - Automate transaction creation via backend job (cron/scheduled task).

## 6. Investment Handling and Net Worth Calculation
- **Change:** Investments are debited from bank balance only when initiated from frontend. Investments are included in net worth.
- **Implementation:**
  - Create investment transactions only on user action.
  - Backend calculates net worth by summing bank balance and investment value.

## 7. Consistent Date Handling
- **Change:** Use JavaScript `Date` objects for all date fields in models, APIs, and frontend.
- **Implementation:**
  - Refactor models, API payloads, and frontend to use `Date` objects.
  - Update validation and serialization logic.

---

## Additional Improvements & Features

### A. Bank Balance & Net Worth on Dashboard
- **Change:** Show calculated bank balance and net worth on dashboard, using backend logic.
- **Implementation:**
  - Add API endpoint for summary data.
  - Refactor dashboard to consume backend summary.

### B. Backend-Driven Financial Calculations
- **Change:** Move all financial calculations (cash flow, goal progress, analytics) to backend.
- **Implementation:**
  - Create backend services/utilities for calculations.
  - Update frontend to use backend-calculated values.

### C. Standardized Category Management
- **Change:** Centralize category management and enforce type consistency.
- **Implementation:**
  - Add admin interface or API for category management.
  - Validate category usage in transactions.

### D. Audit Log for Financial Events
- **Change:** Track all changes and automated events for transparency.
- **Implementation:**
  - Add audit log model/table.
  - Log all automated and user-initiated financial events.

### E. Recurring Transaction Automation
- **Change:** Automate processing of recurring transactions and salary credits.
- **Implementation:**
  - Implement backend cron job or scheduled function.
  - Ensure idempotency and proper tracking.

### F. Date Standardization
- **Change:** Enforce consistent date handling across all layers.
- **Implementation:**
  - Use ISO date strings or Date objects everywhere.
  - Update validation and conversion logic.


---

## Summary
This plan addresses all current ambiguities, ensures consistency, and introduces new features for a robust personal finance tracker. Each change should be implemented with proper testing and migration support.
