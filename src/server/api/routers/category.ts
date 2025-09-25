import { z } from "zod"
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc"
import { ensureUserExists } from "@/lib/db/utils"
import { TRPCError } from "@trpc/server"
import { CategoryType } from "@prisma/client"

export const categoryRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(z.object({
      type: z.enum(['INCOME', 'EXPENSE']).optional()
    }).optional())
    .query(async ({ ctx, input }) => {
      const user = await ensureUserExists()

      return ctx.db.category.findMany({
        where: {
          userId: user.id,
          ...(input?.type && { type: input.type })
        },
        include: {
          _count: {
            select: { transactions: true }
          }
        },
        orderBy: { name: 'asc' }
      })
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(50),
      type: z.nativeEnum(CategoryType),
      color: z.string().regex(/^#[0-9A-F]{6}$/i),
      icon: z.string().optional(),
      budgetLimit: z.number().positive().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const user = await ensureUserExists()

      return ctx.db.category.create({
        data: {
          ...input,
          userId: user.id,
        }
      })
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1).max(50).optional(),
      color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
      icon: z.string().optional(),
      budgetLimit: z.number().positive().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const user = await ensureUserExists()
      const { id, ...data } = input

      const category = await ctx.db.category.findFirst({
        where: { id, userId: user.id }
      })

      if (!category) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Category not found'
        })
      }

      return ctx.db.category.update({
        where: { id },
        data,
      })
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const user = await ensureUserExists()

      const category = await ctx.db.category.findFirst({
        where: { id: input.id, userId: user.id }
      })

      if (!category) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Category not found'
        })
      }

      const count = await ctx.db.transaction.count({
        where: { categoryId: input.id }
      })

      if (count > 0) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Cannot delete category with existing transactions'
        })
      }

      return ctx.db.category.delete({
        where: { id: input.id }
      })
    }),
})