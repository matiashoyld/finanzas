import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc"
import { ensureUserExists } from "@/lib/db/utils"
import { z } from "zod"

export const userRouter = createTRPCRouter({
  getCurrent: protectedProcedure.query(async ({ ctx }) => {
    const user = await ensureUserExists()

    const userWithStats = await ctx.db.user.findUnique({
      where: { id: user.id },
      include: {
        categories: true,
        _count: {
          select: {
            transactions: true,
            budgets: true,
            savingsGoals: true,
          }
        }
      }
    })

    return userWithStats
  }),

  updateProfile: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(100),
    }))
    .mutation(async ({ ctx, input }) => {
      const user = await ensureUserExists()

      return ctx.db.user.update({
        where: { id: user.id },
        data: input,
      })
    }),
})