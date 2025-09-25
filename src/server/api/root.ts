import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc"
import { userRouter } from "@/server/api/routers/user"
import { categoryRouter } from "@/server/api/routers/category"
import { budgetRouter } from "@/server/api/routers/budget"
import { transactionRouter } from "@/server/api/routers/transaction"

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  user: userRouter,
  category: categoryRouter,
  budget: budgetRouter,
  transaction: transactionRouter,
})

// export type definition of API
export type AppRouter = typeof appRouter

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter)