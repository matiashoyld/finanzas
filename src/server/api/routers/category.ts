import { z } from "zod"
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc"
import { ensureUserExists } from "@/lib/db/utils"

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
        orderBy: { name: 'asc' }
      })
    }),
})