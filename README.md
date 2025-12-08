This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Personal Finance Tracker

A comprehensive finance tracking application with multi-user support, investment planning, goal tracking, and budget management.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up your environment variables in `.env`:
```bash
DATABASE_URL=your_mongodb_connection_string
```

3. Push the database schema:
```bash
npx prisma db push
```

4. Seed the database with default data:
```bash
npx tsx prisma/seed.ts
```

This will create a default user:
- **Username**: `default_user`
- **Password**: `password`

## User Management

### Adding New Users

To add a new user with their own credentials:

```bash
npx tsx scripts/add-user.ts
```

You'll be prompted to enter:
- Username
- Password

Each user gets their own isolated data including:
- Transactions
- Investment Plans
- Goals
- Salaries
- Budget Rules (initialized with 50-30-20 rule)

**Note**: Categories are global and shared across all users.

### Cleaning Database

To reset the database and remove all user data:

```bash
npx tsx scripts/clean-db.ts
```

Then reseed:
```bash
npx tsx prisma/seed.ts
```

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
