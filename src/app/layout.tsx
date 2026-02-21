import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/lib/providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Admin Dashboard - Laundry Marketplace',
  description: 'Admin dashboard for Laundry Marketplace Platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full">
      <body className={`${inter.className} min-h-full`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
