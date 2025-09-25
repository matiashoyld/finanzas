import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const defaultCategories = [
  // ========== ESSENTIAL EXPENSE CATEGORIES (30) ==========

  // Housing (6)
  { name: 'Rent/Mortgage', type: 'EXPENSE', color: '#6366f1', icon: '🏠' },
  { name: 'Utilities', type: 'EXPENSE', color: '#f59e0b', icon: '💡' },
  { name: 'Internet & Phone', type: 'EXPENSE', color: '#3b82f6', icon: '📱' },
  { name: 'Home Insurance', type: 'EXPENSE', color: '#6d28d9', icon: '🛡️' },
  { name: 'Home Maintenance', type: 'EXPENSE', color: '#f43f5e', icon: '🔧' },
  { name: 'Property Tax', type: 'EXPENSE', color: '#4f46e5', icon: '🏛️' },

  // Transportation (5)
  { name: 'Car Payment', type: 'EXPENSE', color: '#dc2626', icon: '🚗' },
  { name: 'Gas/Fuel', type: 'EXPENSE', color: '#f87171', icon: '⛽' },
  { name: 'Car Insurance', type: 'EXPENSE', color: '#ef4444', icon: '📋' },
  { name: 'Public Transit', type: 'EXPENSE', color: '#10b981', icon: '🚇' },
  { name: 'Car Maintenance', type: 'EXPENSE', color: '#fb923c', icon: '🔩' },

  // Food (4)
  { name: 'Groceries', type: 'EXPENSE', color: '#10b981', icon: '🛒' },
  { name: 'Restaurants', type: 'EXPENSE', color: '#14b8a6', icon: '🍽️' },
  { name: 'Coffee & Snacks', type: 'EXPENSE', color: '#06b6d4', icon: '☕' },
  { name: 'Food Delivery', type: 'EXPENSE', color: '#0891b2', icon: '🚚' },

  // Healthcare (4)
  { name: 'Health Insurance', type: 'EXPENSE', color: '#ef4444', icon: '🏥' },
  { name: 'Medical & Dental', type: 'EXPENSE', color: '#dc2626', icon: '👨‍⚕️' },
  { name: 'Pharmacy', type: 'EXPENSE', color: '#b91c1c', icon: '💊' },
  { name: 'Fitness & Wellness', type: 'EXPENSE', color: '#fca5a5', icon: '💪' },

  // Personal (4)
  { name: 'Clothing', type: 'EXPENSE', color: '#f97316', icon: '👕' },
  { name: 'Personal Care', type: 'EXPENSE', color: '#a855f7', icon: '💅' },
  { name: 'Household Items', type: 'EXPENSE', color: '#fb923c', icon: '🧺' },
  { name: 'Gifts', type: 'EXPENSE', color: '#c026d3', icon: '🎁' },

  // Entertainment (3)
  { name: 'Entertainment', type: 'EXPENSE', color: '#ec4899', icon: '🎬' },
  { name: 'Subscriptions', type: 'EXPENSE', color: '#8b5cf6', icon: '📺' },
  { name: 'Hobbies', type: 'EXPENSE', color: '#9f1239', icon: '🎨' },

  // Financial (4)
  { name: 'Loan Payments', type: 'EXPENSE', color: '#991b1b', icon: '💰' },
  { name: 'Credit Card Payment', type: 'EXPENSE', color: '#7f1d1d', icon: '💳' },
  { name: 'Savings Transfer', type: 'EXPENSE', color: '#059669', icon: '🏦' },
  { name: 'Investments', type: 'EXPENSE', color: '#0891b2', icon: '📈' },

  // ========== INCOME CATEGORIES (8) ==========

  { name: 'Salary', type: 'INCOME', color: '#10b981', icon: '💰' },
  { name: 'Freelance/Contract', type: 'INCOME', color: '#3b82f6', icon: '💼' },
  { name: 'Business Income', type: 'INCOME', color: '#8b5cf6', icon: '🏢' },
  { name: 'Investment Returns', type: 'INCOME', color: '#f59e0b', icon: '📈' },
  { name: 'Rental Income', type: 'INCOME', color: '#f97316', icon: '🏠' },
  { name: 'Tax Refund', type: 'INCOME', color: '#6366f1', icon: '📋' },
  { name: 'Gifts Received', type: 'INCOME', color: '#ec4899', icon: '🎁' },
  { name: 'Other Income', type: 'INCOME', color: '#64748b', icon: '💵' },

  // ========== CATCH-ALL ==========
  { name: 'Miscellaneous', type: 'EXPENSE', color: '#64748b', icon: '📦' },
]

async function main() {
  console.log('🌱 Seeding database...')

  // This seed script will be run after user creation
  // Categories will be created per user in the application

  console.log('✅ Default categories prepared')
  console.log(`Total categories: ${defaultCategories.length}`)
  console.log(`- Essential expense categories: 30`)
  console.log(`- Income categories: 8`)
  console.log(`- Miscellaneous: 1`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

