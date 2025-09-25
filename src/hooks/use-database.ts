import { useUser } from '@clerk/nextjs'
import { api } from '@/utils/api'

export function useCurrentUser() {
  const { user: clerkUser } = useUser()
  const { data: dbUser, isLoading } = api.user.getCurrent.useQuery(
    undefined,
    { enabled: !!clerkUser }
  )

  return { user: dbUser, isLoading }
}

export function useCategories(type?: 'INCOME' | 'EXPENSE') {
  const { data, isLoading, refetch } = api.category.getAll.useQuery({ type })
  return { categories: data ?? [], isLoading, refetch }
}

export function useMonthlyBudgets(month: Date) {
  const { data, isLoading } = api.budget.getMonthly.useQuery({ month })
  return { budgets: data ?? [], isLoading }
}