import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

// Import default categories type definition
export const defaultCategories = [
  // Housing (6)
  { name: 'Rent/Mortgage', type: 'EXPENSE' as const, color: '#6366f1', icon: '🏠' },
  { name: 'Utilities', type: 'EXPENSE' as const, color: '#f59e0b', icon: '💡' },
  { name: 'Internet & Phone', type: 'EXPENSE' as const, color: '#3b82f6', icon: '📱' },
  { name: 'Home Insurance', type: 'EXPENSE' as const, color: '#6d28d9', icon: '🛡️' },
  { name: 'Home Maintenance', type: 'EXPENSE' as const, color: '#f43f5e', icon: '🔧' },
  { name: 'Property Tax', type: 'EXPENSE' as const, color: '#4f46e5', icon: '🏛️' },
  // Transportation (5)
  { name: 'Car Payment', type: 'EXPENSE' as const, color: '#dc2626', icon: '🚗' },
  { name: 'Gas/Fuel', type: 'EXPENSE' as const, color: '#f87171', icon: '⛽' },
  { name: 'Car Insurance', type: 'EXPENSE' as const, color: '#ef4444', icon: '📋' },
  { name: 'Public Transit', type: 'EXPENSE' as const, color: '#10b981', icon: '🚇' },
  { name: 'Car Maintenance', type: 'EXPENSE' as const, color: '#fb923c', icon: '🔩' },
  // Food (4)
  { name: 'Groceries', type: 'EXPENSE' as const, color: '#10b981', icon: '🛒' },
  { name: 'Restaurants', type: 'EXPENSE' as const, color: '#14b8a6', icon: '🍽️' },
  { name: 'Coffee & Snacks', type: 'EXPENSE' as const, color: '#06b6d4', icon: '☕' },
  { name: 'Food Delivery', type: 'EXPENSE' as const, color: '#0891b2', icon: '🚚' },
  // Healthcare (4)
  { name: 'Health Insurance', type: 'EXPENSE' as const, color: '#ef4444', icon: '🏥' },
  { name: 'Medical & Dental', type: 'EXPENSE' as const, color: '#dc2626', icon: '👨‍⚕️' },
  { name: 'Pharmacy', type: 'EXPENSE' as const, color: '#b91c1c', icon: '💊' },
  { name: 'Fitness & Wellness', type: 'EXPENSE' as const, color: '#fca5a5', icon: '💪' },
  // Personal (4)
  { name: 'Clothing', type: 'EXPENSE' as const, color: '#f97316', icon: '👕' },
  { name: 'Personal Care', type: 'EXPENSE' as const, color: '#a855f7', icon: '💅' },
  { name: 'Household Items', type: 'EXPENSE' as const, color: '#fb923c', icon: '🧺' },
  { name: 'Gifts', type: 'EXPENSE' as const, color: '#c026d3', icon: '🎁' },
  // Entertainment (3)
  { name: 'Entertainment', type: 'EXPENSE' as const, color: '#ec4899', icon: '🎬' },
  { name: 'Subscriptions', type: 'EXPENSE' as const, color: '#8b5cf6', icon: '📺' },
  { name: 'Hobbies', type: 'EXPENSE' as const, color: '#9f1239', icon: '🎨' },
  // Financial (4)
  { name: 'Loan Payments', type: 'EXPENSE' as const, color: '#991b1b', icon: '💰' },
  { name: 'Credit Card Payment', type: 'EXPENSE' as const, color: '#7f1d1d', icon: '💳' },
  { name: 'Savings Transfer', type: 'EXPENSE' as const, color: '#059669', icon: '🏦' },
  { name: 'Investments', type: 'EXPENSE' as const, color: '#0891b2', icon: '📈' },
  // Income (8)
  { name: 'Salary', type: 'INCOME' as const, color: '#10b981', icon: '💰' },
  { name: 'Freelance/Contract', type: 'INCOME' as const, color: '#3b82f6', icon: '💼' },
  { name: 'Business Income', type: 'INCOME' as const, color: '#8b5cf6', icon: '🏢' },
  { name: 'Investment Returns', type: 'INCOME' as const, color: '#f59e0b', icon: '📈' },
  { name: 'Rental Income', type: 'INCOME' as const, color: '#f97316', icon: '🏠' },
  { name: 'Tax Refund', type: 'INCOME' as const, color: '#6366f1', icon: '📋' },
  { name: 'Gifts Received', type: 'INCOME' as const, color: '#ec4899', icon: '🎁' },
  { name: 'Other Income', type: 'INCOME' as const, color: '#64748b', icon: '💵' },
  // Miscellaneous
  { name: 'Miscellaneous', type: 'EXPENSE' as const, color: '#64748b', icon: '📦' },
]

export async function getCurrentUser() {
  const { userId } = await auth()
  if (!userId) return null

  const user = await prisma.user.findUnique({
    where: { clerkId: userId }
  })

  return user
}

export async function ensureUserExists() {
  const { userId, sessionClaims } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const email = sessionClaims?.email as string

  let user = await prisma.user.findUnique({
    where: { clerkId: userId }
  })

  if (!user) {
    user = await prisma.user.create({
      data: {
        clerkId: userId,
        email,
        name: sessionClaims?.name as string || email.split('@')[0]
      }
    })

    // Create default categories for new user
    await createDefaultCategories(user.id)
  }

  return user
}

async function createDefaultCategories(userId: string) {
  const categoriesToCreate = defaultCategories.map(cat => ({
    ...cat,
    userId
  }))

  await prisma.category.createMany({
    data: categoriesToCreate,
    skipDuplicates: true
  })

  console.log(`Created ${categoriesToCreate.length} default categories for user ${userId}`)
}

// Helper to calculate spending by category for a month
export async function getMonthlySpendingByCategory(
  userId: string,
  month: Date
) {
  const startDate = new Date(month.getFullYear(), month.getMonth(), 1)
  const endDate = new Date(month.getFullYear(), month.getMonth() + 1, 0)

  const spending = await prisma.transaction.groupBy({
    by: ['categoryId'],
    where: {
      userId,
      date: {
        gte: startDate,
        lte: endDate
      }
    },
    _sum: {
      amount: true
    }
  })

  return spending
}