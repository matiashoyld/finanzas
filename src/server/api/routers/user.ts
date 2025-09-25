import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc"
import { ensureUserExists } from "@/lib/db/utils"

export const userRouter = createTRPCRouter({
  getCurrent: protectedProcedure.query(async () => {
    const user = await ensureUserExists()
    return user
  }),
})