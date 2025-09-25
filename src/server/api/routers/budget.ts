import { z } from "zod"
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc"
import { ensureUserExists } from "@/lib/db/utils"
import { startOfMonth, endOfMonth } from "date-fns"
import { TRPCError } from "@trpc/server"

export const budgetRouter = createTRPCRouter({
  getMonthly: protectedProcedure
    .input(z.object({
      month: z.date()
    }))
    .query(async ({ ctx, input }) => {
      const user = await ensureUserExists()
      const startDate = startOfMonth(input.month)

      const budgets = await ctx.db.budget.findMany({
        where: {
          userId: user.id,
          month: startDate
        },
        include: { category: true }
      })

      // Calculate current spending for each budget
      const budgetsWithSpending = await Promise.all(budgets.map(async (budget) => {
        const endDate = endOfMonth(startDate)

        const spending = await ctx.db.transaction.aggregate({
          where: {
            userId: user.id,
            categoryId: budget.categoryId,
            date: {
              gte: startDate,
              lte: endDate,
            }
          },
          _sum: {
            amount: true,
          }
        })

        return {
          ...budget,
          spent: Number(spending._sum.amount) || 0,
          remaining: Number(budget.limit) - (Number(spending._sum.amount) || 0),
          percentUsed: Number(budget.limit) > 0 ? ((Number(spending._sum.amount) || 0) / Number(budget.limit)) * 100 : 0,
        }
      }))

      return budgetsWithSpending
    }),

  create: protectedProcedure
    .input(z.object({
      categoryId: z.string(),
      limit: z.number().positive(),
      month: z.date(),
    }))
    .mutation(async ({ ctx, input }) => {
      const user = await ensureUserExists()
      const startDate = startOfMonth(input.month)

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

      // Check if budget already exists for this category and month
      const existingBudget = await ctx.db.budget.findFirst({
        where: {
          userId: user.id,
          categoryId: input.categoryId,
          month: startDate,
        }
      })

      if (existingBudget) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Budget already exists for this category and month'
        })
      }

      // Calculate current spending
      const endDate = endOfMonth(startDate)
      const spending = await ctx.db.transaction.aggregate({
        where: {
          userId: user.id,
          categoryId: input.categoryId,
          date: {
            gte: startDate,
            lte: endDate,
          }
        },
        _sum: {
          amount: true,
        }
      })

      return ctx.db.budget.create({
        data: {
          categoryId: input.categoryId,
          limit: input.limit,
          month: startDate,
          userId: user.id,
          spent: spending._sum.amount ?? 0,
        },
        include: {
          category: true,
        }
      })
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      limit: z.number().positive().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const user = await ensureUserExists()
      const { id, ...data } = input

      const budget = await ctx.db.budget.findFirst({
        where: { id, userId: user.id }
      })

      if (!budget) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Budget not found'
        })
      }

      return ctx.db.budget.update({
        where: { id },
        data,
        include: {
          category: true,
        }
      })
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const user = await ensureUserExists()

      const budget = await ctx.db.budget.findFirst({
        where: { id: input.id, userId: user.id }
      })

      if (!budget) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Budget not found'
        })
      }

      return ctx.db.budget.delete({
        where: { id: input.id }
      })
    }),

  copyFromPreviousMonth: protectedProcedure
    .input(z.object({
      targetMonth: z.date(),
    }))
    .mutation(async ({ ctx, input }) => {
      const user = await ensureUserExists()
      const targetStartDate = startOfMonth(input.targetMonth)
      const sourceStartDate = startOfMonth(new Date(targetStartDate.getFullYear(), targetStartDate.getMonth() - 1, 1))

      // Get budgets from previous month
      const previousBudgets = await ctx.db.budget.findMany({
        where: {
          userId: user.id,
          month: sourceStartDate,
        }
      })

      if (previousBudgets.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'No budgets found in previous month'
        })
      }

      // Check if budgets already exist for target month
      const existingBudgets = await ctx.db.budget.findMany({
        where: {
          userId: user.id,
          month: targetStartDate,
        }
      })

      if (existingBudgets.length > 0) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Budgets already exist for target month'
        })
      }

      // Create new budgets for target month
      const newBudgets = await ctx.db.budget.createMany({
        data: previousBudgets.map(budget => ({
          userId: user.id,
          categoryId: budget.categoryId,
          limit: budget.limit,
          month: targetStartDate,
          spent: 0,
        })),
      })

      return { count: newBudgets.count }
    }),
})