# AI Assistant Context - Finanzas HZ Project

## Project Overview

Personal finance management app for a married couple to track expenses, categorize transactions, and visualize spending patterns using AI-powered automation. Only 2 users (husband and wife) will have access.

## Tech Stack (IMPORTANT - DO NOT CHANGE)

- **Framework:** T3 Stack (Next.js 14 App Router + TypeScript + tRPC + Tailwind CSS)
- **Database:** Neon PostgreSQL (serverless, connection pooling enabled)
- **ORM:** Prisma
- **Auth:** Clerk (email whitelist via middleware - free tier workaround)
- **UI:** shadcn/ui + Radix UI
- **AI:** Google Gemini Pro API (gemini-2.0-flash-001 model)
- **Hosting:** Vercel
- **Charts:** Recharts or Chart.js
- **CSV:** Papa Parse

## Critical Environment Variables

```env
# Neon Database
DATABASE_URL="postgresql://[user]:[password]@[host]/[database]?sslmode=require&pgbouncer=true"
DIRECT_URL="postgresql://[user]:[password]@[host]/[database]?sslmode=require"

# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Google Gemini
GOOGLE_GEMINI_API_KEY=...
```

## Email Whitelist Implementation

Since Clerk's allowlist feature requires a paid plan, implement email restriction in middleware:

```typescript
const ALLOWED_EMAILS = ['matiashoyl@gmail.com', 'mzabalabarros@gmail.com']
```

## Project Structure

```
/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   └── trpc/          # tRPC endpoints
│   ├── (auth)/            # Auth pages (sign-in, sign-up)
│   ├── dashboard/         # Main app pages
│   └── lib/               # Utilities
│       └── ai/            # Gemini integration
├── components/            # React components
│   └── ui/               # shadcn/ui components
├── server/               # Server-side code
│   └── api/              # tRPC routers
├── prisma/               # Database schema
└── public/               # Static assets
```

## Database Schema Summary

**Main Tables:**

- `User` - Linked to Clerk ID
- `Transaction` - Financial records with AI categorization
- `Category` - Income/Expense categories with budget limits
- `Budget` - Monthly budget tracking
- `SavingsGoal` - Financial goals
- `RecurringItem` - Recurring transactions

**Key Relations:**

- All tables linked to User via userId
- Transactions belong to Categories
- Budgets track Categories by month

## Core Features Priority

1. **Authentication** - Email-restricted access
2. **Transaction Management** - CRUD operations
3. **CSV Upload** - Bulk import with AI categorization
4. **Dashboard** - Spending visualization
5. **Budgets** - Monthly limits and tracking
6. **Reports** - Export and analysis

## AI Integration Pattern

Use Google Gemini for transaction categorization:

```typescript
// Always use JSON response format
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-pro",
  generationConfig: {
    responseMimeType: "application/json"
  }
});
```

## Security Requirements

1. **Always validate userId** in all database queries
2. **Email whitelist** enforcement in middleware
3. **Rate limit** AI API calls
4. **Input validation** with Zod schemas
5. **Never expose** API keys to client

## Common Commands

```bash
# Development
npm run dev

# Database
npx prisma migrate dev
npx prisma generate
npx prisma studio

# Add shadcn component
npx shadcn@latest add [component-name]

# Type checking
npm run type-check
```

## Known Constraints

- **Neon:** Free tier has 3GB storage, cold starts (500ms-3s)
- **Clerk:** 10,000 MAUs limit (sufficient for 2 users)
- **Gemini:** Pay-per-use, ~$0.024 per 1000 tokens
- **Vercel:** 100GB bandwidth free tier

## Testing Approach

- Use 2 test email accounts matching ALLOWED_EMAILS
- Test CSV upload with sample bank statements
- Verify AI categorization accuracy
- Check budget calculations

## DO NOT

- Change the tech stack without explicit user approval
- Implement features beyond the planned scope
- Add unnecessary dependencies
- Create admin panels (only 2 users)
- Use Clerk's paid features (allowlist, etc.)

## References

- [Full Plan](/plan.md)
- [Milestones](/milestones.md)
- [Prisma Schema](/prisma/schema.prisma)
