export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-5xl font-bold tracking-tight">Watch Dog</h1>
        <p className="max-w-md text-lg text-muted-foreground">
          Community safety platform for the Greater Toronto Area
        </p>
      </div>

      <div className="mt-8 rounded-lg border border-border bg-card px-6 py-4 text-card-foreground">
        <p className="text-sm text-muted-foreground">
          Phase 0 — Foundation complete. Map coming in Phase 1.
        </p>
      </div>
    </main>
  )
}
