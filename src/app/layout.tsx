import "@/styles/globals.css"
import { ClerkProvider } from '@clerk/nextjs'
import { GeistSans } from "geist/font/sans"
import { type Metadata } from "next"
import { TRPCReactProvider } from "@/trpc/react"

export const metadata: Metadata = {
  title: "Finanzas HZ",
  description: "Personal finance management app",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider>
      <html lang="es" className={`${GeistSans.variable}`}>
        <body>
          <TRPCReactProvider>{children}</TRPCReactProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}