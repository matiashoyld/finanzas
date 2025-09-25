# 🏦 Personal Finance App - Development Plan

## Project Overview
A modern personal finance management application for you and your wife to track expenses, categorize transactions, and visualize spending patterns using AI-powered automation.

## Tech Stack

### Core Technologies
- **Framework:** T3 Stack (Next.js 14 App Router + TypeScript + tRPC + Tailwind CSS)
- **Database:** Neon PostgreSQL (Serverless, 3GB free tier)
- **ORM:** Prisma
- **Authentication:** Clerk (10,000 MAUs free)
- **UI Components:** shadcn/ui + Radix UI
- **AI:** Google Gemini Pro API
- **Hosting:** Vercel (free tier)
- **File Processing:** Papa Parse for CSV
- **Charts:** Recharts or Chart.js

## Phase 1: Project Setup & Authentication (Week 1)

### 1.1 Initialize T3 App
```bash
npm create t3-app@latest finanzas-hz
# Select:
# - TypeScript: Yes
# - App Router: Yes
# - tRPC: Yes
# - Prisma: Yes
# - Tailwind CSS: Yes
# - Authentication: None (we'll add Clerk manually)
```

### 1.2 Setup Neon Database
1. Create account at [neon.tech](https://neon.tech)
2. Create new project with PostgreSQL
3. Get connection string (with pooling enabled)
4. Configure environment variables:
```env
DATABASE_URL="postgresql://[user]:[password]@[host]/[database]?sslmode=require&pgbouncer=true"
DIRECT_URL="postgresql://[user]:[password]@[host]/[database]?sslmode=require"
```

### 1.3 Integrate Clerk Authentication
```bash
npm install @clerk/nextjs
```

Configure Clerk:
1. Create Clerk application at [clerk.com](https://clerk.com)
2. Add environment variables:
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
```

3. Implement email whitelist (programmatic approach since allowlist requires paid plan):
```typescript
// middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isProtectedRoute = createRouteMatcher(['/dashboard(.*)'])
const ALLOWED_EMAILS = ['your-email@gmail.com', 'wife-email@gmail.com']

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    const { userId, sessionClaims } = await auth()
    const email = sessionClaims?.email as string

    if (!ALLOWED_EMAILS.includes(email)) {
      // Redirect to unauthorized page
      return NextResponse.redirect(new URL('/unauthorized', req.url))
    }

    await auth.protect()
  }
})
```

### 1.4 Setup shadcn/ui
```bash
npx shadcn@latest init
# Select:
# - New York style
# - Default base color
# - CSS variables: Yes

# Add initial components
npx shadcn@latest add button card form input label select table tabs toast dialog sheet dropdown-menu chart
```

## Phase 2: Database Schema & Core Models (Week 1)

### 2.1 Prisma Schema
```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

model User {
  id              String          @id @default(cuid())
  clerkId         String          @unique
  email           String          @unique
  name            String?
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  transactions    Transaction[]
  categories      Category[]
  budgets         Budget[]
  savingsGoals    SavingsGoal[]
  recurringItems  RecurringItem[]
}

model Category {
  id              String          @id @default(cuid())
  name            String
  icon            String?
  color           String
  type            CategoryType    @default(EXPENSE)
  budgetLimit     Decimal?        @db.Decimal(10, 2)
  userId          String
  user            User            @relation(fields: [userId], references: [id])

  transactions    Transaction[]
  budgets         Budget[]

  @@unique([name, userId])
}

model Transaction {
  id              String          @id @default(cuid())
  amount          Decimal         @db.Decimal(10, 2)
  description     String
  date            DateTime
  categoryId      String
  category        Category        @relation(fields: [categoryId], references: [id])
  userId          String
  user            User            @relation(fields: [userId], references: [id])

  isRecurring     Boolean         @default(false)
  recurringId     String?
  recurring       RecurringItem?  @relation(fields: [recurringId], references: [id])

  aiCategorized   Boolean         @default(false)
  aiConfidence    Float?
  originalDesc    String?

  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  @@index([userId, date])
  @@index([categoryId])
}

model RecurringItem {
  id              String          @id @default(cuid())
  description     String
  amount          Decimal         @db.Decimal(10, 2)
  frequency       Frequency
  startDate       DateTime
  endDate         DateTime?
  nextDue         DateTime
  categoryId      String
  userId          String
  user            User            @relation(fields: [userId], references: [id])

  transactions    Transaction[]
}

model Budget {
  id              String          @id @default(cuid())
  categoryId      String
  category        Category        @relation(fields: [categoryId], references: [id])
  month           DateTime
  limit           Decimal         @db.Decimal(10, 2)
  spent           Decimal         @db.Decimal(10, 2) @default(0)
  userId          String
  user            User            @relation(fields: [userId], references: [id])

  @@unique([categoryId, month, userId])
}

model SavingsGoal {
  id              String          @id @default(cuid())
  name            String
  targetAmount    Decimal         @db.Decimal(10, 2)
  currentAmount   Decimal         @db.Decimal(10, 2) @default(0)
  deadline        DateTime?
  userId          String
  user            User            @relation(fields: [userId], references: [id])
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
}

enum CategoryType {
  INCOME
  EXPENSE
}

enum Frequency {
  DAILY
  WEEKLY
  BIWEEKLY
  MONTHLY
  QUARTERLY
  YEARLY
}
```

### 2.2 Database Migration
```bash
npx prisma migrate dev --name init
npx prisma generate
```

## Phase 3: Google Gemini AI Integration (Week 2)

### 3.1 Setup Gemini API
```bash
npm install @google/generative-ai
```

### 3.2 Transaction Categorization Service
```typescript
// app/lib/ai/gemini.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!);

export async function categorizeTransaction(description: string, categories: string[]) {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-001",
    generationConfig: {
      responseMimeType: "application/json"
    }
  });

  const prompt = `
    Categorize this financial transaction into one of the provided categories.

    Transaction: "${description}"

    Available categories: ${categories.join(", ")}

    Return JSON with:
    {
      "category": "selected category name",
      "confidence": 0.0-1.0,
      "reasoning": "brief explanation"
    }
  `;

  const result = await model.generateContent(prompt);
  return JSON.parse(result.response.text());
}

export async function batchCategorizeTransactions(
  transactions: { id: string; description: string }[],
  categories: string[]
) {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-001",
    generationConfig: {
      responseMimeType: "application/json"
    }
  });

  const prompt = `
    Categorize these financial transactions into the provided categories.

    Transactions:
    ${transactions.map(t => `- ID: ${t.id}, Description: "${t.description}"`).join("\n")}

    Available categories: ${categories.join(", ")}

    Return JSON array with objects:
    [{
      "id": "transaction id",
      "category": "selected category",
      "confidence": 0.0-1.0
    }]
  `;

  const result = await model.generateContent(prompt);
  return JSON.parse(result.response.text());
}
```

## Phase 4: Core Features Implementation (Week 2-3)

### 4.1 tRPC Routes
```typescript
// server/api/routers/transaction.ts
export const transactionRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({
      amount: z.number(),
      description: z.string(),
      date: z.date(),
      categoryId: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transaction.create({
        data: {
          ...input,
          userId: ctx.userId
        }
      });
    }),

  uploadCSV: protectedProcedure
    .input(z.object({
      transactions: z.array(z.object({
        date: z.string(),
        amount: z.number(),
        description: z.string()
      }))
    }))
    .mutation(async ({ ctx, input }) => {
      // Get user categories
      const categories = await ctx.db.category.findMany({
        where: { userId: ctx.userId }
      });

      // Categorize with AI
      const categorized = await batchCategorizeTransactions(
        input.transactions,
        categories.map(c => c.name)
      );

      // Bulk create transactions
      // ... implementation
    }),
});
```

### 4.2 CSV Upload Component
```typescript
// components/csv-upload.tsx
"use client";

import { useState } from 'react';
import Papa from 'papaparse';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function CSVUpload() {
  const [file, setFile] = useState<File | null>(null);

  const handleUpload = () => {
    if (!file) return;

    Papa.parse(file, {
      header: true,
      complete: async (results) => {
        // Process and upload transactions
        await uploadTransactions(results.data);
      }
    });
  };

  return (
    <div className="space-y-4">
      <Input
        type="file"
        accept=".csv"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />
      <Button onClick={handleUpload}>Upload & Categorize</Button>
    </div>
  );
}
```

### 4.3 Dashboard Components
- Transaction list with filters
- Category spending breakdown (pie chart)
- Monthly trend analysis (line chart)
- Budget progress bars
- Savings goal trackers

## Phase 5: Advanced Features (Week 3-4)

### 5.1 Recurring Transaction Detection
```typescript
// lib/recurring-detector.ts
export function detectRecurringPatterns(transactions: Transaction[]) {
  // Group by similar amounts and descriptions
  // Identify monthly/weekly patterns
  // Return potential recurring items
}
```

### 5.2 Budget Alerts
- Email notifications via Clerk
- Dashboard warnings when approaching limits
- Monthly summary emails

### 5.3 Reports & Export
- Monthly/yearly PDF reports
- CSV export with categories
- Tax category summaries

## Phase 6: Deployment & Optimization (Week 4)

### 6.1 Vercel Deployment
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### 6.2 Environment Variables (Vercel Dashboard)
- `DATABASE_URL`
- `DIRECT_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `GOOGLE_GEMINI_API_KEY`

### 6.3 Performance Optimization
- Implement React Query for caching
- Add loading states with Suspense
- Optimize database queries with indexes
- Implement pagination for transaction lists

## Security Considerations

### Authentication
- Email whitelist enforcement in middleware
- Session validation on all API routes
- Secure cookie configuration

### Database
- Row-level security via userId checks
- Parameterized queries (Prisma handles this)
- Connection pooling with Neon

### API Security
- Rate limiting on AI endpoints
- Input validation with Zod
- CORS configuration
- Environment variable protection

## Cost Analysis

### Free Tier Limits
- **Vercel:** 100GB bandwidth, unlimited deployments
- **Neon:** 3GB storage, 1 compute hour/day
- **Clerk:** 10,000 MAUs
- **Google Gemini:** Pay-per-use (~$0.024 per 1000 tokens)

### Estimated Monthly Costs
- With 2 users and moderate usage: **$0-5/month** (only Gemini API costs)

## Development Timeline

| Week | Focus | Deliverables |
|------|-------|-------------|
| 1 | Setup & Auth | Project initialized, auth working, database schema |
| 2 | Core Features | Transaction CRUD, CSV upload, AI categorization |
| 3 | Dashboard & Analytics | Charts, budgets, savings goals |
| 4 | Polish & Deploy | Testing, optimization, production deployment |

## Next Steps

1. **Initialize project** with T3 stack
2. **Setup Neon database** and run migrations
3. **Configure Clerk** with email restrictions
4. **Implement CSV upload** with AI categorization
5. **Build dashboard** with analytics
6. **Deploy to Vercel**

## Additional Resources

- [T3 Stack Documentation](https://create.t3.gg/)
- [Neon Documentation](https://neon.tech/docs)
- [Clerk Documentation](https://clerk.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [Google Gemini API](https://ai.google.dev/)
- [Vercel Deployment](https://vercel.com/docs)

## Common Commands

```bash
# Development
npm run dev

# Database
npx prisma studio     # Visual database editor
npx prisma migrate dev # Run migrations
npx prisma generate    # Generate client

# Build
npm run build
npm run start

# Type checking
npm run type-check

# Linting
npm run lint
```

---

This plan provides a comprehensive roadmap for building your personal finance app with modern technologies and best practices. The modular approach allows for incremental development while maintaining a clear path to a fully-featured application.