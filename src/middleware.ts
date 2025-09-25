import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isProtectedRoute = createRouteMatcher(['/dashboard(.*)'])
const isAuthRoute = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)'])
const ALLOWED_EMAILS = ['matiashoyl@gmail.com', 'mzabalabarros@gmail.com']

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims } = await auth()

  // If accessing auth routes and already signed in, redirect to dashboard
  if (isAuthRoute(req) && userId) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // If accessing protected routes
  if (isProtectedRoute(req)) {
    // Must be signed in
    if (!userId) {
      const signInUrl = new URL('/sign-in', req.url)
      signInUrl.searchParams.set('redirect_url', req.url)
      return NextResponse.redirect(signInUrl)
    }

    // Check email whitelist
    const email = sessionClaims?.email as string
    if (email && !ALLOWED_EMAILS.includes(email)) {
      await auth.signOut()
      return NextResponse.redirect(new URL('/unauthorized', req.url))
    }
  }
})

export const config = {
  matcher: [
    '/((?!.+\\.[\\w]+$|_next).*)',
    '/',
    '/(api|trpc)(.*)'
  ],
}