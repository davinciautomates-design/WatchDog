import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Watch Dog',
  description: 'Community safety platform for the Greater Toronto Area',
  keywords: ['safety', 'GTA', 'Toronto', 'emergency alerts', 'community'],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        {/*
         * ThemeProvider from next-themes manages dark/light/system theme switching.
         * attribute="class" adds/removes the .dark class on <html>.
         * suppressHydrationWarning above prevents a React warning when the
         * server-rendered class doesn't match the client's initial preference.
         */}
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
