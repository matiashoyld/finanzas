import { Prisma } from '@prisma/client'

export type TransactionWithCategory = Prisma.TransactionGetPayload<{
  include: { category: true }
}>

export type CategoryWithTransactions = Prisma.CategoryGetPayload<{
  include: { transactions: true }
}>

export type BudgetWithCategory = Prisma.BudgetGetPayload<{
  include: { category: true }
}>

export type UserWithRelations = Prisma.UserGetPayload<{
  include: {
    transactions: true
    categories: true
    budgets: true
    savingsGoals: true
  }
}>

export type TransactionWithRecurring = Prisma.TransactionGetPayload<{
  include: {
    category: true,
    recurring: true
  }
}>

export type MonthlySpending = {
  categoryId: string
  categoryName: string
  amount: number
  budget?: number
  percentOfBudget?: number
}