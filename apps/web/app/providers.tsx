'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, useEffect, type ReactNode } from 'react'
import { useFilters } from '@/store/filters'

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, refetchOnWindowFocus: false },
        },
      }),
  )

  useEffect(() => {
    useFilters.persist.rehydrate()
  }, [])

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
