import { z } from "zod"
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc"
import { ensureUserExists } from "@/lib/db/utils"

export const budgetRouter = createTRPCRouter({
  getMonthly: protectedProcedure
    .input(z.object({
      month: z.date()
    }))
    .query(async ({ ctx, input }) => {
      const user = await ensureUserExists()

      return ctx.db.budget.findMany({
        where: {
          userId: user.id,
          month: input.month
        },
        include: { category: true }
      })
    }),
})