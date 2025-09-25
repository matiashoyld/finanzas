import { z } from "zod"
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc"
import { ensureUserExists } from "@/lib/db/utils"
import { TRPCError } from "@trpc/server"
import { startOfMonth, endOfMonth } from "date-fns"
import type { PrismaClient } from "@prisma/client"

const transactionInput = z.object({
  amount: z.number(),
  description: z.string().min(1).max(200),
  date: z.date(),
  categoryId: z.string(),
  isRecurring: z.boolean().optional(),
})

export const transactionRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(50),
      cursor: z.string().nullish(),
      categoryId: z.string().optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const user = await ensureUserExists()

      const { limit, cursor, categoryId, startDate, endDate } = input

      const transactions = await ctx.db.transaction.findMany({
        where: {
          userId: user.id,
          ...(categoryId && { categoryId }),
          ...(startDate && endDate && {
            date: {
              gte: startDate,
              lte: endDate,
            }
          }),
        },
        include: {
          category: true,
        },
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { date: 'desc' },
      })

      let nextCursor: typeof cursor
      if (transactions.length > limit) {
        const nextItem = transactions.pop()
        nextCursor = nextItem!.id
      }

      return {
        transactions,
        nextCursor,
      }
    }),

  getMonthly: protectedProcedure
    .input(z.object({
      year: z.number(),
      month: z.number().min(0).max(11), // 0-indexed
    }))
    .query(async ({ ctx, input }) => {
      const user = await ensureUserExists()

      const startDate = startOfMonth(new Date(input.year, input.month))
      const endDate = endOfMonth(new Date(input.year, input.month))

      const transactions = await ctx.db.transaction.findMany({
        where: {
          userId: user.id,
          date: {
            gte: startDate,
            lte: endDate,
          }
        },
        include: {
          category: true,
        },
        orderBy: { date: 'desc' },
      })

      // Calculate totals
      const income = transactions
        .filter(t => t.category.type === 'INCOME')
        .reduce((sum, t) => sum + Number(t.amount), 0)

      const expenses = transactions
        .filter(t => t.category.type === 'EXPENSE')
        .reduce((sum, t) => sum + Number(t.amount), 0)

      return {
        transactions,
        summary: {
          income,
          expenses,
          net: income - expenses,
          transactionCount: transactions.length,
        }
      }
    }),

  create: protectedProcedure
    .input(transactionInput)
    .mutation(async ({ ctx, input }) => {
      const user = await ensureUserExists()

      // Verify category belongs to user
      const category = await ctx.db.category.findFirst({
        where: {
          id: input.categoryId,
          userId: user.id,
        }
      })

      if (!category) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Category not found'
        })
      }

      const transaction = await ctx.db.transaction.create({
        data: {
          ...input,
          userId: user.id,
        },
        include: {
          category: true,
        }
      })

      // Update budget if exists
      await updateBudgetSpending(ctx.db, category.id, input.date)

      return transaction
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      ...transactionInput.shape,
    }))
    .mutation(async ({ ctx, input }) => {
      const user = await ensureUserExists()
      const { id, ...data } = input

      // Verify transaction belongs to user
      const existingTransaction = await ctx.db.transaction.findFirst({
        where: { id, userId: user.id },
        include: { category: true }
      })

      if (!existingTransaction) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Transaction not found'
        })
      }

      // Verify new category belongs to user
      if (data.categoryId !== existingTransaction.categoryId) {
        const newCategory = await ctx.db.category.findFirst({
          where: {
            id: data.categoryId,
            userId: user.id,
          }
        })

        if (!newCategory) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Category not found'
          })
        }
      }

      const transaction = await ctx.db.transaction.update({
        where: { id },
        data,
        include: {
          category: true,
        }
      })

      // Update budgets
      if (existingTransaction) {
        await updateBudgetSpending(ctx.db, existingTransaction.categoryId, existingTransaction.date)
      }
      await updateBudgetSpending(ctx.db, transaction.categoryId, transaction.date)

      return transaction
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const user = await ensureUserExists()

      const transaction = await ctx.db.transaction.findFirst({
        where: { id: input.id, userId: user.id }
      })

      if (!transaction) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Transaction not found'
        })
      }

      await ctx.db.transaction.delete({
        where: { id: input.id }
      })

      // Update budget
      await updateBudgetSpending(ctx.db, transaction.categoryId, transaction.date)

      return { success: true }
    }),

  bulkDelete: protectedProcedure
    .input(z.object({
      ids: z.array(z.string()).min(1).max(100),
    }))
    .mutation(async ({ ctx, input }) => {
      const user = await ensureUserExists()

      // Verify all transactions belong to user
      const transactions = await ctx.db.transaction.findMany({
        where: {
          id: { in: input.ids },
          userId: user.id,
        }
      })

      if (transactions.length !== input.ids.length) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Some transactions not found or unauthorized'
        })
      }

      await ctx.db.transaction.deleteMany({
        where: {
          id: { in: input.ids }
        }
      })

      // Update budgets for affected categories
      const affectedCategories = [...new Set(transactions.map(t => t.categoryId))]
      for (const categoryId of affectedCategories) {
        const dates = transactions
          .filter(t => t.categoryId === categoryId)
          .map(t => t.date)

        for (const date of [...new Set(dates)]) {
          await updateBudgetSpending(ctx.db, categoryId, date)
        }
      }

      return { success: true, count: transactions.length }
    }),

  getStats: protectedProcedure
    .input(z.object({
      year: z.number().optional(),
      month: z.number().min(0).max(11).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const user = await ensureUserExists()

      const now = new Date()
      const year = input.year ?? now.getFullYear()
      const month = input.month ?? now.getMonth()

      const startDate = startOfMonth(new Date(year, month))
      const endDate = endOfMonth(new Date(year, month))

      // Get current month stats
      const currentMonthTransactions = await ctx.db.transaction.findMany({
        where: {
          userId: user.id,
          date: {
            gte: startDate,
            lte: endDate,
          }
        },
        include: {
          category: true,
        }
      })

      const currentIncome = currentMonthTransactions
        .filter(t => t.category.type === 'INCOME')
        .reduce((sum, t) => sum + Number(t.amount), 0)

      const currentExpenses = currentMonthTransactions
        .filter(t => t.category.type === 'EXPENSE')
        .reduce((sum, t) => sum + Number(t.amount), 0)

      // Get previous month stats for comparison
      const prevStartDate = startOfMonth(new Date(year, month - 1))
      const prevEndDate = endOfMonth(new Date(year, month - 1))

      const previousMonthTransactions = await ctx.db.transaction.findMany({
        where: {
          userId: user.id,
          date: {
            gte: prevStartDate,
            lte: prevEndDate,
          }
        },
        include: {
          category: true,
        }
      })

      const previousIncome = previousMonthTransactions
        .filter(t => t.category.type === 'INCOME')
        .reduce((sum, t) => sum + Number(t.amount), 0)

      const previousExpenses = previousMonthTransactions
        .filter(t => t.category.type === 'EXPENSE')
        .reduce((sum, t) => sum + Number(t.amount), 0)

      // Get category breakdown for current month
      const categoryBreakdown = currentMonthTransactions.reduce((acc, t) => {
        const categoryName = t.category.name
        acc[categoryName] ??= {
          total: 0,
          count: 0,
          type: t.category.type,
          color: t.category.color,
          icon: t.category.icon,
        }
        acc[categoryName].total += Number(t.amount)
        acc[categoryName].count += 1
        return acc
      }, {} as Record<string, { total: number, count: number, type: string, color: string, icon: string | null }>)

      return {
        currentMonth: {
          income: currentIncome,
          expenses: currentExpenses,
          net: currentIncome - currentExpenses,
          transactionCount: currentMonthTransactions.length,
        },
        previousMonth: {
          income: previousIncome,
          expenses: previousExpenses,
          net: previousIncome - previousExpenses,
          transactionCount: previousMonthTransactions.length,
        },
        comparison: {
          incomeChange: currentIncome - previousIncome,
          expensesChange: currentExpenses - previousExpenses,
          netChange: (currentIncome - currentExpenses) - (previousIncome - previousExpenses),
        },
        categoryBreakdown: Object.entries(categoryBreakdown).map(([name, data]) => ({
          name,
          ...data,
        })).sort((a, b) => b.total - a.total),
      }
    }),
})

// Helper function to update budget spending
async function updateBudgetSpending(
  db: PrismaClient,
  categoryId: string,
  date: Date
) {
  const startDate = startOfMonth(date)
  const endDate = endOfMonth(date)

  // Calculate total spending for this category this month
  const spent = await db.transaction.aggregate({
    where: {
      categoryId,
      date: {
        gte: startDate,
        lte: endDate,
      }
    },
    _sum: {
      amount: true,
    }
  })

  // Update budget if it exists
  await db.budget.updateMany({
    where: {
      categoryId,
      month: startDate,
    },
    data: {
      spent: spent._sum.amount ?? 0,
    }
  })
}