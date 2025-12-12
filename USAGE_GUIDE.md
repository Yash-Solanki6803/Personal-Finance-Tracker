# Personal Finance Tracker: Full Usage Guide

This guide explains how to operate the Personal Finance Tracker project to its full potential, from setup to advanced features.

---

## 1. Setup & Installation

1. **Clone the repository** and install dependencies:
   ```bash
   npm install
   ```
2. **Configure environment variables** in `.env`:
   ```env
   DATABASE_URL=your_mongodb_connection_string
   ```
3. **Push the database schema:**
   ```bash
   npx prisma db push
   ```
4. **Seed the database with default data:**
   ```bash
   npx tsx prisma/seed.ts
   ```
5. **Start the development server:**
   ```bash
   npm run dev
   # or yarn dev / pnpm dev / bun dev
   ```
6. **Open** [http://localhost:3000](http://localhost:3000) in your browser.

---

## 2. User Onboarding & Management

- **Default user:** After seeding, login with:
  - Username: `default_user`
  - Password: `password`
- **Add new users:**
  ```bash
  npx tsx scripts/add-user.ts
  ```
  Each user gets isolated data (transactions, investments, goals, salary, budget).

---

## 3. Daily Usage Flow

### a. **Dashboard**
- View bank balance, net worth, net worth timeline, analytics, salary trend, and recent transactions.

### b. **Transactions**
- Add, edit, and view all transactions.
- Bulk import/export transactions (XLSX).

### c. **Investment Plans**
- Create, edit, duplicate, compare, and project investment plans.
- See impact on net worth timeline.

### d. **Goals**
- Set financial goals, track backend-driven progress.

### e. **Recurring Transactions & Salary**
- Set up recurring transactions (e.g., bills, subscriptions).
- Set/update salary; salary is credited automatically each month.

### f. **Budget & Analytics**
- View monthly summary (income, expense, savings, category breakdown, budget allocation).
- Adjust budget rule (default 50-30-20).

---

## 4. Admin & Advanced Features

- **Category management:**
  - Use admin API to add/edit categories and enforce type consistency.
- **Audit log:**
  - All financial events (transactions, salary, recurring) are logged for transparency.
- **Database cleaning:**
  - Reset all user data:
    ```bash
    npx tsx scripts/clean-db.ts
    npx tsx prisma/seed.ts
    ```
- **Verification scripts:**
  - Run `verify-db.ts` and `verify-categories.ts` for integrity checks.

---

## 5. Best Practices & Tips

- **Always use the dashboard and analytics for financial decisions.**
- **Keep categories organized** for accurate analytics.
- **Review audit logs** for transparency and troubleshooting.
- **Automate recurring and salary transactions** for hands-free tracking.
- **Regularly update salary and budget rules** as your finances change.

---

For more details, see `FEATURES_OVERVIEW.md` and the codebase documentation.
